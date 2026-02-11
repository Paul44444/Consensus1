const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5173);

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_CONFIG = {
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  USDC: { mint: USDC_MINT, decimals: 6 },
};

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const toMinorUnits = (amount, decimals) => {
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }
  return Math.round(normalized * 10 ** decimals);
};

const fromMinorUnits = (amount, decimals) => {
  return Number(amount) / 10 ** decimals;
};

const fetchQuote = async ({ outputMint, amountInMinor, slippageBps }) => {
  const url = new URL("https://api.jup.ag/swap/v1/quote");
  url.searchParams.set("inputMint", USDC_MINT);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(amountInMinor));
  url.searchParams.set("slippageBps", String(slippageBps));
  url.searchParams.set("swapMode", "ExactIn");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "StableSweep/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jupiter quote failed (${response.status}): ${body.slice(0, 180)}`);
  }

  return response.json();
};

const buildQuotePayload = ({ quote, amountInMinor, outputSymbol, risk }) => {
  const routeLabels = (quote.routePlan || [])
    .map((step) => step.swapInfo && step.swapInfo.label)
    .filter(Boolean);

  const uniqueRouteLabels = [...new Set(routeLabels)];
  const primaryVenue = uniqueRouteLabels[0] || "Jupiter Aggregator";
  const nextBestCostEstimateUsd = Number(quote.priceImpactPct || 0) * 100;
  const confidence = risk >= 4 ? "Balanced" : "Conservative";

  return {
    provider: "Jupiter",
    inputSymbol: "USDC",
    outputSymbol,
    inAmount: fromMinorUnits(amountInMinor, 6),
    outAmount: fromMinorUnits(quote.outAmount, 6),
    slippageBps: Number(quote.slippageBps || 0),
    priceImpactPct: Number(quote.priceImpactPct || 0),
    route: uniqueRouteLabels,
    primaryVenue,
    confidence,
    estimatedCostUsd: nextBestCostEstimateUsd,
  };
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const serveStatic = (reqPath, res) => {
  const resolvedPath = reqPath === "/" ? "/index.html" : reqPath;
  const safePath = path
    .normalize(resolvedPath)
    .replace(/^\.\.(\/|\\|$)/, "")
    .replace(/^[/\\]+/, "");
  const absPath = path.join(process.cwd(), safePath);

  if (!absPath.startsWith(process.cwd())) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(absPath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      sendJson(res, 500, { error: "Failed to read file" });
      return;
    }

    const contentType = STATIC_TYPES[path.extname(absPath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
};

const handleQuote = async (url, res) => {
  const amount = Number(url.searchParams.get("amount"));
  const outputSymbol = (url.searchParams.get("output") || "USDT").toUpperCase();
  const risk = Number(url.searchParams.get("risk") || 3);

  if (!TOKEN_CONFIG[outputSymbol]) {
    sendJson(res, 400, { error: "Unsupported output token" });
    return;
  }

  if (outputSymbol === "USDC") {
    sendJson(res, 200, {
      provider: "Jupiter",
      inputSymbol: "USDC",
      outputSymbol: "USDC",
      inAmount: amount,
      outAmount: amount,
      slippageBps: 0,
      priceImpactPct: 0,
      route: ["No swap required"],
      primaryVenue: "Direct",
      confidence: "Conservative",
      estimatedCostUsd: 0,
    });
    return;
  }

  const amountInMinor = toMinorUnits(amount, 6);
  if (!amountInMinor) {
    sendJson(res, 400, { error: "Invalid amount" });
    return;
  }

  const slippageByRisk = { 1: 10, 2: 20, 3: 35, 4: 50, 5: 75 };
  const slippageBps = slippageByRisk[Math.max(1, Math.min(5, risk))] || 35;

  try {
    const quote = await fetchQuote({
      outputMint: TOKEN_CONFIG[outputSymbol].mint,
      amountInMinor,
      slippageBps,
    });

    const payload = buildQuotePayload({ quote, amountInMinor, outputSymbol, risk });
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 502, {
      error: "Quote provider unavailable",
      details: error.message,
    });
  }
};

const handleHealth = async (res) => {
  const testAmounts = [1000, 10000, 50000];
  const rows = [];

  for (const amount of testAmounts) {
    try {
      const quote = await fetchQuote({
        outputMint: TOKEN_CONFIG.USDT.mint,
        amountInMinor: toMinorUnits(amount, 6),
        slippageBps: 35,
      });

      rows.push({
        pair: "USDC/USDT",
        amount,
        outAmount: fromMinorUnits(quote.outAmount, 6),
        priceImpactPct: Number(quote.priceImpactPct || 0),
        venue: quote.routePlan && quote.routePlan[0] && quote.routePlan[0].swapInfo
          ? quote.routePlan[0].swapInfo.label
          : "Jupiter route",
      });
    } catch (error) {
      rows.push({
        pair: "USDC/USDT",
        amount,
        error: "Unavailable",
      });
    }
  }

  sendJson(res, 200, { provider: "Jupiter", rows });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/quote" && req.method === "GET") {
    await handleQuote(url, res);
    return;
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    await handleHealth(res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(url.pathname, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, HOST, () => {
  console.log(`StableSweep server running on http://${HOST}:${PORT}`);
});
