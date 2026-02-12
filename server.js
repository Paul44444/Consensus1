const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5173);
const JUP_API_KEY = process.env.JUP_API_KEY || "";
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_CONFIG = {
  USDT: { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
  USDC: { mint: USDC_MINT, decimals: 6 },
};
const FALLBACK_TOKENS = [
  { symbol: "USDC", mint: USDC_MINT, decimals: 6, name: "USD Coin" },
  { symbol: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, name: "Tether USD" },
  { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", decimals: 9, name: "Wrapped SOL" },
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6, name: "Jupiter" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa2Bf2D3QdPm", decimals: 5, name: "Bonk" },
];
const tokenCache = { expiresAt: 0, items: FALLBACK_TOKENS };

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const QUOTE_HISTORY_LIMIT = 60;
const quoteHistory = [];
const MARKET_SERIES_LIMIT = 2160;
const marketSeries = [];
const SERVER_START_TIME = new Date().toISOString();
const SERIES_SAMPLE_INTERVAL_MS = 5000;
const MARKET_HISTORY_CACHE_TTL_MS = 90000;
const MARKET_ASSETS = {
  SOL: { coingeckoId: "solana", symbol: "SOL" },
  BTC: { coingeckoId: "bitcoin", symbol: "BTC" },
  ETH: { coingeckoId: "ethereum", symbol: "ETH" },
};
const VENUE_CATALOG = {
  "GoonFi V2": { icon: "GF", description: "High-volatility concentrated AMM pools." },
  "SolFi V2": { icon: "SF", description: "Concentrated liquidity venue with active re-pricing." },
  "Manifest": { icon: "MF", description: "Orderbook-style routing venue with deep spot books." },
  "AlphaQ": { icon: "AQ", description: "Route aggregator venue with dynamic pool access." },
  "Orca": { icon: "OR", description: "Major Solana AMM with concentrated pool options." },
  "Raydium": { icon: "RY", description: "Large Solana AMM and liquidity infrastructure." },
  "Meteora": { icon: "MT", description: "Dynamic liquidity market maker style pools." },
  "Lifinity": { icon: "LF", description: "Proactive market-making AMM on Solana." },
  "Phoenix": { icon: "PX", description: "On-chain central limit orderbook venue." },
  "OpenBook": { icon: "OB", description: "Community orderbook liquidity venue." },
  "Invariant": { icon: "IV", description: "Concentrated liquidity engine for tighter ranges." },
  "Whirlpool": { icon: "WP", description: "Tick-based concentrated liquidity pools." },
  "Drift Spot": { icon: "DS", description: "Spot routing venue integrated with Solana trading." },
  "Marinade Swap": { icon: "MS", description: "Staking-linked swap venue for SOL flows." },
  "Jupiter RFQ": { icon: "JQ", description: "RFQ liquidity source for large-size execution." },
  "Helium DEX": { icon: "HX", description: "Niche venue with episodic token liquidity." },
  "Tensor Swap": { icon: "TS", description: "Alternative liquidity paths with event-driven depth." },
  "Zeta Spot": { icon: "ZS", description: "Derivatives-linked spot liquidity route." },
  "Parcl Swap": { icon: "PS", description: "Specialized route venue tied to synthetic markets." },
  "Kamino Spot": { icon: "KS", description: "Liquidity-aware venue linked to vault flows." },
};
const DEFAULT_LP_VENUES = Object.keys(VENUE_CATALOG);
const marketHistoryCache = new Map();

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

const isValidMint = (value) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || ""));

const loadTokenUniverse = async () => {
  if (tokenCache.items.length && tokenCache.expiresAt > Date.now()) {
    return tokenCache.items;
  }

  try {
    const response = await fetch("https://token.jup.ag/all", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "StableSweep/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`token list failed (${response.status})`);
    }
    const payload = await response.json();
    const tokens = (Array.isArray(payload) ? payload : [])
      .map((item) => ({
        symbol: item.symbol,
        mint: item.address,
        decimals: Number(item.decimals),
        name: item.name || item.symbol,
      }))
      .filter((item) => item.symbol && isValidMint(item.mint) && Number.isFinite(item.decimals))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
      .slice(0, 150);

    tokenCache.items = tokens.length ? tokens : FALLBACK_TOKENS;
    tokenCache.expiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
    return tokenCache.items;
  } catch (_) {
    tokenCache.items = FALLBACK_TOKENS;
    tokenCache.expiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
    return tokenCache.items;
  }
};

const fetchFromJupiter = async ({ baseUrl, outputMint, amountInMinor, slippageBps, withApiKey }) => {
  const url = new URL("/swap/v1/quote", baseUrl);
  url.searchParams.set("inputMint", USDC_MINT);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(amountInMinor));
  url.searchParams.set("slippageBps", String(slippageBps));
  url.searchParams.set("swapMode", "ExactIn");

  const headers = {
    "Accept": "application/json",
    "User-Agent": "StableSweep/1.0",
  };

  if (withApiKey && JUP_API_KEY) {
    headers["x-api-key"] = JUP_API_KEY;
  }

  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${baseUrl} (${response.status}): ${body.slice(0, 180)}`);
  }

  return response.json();
};

const fetchQuote = async ({ outputMint, amountInMinor, slippageBps }) => {
  const attempts = [
    { baseUrl: "https://lite-api.jup.ag", withApiKey: false },
    { baseUrl: "https://api.jup.ag", withApiKey: Boolean(JUP_API_KEY) },
    { baseUrl: "https://api.jup.ag", withApiKey: false },
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      return await fetchFromJupiter({ outputMint, amountInMinor, slippageBps, ...attempt });
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(`All quote attempts failed: ${errors.join(" | ")}`);
};

const pushHistory = (entry) => {
  quoteHistory.push(entry);
  if (quoteHistory.length > QUOTE_HISTORY_LIMIT) {
    quoteHistory.shift();
  }
};

const pushSeries = (entry) => {
  marketSeries.push(entry);
  if (marketSeries.length > MARKET_SERIES_LIMIT) {
    marketSeries.shift();
  }
};

const getTrend = (outputSymbol) => {
  const rows = quoteHistory.filter((row) => row.outputSymbol === outputSymbol && Number.isFinite(row.priceImpactPct));
  if (rows.length < 4) {
    return { direction: "flat", deltaPct: 0 };
  }

  const recent = rows.slice(-3);
  const previous = rows.slice(-6, -3);
  if (!previous.length) {
    return { direction: "flat", deltaPct: 0 };
  }

  const recentAvg = recent.reduce((sum, row) => sum + row.priceImpactPct, 0) / recent.length;
  const previousAvg = previous.reduce((sum, row) => sum + row.priceImpactPct, 0) / previous.length;
  const delta = recentAvg - previousAvg;
  const direction = delta < -0.0002 ? "improving" : delta > 0.0002 ? "worsening" : "flat";
  return { direction, deltaPct: delta };
};

const buildDecision = ({ priceImpactPct, slippageBps, hops, amount }) => {
  const score = Math.max(
    0,
    100 - priceImpactPct * 5000 - slippageBps * 0.15 - Math.max(0, hops - 1) * 6 - amount / 200000 * 8
  );

  if (score >= 75) {
    return { action: "Buy now", reason: "Low impact and controlled route complexity.", score: Math.round(score) };
  }
  if (score >= 55) {
    return { action: "Reduce size", reason: "Route is viable, but impact risk is rising for this amount.", score: Math.round(score) };
  }
  return { action: "Wait", reason: "Current impact and execution risk are too high.", score: Math.round(score) };
};

const buildQuotePayload = ({ quote, amountInMinor, outputSymbol, outputDecimals, risk }) => {
  const routeLabels = (quote.routePlan || [])
    .map((step) => step.swapInfo && step.swapInfo.label)
    .filter(Boolean);

  const uniqueRouteLabels = [...new Set(routeLabels)];
  const primaryVenue = uniqueRouteLabels[0] || "Jupiter Aggregator";
  const nextBestCostEstimateUsd = Number(quote.priceImpactPct || 0) * 100;
  const confidence = risk >= 4 ? "Balanced" : "Conservative";
  const hops = Math.max(1, uniqueRouteLabels.length);
  const inAmount = fromMinorUnits(amountInMinor, 6);
  const outAmount = fromMinorUnits(quote.outAmount, outputDecimals);
  const priceImpactPct = Number(quote.priceImpactPct || 0);
  const slippage = Number(quote.slippageBps || 0);
  const decision = buildDecision({ priceImpactPct, slippageBps: slippage, hops, amount: inAmount });
  const naiveOutAmount = outAmount * (1 - Math.min(0.02, priceImpactPct + 0.004));
  const estimatedSavings = Math.max(0, outAmount - naiveOutAmount);
  const outputPerInput = inAmount > 0 ? outAmount / inAmount : 0;

  return {
    provider: "Jupiter",
    inputSymbol: "USDC",
    outputSymbol,
    inAmount,
    outAmount,
    slippageBps: slippage,
    priceImpactPct,
    route: uniqueRouteLabels,
    primaryVenue,
    confidence,
    estimatedCostUsd: nextBestCostEstimateUsd,
    decision,
    estimatedSavings,
    outputPerInput,
    timestamp: new Date().toISOString(),
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
  const legacySymbol = (url.searchParams.get("output") || "USDT").toUpperCase();
  const outputMintParam = url.searchParams.get("outputMint");
  const outputSymbolParam = (url.searchParams.get("outputSymbol") || legacySymbol || "USDT").toUpperCase();
  const outputDecimalsParam = Number(url.searchParams.get("outputDecimals") || 6);
  const outputDecimals = Math.max(0, Math.min(12, Number.isFinite(outputDecimalsParam) ? outputDecimalsParam : 6));
  const outputMint = isValidMint(outputMintParam)
    ? outputMintParam
    : (TOKEN_CONFIG[outputSymbolParam] ? TOKEN_CONFIG[outputSymbolParam].mint : null);
  const outputSymbol = isValidMint(outputMintParam) ? outputSymbolParam : outputSymbolParam;
  const risk = Number(url.searchParams.get("risk") || 3);

  if (!outputMint) {
    sendJson(res, 400, { error: "Unsupported output token" });
    return;
  }

  if (outputMint === USDC_MINT || outputSymbol === "USDC") {
    const payload = {
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
      decision: { action: "Buy now", reason: "No swap is required for this pair.", score: 100 },
      estimatedSavings: 0,
      outputPerInput: 1,
      timestamp: new Date().toISOString(),
      trend: getTrend(outputSymbol),
    };
    pushHistory(payload);
    sendJson(res, 200, payload);
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
      outputMint,
      amountInMinor,
      slippageBps,
    });

    const payload = buildQuotePayload({
      quote,
      amountInMinor,
      outputSymbol,
      outputDecimals,
      risk,
    });
    payload.trend = getTrend(outputSymbol);
    pushHistory(payload);
    sendJson(res, 200, payload);
  } catch (error) {
    pushHistory({
      outputSymbol,
      error: true,
      timestamp: new Date().toISOString(),
      details: error.message,
    });
    sendJson(res, 502, {
      error: "Quote provider unavailable",
      details: error.message,
    });
  }
};

const handleTokens = async (res) => {
  const tokens = await loadTokenUniverse();
  sendJson(res, 200, {
    source: "Jupiter token list",
    items: tokens,
  });
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

  const failures = rows.filter((row) => row.error).length;
  const providerStatus = failures === 0 ? "live" : failures < rows.length ? "degraded" : "down";
  sendJson(res, 200, { provider: "Jupiter", providerStatus, rows });
};

const handleHistory = (res) => {
  const items = quoteHistory.slice(-12).reverse();
  sendJson(res, 200, { items });
};

const pollSeriesPoint = async () => {
  const amount = 10000;
  const amountInMinor = toMinorUnits(amount, 6);
  try {
    const quote = await fetchQuote({
      outputMint: TOKEN_CONFIG.USDT.mint,
      amountInMinor,
      slippageBps: 35,
    });
    const outAmount = fromMinorUnits(quote.outAmount, 6);
    const priceImpactPct = Number(quote.priceImpactPct || 0);
    const outputPerInput = amount > 0 ? outAmount / amount : 0;

    pushSeries({
      timestamp: new Date().toISOString(),
      amount,
      outAmount,
      priceImpactPct,
      outputPerInput,
    });
  } catch (error) {
    pushSeries({
      timestamp: new Date().toISOString(),
      amount,
      error: true,
    });
  }
};

const handleSeries = async (url, res) => {
  if (marketSeries.length < 2) {
    await pollSeriesPoint();
    await pollSeriesPoint();
  }

  const windowKey = (url.searchParams.get("window") || "all").toLowerCase();
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const windowMap = {
    "30m": 30 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "today": now - startOfDay.getTime(),
    "all": null,
  };

  const windowMs = Object.prototype.hasOwnProperty.call(windowMap, windowKey) ? windowMap[windowKey] : null;
  const filteredItems = windowMs === null
    ? marketSeries.slice()
    : marketSeries.filter((item) => {
        const ts = Date.parse(item.timestamp);
        return Number.isFinite(ts) && ts >= now - windowMs;
      });
  const requestedPoints = Number(url.searchParams.get("points") || 100);
  const points = Math.max(20, Math.min(300, Number.isFinite(requestedPoints) ? requestedPoints : 100));
  const slicedItems = filteredItems.slice(-points);

  sendJson(res, 200, {
    pair: "USDC/USDT",
    amount: 10000,
    sampleIntervalSec: SERIES_SAMPLE_INTERVAL_MS / 1000,
    availableFrom: SERVER_START_TIME,
    window: windowKey,
    points,
    items: slicedItems,
  });
};

const downsample = (items, maxPoints) => {
  if (items.length <= maxPoints) {
    return items;
  }
  const step = Math.ceil(items.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < items.length; i += step) {
    sampled.push(items[i]);
  }
  if (sampled[sampled.length - 1] !== items[items.length - 1]) {
    sampled.push(items[items.length - 1]);
  }
  return sampled.slice(-maxPoints);
};

const handleMarketHistory = async (url, res) => {
  const assetKey = (url.searchParams.get("asset") || "SOL").toUpperCase();
  const asset = MARKET_ASSETS[assetKey] || MARKET_ASSETS.SOL;
  const windowKey = (url.searchParams.get("window") || "6h").toLowerCase();
  const requestedPoints = Number(url.searchParams.get("points") || 100);
  const points = Math.max(20, Math.min(300, Number.isFinite(requestedPoints) ? requestedPoints : 100));
  const cacheKey = `${asset.symbol}|${windowKey}|${points}`;
  const cached = marketHistoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    sendJson(res, 200, cached.payload);
    return;
  }

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const windowMap = {
    "30m": 30 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "today": now - startOfDay.getTime(),
    "all": 7 * 24 * 60 * 60 * 1000,
  };
  const windowMs = Object.prototype.hasOwnProperty.call(windowMap, windowKey) ? windowMap[windowKey] : windowMap["6h"];
  const days = windowKey === "all" ? "7" : "1";

  try {
    const historyUrl = new URL(`https://api.coingecko.com/api/v3/coins/${asset.coingeckoId}/market_chart`);
    historyUrl.searchParams.set("vs_currency", "usd");
    historyUrl.searchParams.set("days", days);

    const response = await fetch(historyUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "StableSweep/1.0",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`market history failed (${response.status}): ${body.slice(0, 180)}`);
    }

    const payload = await response.json();
    const prices = Array.isArray(payload.prices) ? payload.prices : [];
    const filtered = prices
      .map((row) => ({ timestamp: new Date(row[0]).toISOString(), value: Number(row[1]) }))
      .filter((row) => Number.isFinite(row.value))
      .filter((row) => Date.parse(row.timestamp) >= now - windowMs);
    const sampled = downsample(filtered, points);

    const responsePayload = {
      source: "CoinGecko",
      pair: `${asset.symbol}/USD`,
      asset: asset.symbol,
      window: windowKey,
      points,
      items: sampled,
    };
    marketHistoryCache.set(cacheKey, {
      expiresAt: Date.now() + MARKET_HISTORY_CACHE_TTL_MS,
      payload: responsePayload,
    });
    sendJson(res, 200, responsePayload);
  } catch (error) {
    sendJson(res, 502, {
      error: "Market history unavailable",
      details: error.message,
    });
  }
};

const summarizeVenueUsage = (liveRows = []) => {
  const counts = new Map();
  for (const item of quoteHistory) {
    if (item.error || !Array.isArray(item.route)) {
      continue;
    }
    for (const label of item.route) {
      if (!label) {
        continue;
      }
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  for (const row of liveRows) {
    const weight = Math.max(1, Math.round((row.amount || 0) / 10000));
    for (const venue of row.venues || []) {
      counts.set(venue, (counts.get(venue) || 0) + weight);
    }
  }

  for (const venue of DEFAULT_LP_VENUES) {
    if (!counts.has(venue)) {
      counts.set(venue, 1);
    }
  }

  const rows = [...counts.entries()].map(([venue, count]) => ({ venue, count }));
  rows.sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return rows.map((row) => ({ ...row, share: row.count / total }));
};

const getBaselineImpactBps = () => {
  const rows = quoteHistory
    .filter((item) => !item.error && Number.isFinite(item.priceImpactPct))
    .slice(-12);
  if (!rows.length) {
    return 18;
  }
  const avg = rows.reduce((sum, item) => sum + item.priceImpactPct, 0) / rows.length;
  return Math.max(3, avg * 10000);
};

const probeRouteUsage = async (capital) => {
  const probes = [
    Math.max(1000, Math.round(capital * 0.1)),
    Math.max(2000, Math.round(capital * 0.35)),
    Math.max(5000, Math.round(capital * 0.8)),
  ];

  const rows = [];
  for (const amount of probes) {
    try {
      const quote = await fetchQuote({
        outputMint: TOKEN_CONFIG.USDT.mint,
        amountInMinor: toMinorUnits(amount, 6),
        slippageBps: 35,
      });
      const venues = (quote.routePlan || [])
        .map((step) => step.swapInfo && step.swapInfo.label)
        .filter(Boolean);
      rows.push({
        amount,
        venues: [...new Set(venues)],
        priceImpactBps: Number(quote.priceImpactPct || 0) * 10000,
      });
    } catch (_) {
      rows.push({ amount, venues: [], error: true });
    }
  }
  return rows;
};

const handleLpRecommendations = async (url, res) => {
  const capital = Number(url.searchParams.get("capital") || 25000);
  const risk = Number(url.searchParams.get("risk") || 3);
  const limit = Number(url.searchParams.get("limit") || 3);
  const normalizedLimit = Math.max(3, Math.min(20, Number.isFinite(limit) ? limit : 3));
  const normalizedRisk = Math.max(1, Math.min(5, Number.isFinite(risk) ? risk : 3));
  const normalizedCapital = Math.max(1000, Math.min(1000000, Number.isFinite(capital) ? capital : 25000));
  const liveProbes = await probeRouteUsage(normalizedCapital);
  const usage = summarizeVenueUsage(liveProbes).slice(0, normalizedLimit);
  const historicalImpact = getBaselineImpactBps();
  const probeImpacts = liveProbes.filter((row) => Number.isFinite(row.priceImpactBps)).map((row) => row.priceImpactBps);
  const probeImpact = probeImpacts.length
    ? probeImpacts.reduce((sum, value) => sum + value, 0) / probeImpacts.length
    : historicalImpact;
  const baselineImpactBps = (historicalImpact * 0.45) + (probeImpact * 0.55);
  const capitalFactor = Math.min(1, normalizedCapital / 100000);
  const riskBias = (normalizedRisk - 3) / 2;
  const concentrationPenalty = (0.28 * capitalFactor) - (0.1 * riskBias);
  const forecastBasePctPerHour = 0.002 + capitalFactor * 0.0018 + Math.max(0, riskBias) * 0.0012;

  const recommendations = usage.map((row, index) => {
    const targetShare = Math.max(0.12, row.share * (index === 0 ? 0.95 - concentrationPenalty : 0.8 + concentrationPenalty * 0.35));
    const allocation = Math.round(normalizedCapital * targetShare);
    const boost = Math.log10(Math.max(1000, allocation)) * (2.2 + capitalFactor * 1.5) + row.share * (16 + capitalFactor * 10);
    const reductionBps = Number(Math.max(1.2, Math.min(24, boost)).toFixed(2));
    const postImpactBps = Number(Math.max(1, baselineImpactBps - reductionBps).toFixed(2));
    const confidence = row.share > 0.28 ? "High" : row.share > 0.18 ? "Medium" : "Moderate";
    const ilRisk = baselineImpactBps > 20 ? "Medium/High" : "Medium";
    const aprRangeLow = Math.max(4, Math.round(6 + row.share * 28));
    const aprRangeHigh = aprRangeLow + 6;
    const concentrationScore = Math.min(100, Math.round(targetShare * 180 + Math.max(0, riskBias) * 12));
    const riskScore = Math.min(
      100,
      Math.round(45 + baselineImpactBps * 1.4 + concentrationScore * 0.22 + Math.max(0, riskBias) * 12)
    );
    const hourlyPctBase = Math.max(0.0004, forecastBasePctPerHour * (0.65 + row.share));
    const hourlyPctLow = hourlyPctBase * (0.65 - Math.min(0.2, Math.max(0, riskBias) * 0.1));
    const hourlyPctHigh = hourlyPctBase * (1.4 + Math.max(0, riskBias) * 0.22);
    const dailyPctLow = hourlyPctLow * 24;
    const dailyPctHigh = hourlyPctHigh * 24;
    const hourlyPnlUsdLow = allocation * hourlyPctLow;
    const hourlyPnlUsdHigh = allocation * hourlyPctHigh;

    return {
      venue: row.venue,
      icon: VENUE_CATALOG[row.venue] ? VENUE_CATALOG[row.venue].icon : row.venue.slice(0, 2).toUpperCase(),
      description: VENUE_CATALOG[row.venue]
        ? VENUE_CATALOG[row.venue].description
        : "Liquidity venue identified from routing telemetry.",
      suggestedAllocationUsdc: allocation,
      usageSharePct: Number((row.share * 100).toFixed(1)),
      expectedTraderImpactNowBps: Number(baselineImpactBps.toFixed(2)),
      expectedTraderImpactPostBps: postImpactBps,
      expectedImpactReductionBps: reductionBps,
      indicativeFeeAprRange: `${aprRangeLow}% - ${aprRangeHigh}%`,
      ilRisk,
      confidence,
      expectedHourlyPctRange: `${(hourlyPctLow * 100).toFixed(3)}% - ${(hourlyPctHigh * 100).toFixed(3)}%`,
      expectedDailyPctRange: `${(dailyPctLow * 100).toFixed(2)}% - ${(dailyPctHigh * 100).toFixed(2)}%`,
      expectedHourlyPnlUsdLow: Number(hourlyPnlUsdLow.toFixed(2)),
      expectedHourlyPnlUsdHigh: Number(hourlyPnlUsdHigh.toFixed(2)),
      concentrationScore,
      riskScore,
      action: `Allocate about ${Math.round(targetShare * 100)}% here, monitor impact drift every 15 minutes, and cap exposure if impact rises above ${(baselineImpactBps + 6).toFixed(1)} bps.`,
    };
  });

  const hourlyLowTotal = recommendations.reduce((sum, item) => sum + item.expectedHourlyPnlUsdLow, 0);
  const hourlyHighTotal = recommendations.reduce((sum, item) => sum + item.expectedHourlyPnlUsdHigh, 0);

  const summary = {
    model: "Route-aware LP Adviser (advisory)",
    note: "Non-custodial recommendations. No user funds are held by this app.",
    capitalAnalyzedUsdc: normalizedCapital,
    riskLevel: normalizedRisk,
    baselineImpactBps: Number(baselineImpactBps.toFixed(2)),
    liveProbeCount: liveProbes.filter((row) => !row.error).length,
    expectedHourlyPnlUsdLow: Number(hourlyLowTotal.toFixed(2)),
    expectedHourlyPnlUsdHigh: Number(hourlyHighTotal.toFixed(2)),
    estimatedAggregateReductionBps: Number(
      recommendations.reduce((sum, item) => sum + item.expectedImpactReductionBps, 0).toFixed(2)
    ),
  };

  sendJson(res, 200, {
    source: "Jupiter route telemetry + heuristic model",
    generatedAt: new Date().toISOString(),
    summary,
    recommendations,
  });
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
  
  if (url.pathname === "/api/history" && req.method === "GET") {
    handleHistory(res);
    return;
  }

  if (url.pathname === "/api/series" && req.method === "GET") {
    await handleSeries(url, res);
    return;
  }

  if (url.pathname === "/api/market-history" && req.method === "GET") {
    await handleMarketHistory(url, res);
    return;
  }

  if (url.pathname === "/api/tokens" && req.method === "GET") {
    await handleTokens(res);
    return;
  }

  if (url.pathname === "/api/lp-recommendations" && req.method === "GET") {
    await handleLpRecommendations(url, res);
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

pollSeriesPoint();
setInterval(pollSeriesPoint, SERIES_SAMPLE_INTERVAL_MS);
