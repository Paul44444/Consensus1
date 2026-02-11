const fallbackPools = [
  {
    name: "Jupiter Route A",
    depth: 820000,
    feeBps: 3,
    gas: 0.22,
    volatility: "Low",
  },
  {
    name: "Jupiter Route B",
    depth: 610000,
    feeBps: 2,
    gas: 0.18,
    volatility: "Low",
  },
  {
    name: "Jupiter Route C",
    depth: 380000,
    feeBps: 4,
    gas: 0.12,
    volatility: "Medium",
  },
];

const cards = document.getElementById("pool-cards");
const form = document.getElementById("route-form");
const result = document.getElementById("route-result");

const format = (value, decimals = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
  }).format(value);

const formatNumber = (value, decimals = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const formatPercent = (value) => `${(value * 100).toFixed(3)}%`;

const renderCards = (rows = []) => {
  const source = rows.length
    ? rows.map((row, i) => ({
        name: `${row.pair} @ ${row.venue || "Jupiter"}`,
        depth: row.outAmount ? row.outAmount : fallbackPools[i % fallbackPools.length].depth,
        feeBps: row.priceImpactPct ? Math.max(1, Math.round(row.priceImpactPct * 10000)) : 3,
        gas: 0.2,
        volatility: row.priceImpactPct && row.priceImpactPct > 0.01 ? "Medium" : "Low",
      }))
    : fallbackPools;

  cards.innerHTML = "";
  source.forEach((pool) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${pool.name}</h3>
      <div class="stat">${format(pool.depth)}</div>
      <div class="meta">Depth · Fee ${pool.feeBps} bps · Gas ${pool.gas} gwei</div>
      <div class="meta">Volatility: ${pool.volatility}</div>
    `;
    cards.appendChild(card);
  });
};

const loadHealth = async () => {
  try {
    const response = await fetch("/api/health", { method: "GET" });
    if (!response.ok) {
      throw new Error("health endpoint failed");
    }

    const data = await response.json();
    renderCards(data.rows || []);
  } catch (_) {
    renderCards();
  }
};

loadHealth();

const setResult = (title, body) => {
  result.innerHTML = `
    <div class="route-title">${title}</div>
    <div class="route-body">${body}</div>
  `;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  const amount = Number(document.getElementById("amount").value || 0);
  const target = document.getElementById("target").value;
  const risk = Number(document.getElementById("risk").value);

  if (!amount || amount < 100) {
    setResult("Best route", "Enter a valid amount greater than or equal to 100.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Fetching live quote...";

  try {
    const params = new URLSearchParams({
      amount: String(amount),
      output: target,
      risk: String(risk),
    });

    const response = await fetch(`/api/quote?${params.toString()}`, { method: "GET" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to fetch route");
    }

    const routePath = payload.route && payload.route.length ? payload.route.join(" -> ") : payload.primaryVenue;
    const body = [
      `Provider: <strong>${payload.provider}</strong>.`,
      `Route: <strong>${routePath}</strong>.`,
      `Expected output: <strong>${formatNumber(payload.outAmount, 4)} ${payload.outputSymbol}</strong>.`,
      `Price impact: <strong>${formatPercent(payload.priceImpactPct)}</strong>.`,
      `Risk mode: <strong>${payload.confidence}</strong>.`,
      `Estimated routing cost proxy: <strong>${format(payload.estimatedCostUsd, 2)}</strong>.`,
    ].join("<br />");

    setResult("Best live route", body);
  } catch (error) {
    setResult("Best live route", `Failed to fetch quote. ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Compute route";
  }
});
