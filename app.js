const pools = [
  {
    name: "PumpSwap USDC/USDT",
    depth: 820000,
    feeBps: 3,
    gas: 0.22,
    volatility: "Low",
  },
  {
    name: "NovaCurve USDC/DAI",
    depth: 610000,
    feeBps: 2,
    gas: 0.18,
    volatility: "Low",
  },
  {
    name: "StableForge USDC/EURC",
    depth: 380000,
    feeBps: 4,
    gas: 0.12,
    volatility: "Medium",
  },
  {
    name: "PulsePool USDC/USDT",
    depth: 470000,
    feeBps: 1,
    gas: 0.26,
    volatility: "Low",
  },
];

const cards = document.getElementById("pool-cards");

const format = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatBps = (value) => `${value} bps`;

const renderCards = () => {
  cards.innerHTML = "";
  pools.forEach((pool) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${pool.name}</h3>
      <div class="stat">${format(pool.depth)}</div>
      <div class="meta">Depth · Fee ${formatBps(pool.feeBps)} · Gas ${pool.gas} gwei</div>
      <div class="meta">Volatility: ${pool.volatility}</div>
    `;
    cards.appendChild(card);
  });
};

renderCards();

const form = document.getElementById("route-form");
const result = document.getElementById("route-result");

const simulateRoute = (amount, target, risk) => {
  const candidates = pools.map((pool) => {
    const liquidityPenalty = amount / pool.depth;
    const feeCost = amount * (pool.feeBps / 10000);
    const gasCost = pool.gas * 0.65;
    const riskPenalty = risk > 3 && pool.volatility === "Medium" ? 0.0009 * amount : 0;
    const totalCost = feeCost + amount * liquidityPenalty + gasCost + riskPenalty;
    return { pool, totalCost };
  });

  candidates.sort((a, b) => a.totalCost - b.totalCost);
  const best = candidates[0];
  const savings = candidates[1]
    ? candidates[1].totalCost - best.totalCost
    : best.totalCost * 0.05;

  return {
    pool: best.pool.name,
    totalCost: best.totalCost,
    savings,
    target,
    split: `${Math.round(70 + risk * 4)}% / ${Math.round(30 - risk * 4)}%`,
  };
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.getElementById("amount").value || 0);
  const target = document.getElementById("target").value;
  const risk = Number(document.getElementById("risk").value);

  if (!amount || amount < 100) {
    result.innerHTML = "<div class=\"route-title\">Best route</div><div class=\"route-body\">Enter a valid amount to simulate.</div>";
    return;
  }

  const route = simulateRoute(amount, target, risk);
  result.innerHTML = `
    <div class="route-title">Best route</div>
    <div class="route-body">
      Route via <strong>${route.pool}</strong> into ${route.target} with split ${route.split}.<br />
      Estimated total cost: <strong>${format(route.totalCost)}</strong>.<br />
      Savings vs next best: <strong>${format(route.savings)}</strong>.
    </div>
  `;
});
