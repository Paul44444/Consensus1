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
const targetSelect = document.getElementById("target");
const startRoutingButton = document.getElementById("start-routing");
const launchDemoButton = document.getElementById("launch-demo");
const viewMapButton = document.getElementById("view-map");
const openMainViewButton = document.getElementById("open-main-view");
const openHowViewButton = document.getElementById("open-how-view");
const runScenarioButton = document.getElementById("run-scenario");
const openChartButton = document.getElementById("open-chart");
const closeChartButton = document.getElementById("close-chart");
const refreshChartButton = document.getElementById("refresh-chart");
const openLpCoachButton = document.getElementById("open-lp-coach");
const closeLpCoachButton = document.getElementById("close-lp-coach");
const runLpAnalysisButton = document.getElementById("run-lp-analysis");
const lpCapitalInput = document.getElementById("lp-capital");
const lpRiskInput = document.getElementById("lp-risk");
const lpResults = document.getElementById("lp-results");
const lpSummary = document.getElementById("lp-summary");
const lpCoachView = document.getElementById("lp-coach");
const lpSource = document.getElementById("lp-source");
const lpProjectionChart = document.getElementById("lp-projection-chart");
const lpProjectionMeta = document.getElementById("lp-projection-meta");
const lpProjectionHoursInput = document.getElementById("lp-projection-hours");
const lpProjectionHoursValue = document.getElementById("lp-projection-hours-value");
const openStrategyLabButton = document.getElementById("open-strategy-lab");
const closeStrategyLabButton = document.getElementById("close-strategy-lab");
const loadStrategyDataButton = document.getElementById("load-strategy-data");
const analyzeStrategyButton = document.getElementById("analyze-strategy");
const strategyLabView = document.getElementById("strategy-lab");
const strategyCapitalInput = document.getElementById("strategy-capital");
const strategyRiskInput = document.getElementById("strategy-risk");
const strategyVenuePool = document.getElementById("strategy-venue-pool");
const strategyDropzone = document.getElementById("strategy-dropzone");
const strategySource = document.getElementById("strategy-source");
const strategySummary = document.getElementById("strategy-summary");
const strategyBacktestWindow = document.getElementById("strategy-backtest-window");
const strategyBacktestChart = document.getElementById("strategy-backtest-chart");
const strategyBacktestMeta = document.getElementById("strategy-backtest-meta");
const chartWindowSelect = document.getElementById("chart-window");
const chartAssetSelect = document.getElementById("chart-asset");
const chartMetricSelect = document.getElementById("chart-metric");
const chartPointsSelect = document.getElementById("chart-points");
const providerStatus = document.getElementById("provider-status");
const alertBanner = document.getElementById("alert-banner");
const historyList = document.getElementById("history-list");
const lastQuoteTime = document.getElementById("last-quote-time");
const chartView = document.getElementById("chart-view");
const marketChart = document.getElementById("market-chart");
const chartMeta = document.getElementById("chart-meta");
const mainView = document.getElementById("main-view");
const executionSource = document.getElementById("execution-source");
const chartSource = document.getElementById("chart-source");
const lpProjectionState = {
  historical: null,
  summary: null,
};
const strategyState = {
  venueMetrics: {},
  selected: {},
};
const strategyBacktestState = {
  marketByWindow: {},
};
const SVG_NS = "http://www.w3.org/2000/svg";
const CHART_VIEWBOX = {
  width: 800,
  height: 280,
};

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
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ensureChartTooltip = (svgEl) => {
  const panel = svgEl ? svgEl.closest(".chart-panel") : null;
  if (!panel) {
    return null;
  }
  let tooltip = panel.querySelector(".chart-hover-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-hover-tooltip hidden";
    panel.appendChild(tooltip);
  }
  return tooltip;
};

const clearChartHover = (svgEl) => {
  if (!svgEl) {
    return;
  }
  svgEl.onpointermove = null;
  svgEl.onpointerleave = null;
  const tooltip = ensureChartTooltip(svgEl);
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
};

const attachChartHover = ({ svgEl, points, yBounds, tooltipLines, markerColor = "#4be1c1" }) => {
  if (!svgEl || !Array.isArray(points) || points.length < 2) {
    clearChartHover(svgEl);
    return;
  }

  const tooltip = ensureChartTooltip(svgEl);
  if (!tooltip) {
    return;
  }

  const hoverLayer = document.createElementNS(SVG_NS, "g");
  hoverLayer.setAttribute("pointer-events", "none");
  hoverLayer.setAttribute("opacity", "0");

  const crosshair = document.createElementNS(SVG_NS, "line");
  crosshair.setAttribute("stroke", "rgba(148,163,184,0.55)");
  crosshair.setAttribute("stroke-width", "1.2");
  crosshair.setAttribute("stroke-dasharray", "4 4");
  crosshair.setAttribute("y1", String(yBounds.top));
  crosshair.setAttribute("y2", String(yBounds.bottom));

  const marker = document.createElementNS(SVG_NS, "circle");
  marker.setAttribute("r", "4");
  marker.setAttribute("fill", markerColor);
  marker.setAttribute("stroke", "#0b1220");
  marker.setAttribute("stroke-width", "1.2");

  hoverLayer.appendChild(crosshair);
  hoverLayer.appendChild(marker);
  svgEl.appendChild(hoverLayer);

  const nearestPoint = (targetX) => {
    let best = points[0];
    let bestDelta = Math.abs(points[0].x - targetX);
    for (let i = 1; i < points.length; i += 1) {
      const delta = Math.abs(points[i].x - targetX);
      if (delta < bestDelta) {
        best = points[i];
        bestDelta = delta;
      }
    }
    return best;
  };

  const hide = () => {
    hoverLayer.setAttribute("opacity", "0");
    tooltip.classList.add("hidden");
  };

  const show = (event) => {
    const svgRect = svgEl.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height) {
      hide();
      return;
    }

    const panel = svgEl.closest(".chart-panel");
    if (!panel) {
      hide();
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const localX = clamp((event.clientX - svgRect.left) / svgRect.width, 0, 1) * CHART_VIEWBOX.width;
    const point = nearestPoint(localX);
    const px = ((point.x / CHART_VIEWBOX.width) * svgRect.width) + (svgRect.left - panelRect.left);
    const py = ((point.y / CHART_VIEWBOX.height) * svgRect.height) + (svgRect.top - panelRect.top);

    crosshair.setAttribute("x1", String(point.x));
    crosshair.setAttribute("x2", String(point.x));
    marker.setAttribute("cx", String(point.x));
    marker.setAttribute("cy", String(point.y));
    hoverLayer.setAttribute("opacity", "1");

    const lines = (typeof tooltipLines === "function" ? tooltipLines(point) : [])
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join("");
    tooltip.innerHTML = lines || "<div>n/a</div>";
    tooltip.classList.remove("hidden");

    const left = clamp(px, 65, panel.clientWidth - 65);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(28, py)}px`;
  };

  svgEl.onpointermove = show;
  svgEl.onpointerleave = hide;
};

const setAlert = (message) => {
  if (!alertBanner) {
    return;
  }
  if (!message) {
    alertBanner.classList.add("hidden");
    alertBanner.textContent = "";
    return;
  }
  alertBanner.textContent = message;
  alertBanner.classList.remove("hidden");
};

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

const hydrateTargetOptions = (items) => {
  if (!targetSelect || !Array.isArray(items) || !items.length) {
    return;
  }

  const prioritized = ["USDT", "USDC", "SOL", "JUP", "BONK"];
  const top = [];
  const rest = [];
  for (const token of items) {
    if (prioritized.includes(token.symbol)) {
      top.push(token);
    } else {
      rest.push(token);
    }
  }
  top.sort((a, b) => prioritized.indexOf(a.symbol) - prioritized.indexOf(b.symbol));
  const list = [...top, ...rest.slice(0, 45)];

  targetSelect.innerHTML = list
    .map((token) => `<option value="${token.mint}" data-symbol="${token.symbol}" data-decimals="${token.decimals}">${token.symbol}</option>`)
    .join("");

  const usdtOption = [...targetSelect.options].find((opt) => opt.dataset.symbol === "USDT");
  if (usdtOption) {
    targetSelect.value = usdtOption.value;
  }
};

const loadTokens = async () => {
  try {
    const response = await fetch("/api/tokens", { method: "GET" });
    if (!response.ok) {
      throw new Error("token endpoint failed");
    }
    const data = await response.json();
    hydrateTargetOptions(data.items || []);
  } catch (_) {
    if (!targetSelect) {
      return;
    }
    // Keep static fallback options from HTML if token loading fails.
  }
};

const renderHistory = async () => {
  if (!historyList) {
    return;
  }

  try {
    const response = await fetch("/api/history", { method: "GET" });
    if (!response.ok) {
      throw new Error("history unavailable");
    }

    const data = await response.json();
    const items = (data.items || []).slice(0, 5);

    if (!items.length) {
      historyList.innerHTML = "";
      return;
    }

    historyList.innerHTML = items
      .map((item) => {
        const stamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "n/a";
        if (item.error) {
          return `<div class="history-item">${stamp} · quote failed</div>`;
        }
        const impact = Number.isFinite(item.priceImpactPct) ? formatPercent(item.priceImpactPct) : "n/a";
        return `<div class="history-item">${stamp} · ${item.outputSymbol} · impact ${impact} · ${item.decision ? item.decision.action : "n/a"}</div>`;
      })
      .join("");
  } catch (_) {
    historyList.innerHTML = "";
  }
};

const loadHealth = async (syncAlert = true) => {
  try {
    const response = await fetch("/api/health", { method: "GET" });
    if (!response.ok) {
      throw new Error("health endpoint failed");
    }

    const data = await response.json();
    renderCards(data.rows || []);
    if (providerStatus) {
      providerStatus.textContent = (data.providerStatus || "live").toUpperCase();
    }

    if (syncAlert) {
      if (data.providerStatus === "down") {
        setAlert("Provider is currently down. Suggestions may use fallback data.");
      } else if (data.providerStatus === "degraded") {
        setAlert("Provider is degraded. Some route checks may fail.");
      } else {
        setAlert("");
      }
    }
  } catch (_) {
    renderCards();
    if (providerStatus) {
      providerStatus.textContent = "DOWN";
    }
    if (syncAlert) {
      setAlert("Unable to reach live provider. Showing fallback view.");
    }
  }
};

const setActiveView = (view) => {
  const views = {
    main: mainView,
    chart: chartView,
    strategy: strategyLabView,
    lp: lpCoachView,
  };

  Object.entries(views).forEach(([key, el]) => {
    if (!el) {
      return;
    }
    if (key === view) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const focusRouteForm = () => {
  setActiveView("main");
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  const amountInput = document.getElementById("amount");
  if (amountInput) {
    amountInput.focus();
    amountInput.select();
  }
};

const scrollToMap = () => {
  setActiveView("main");
  const dashboard = document.getElementById("dashboard");
  if (dashboard) {
    dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const openChartView = async () => {
  setActiveView("chart");
  await renderChart();
};

const closeChartView = () => {
  setActiveView("main");
};

const openLpCoachView = async () => {
  setActiveView("lp");
  await renderLpRecommendations();
};

const closeLpCoachView = () => {
  setActiveView("main");
};

const openStrategyLabView = async () => {
  setActiveView("strategy");
  await loadStrategyVenueData();
};

const closeStrategyLabView = () => {
  setActiveView("main");
};

if (startRoutingButton) {
  startRoutingButton.addEventListener("click", focusRouteForm);
}

if (launchDemoButton) {
  launchDemoButton.addEventListener("click", focusRouteForm);
}

if (viewMapButton) {
  viewMapButton.addEventListener("click", scrollToMap);
}

if (runScenarioButton) {
  runScenarioButton.addEventListener("click", () => {
    document.getElementById("amount").value = "75000";
    if (targetSelect) {
      const usdtOption = [...targetSelect.options].find((opt) => opt.dataset.symbol === "USDT" || opt.value === "USDT");
      if (usdtOption) {
        targetSelect.value = usdtOption.value;
      }
    }
    document.getElementById("risk").value = "4";
    form.requestSubmit();
  });
}

if (openChartButton) {
  openChartButton.addEventListener("click", openChartView);
}

if (openMainViewButton) {
  openMainViewButton.addEventListener("click", () => setActiveView("main"));
}

if (openHowViewButton) {
  openHowViewButton.addEventListener("click", () => {
    setActiveView("main");
    const how = document.getElementById("how");
    if (how) {
      how.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (refreshChartButton) {
  refreshChartButton.addEventListener("click", renderChart);
}

if (chartWindowSelect) {
  chartWindowSelect.addEventListener("change", renderChart);
}

if (chartAssetSelect) {
  chartAssetSelect.addEventListener("change", renderChart);
}

if (chartMetricSelect) {
  chartMetricSelect.addEventListener("change", renderChart);
}

if (chartPointsSelect) {
  chartPointsSelect.addEventListener("change", renderChart);
}

if (closeChartButton) {
  closeChartButton.addEventListener("click", closeChartView);
}

if (openLpCoachButton) {
  openLpCoachButton.addEventListener("click", openLpCoachView);
}

if (closeLpCoachButton) {
  closeLpCoachButton.addEventListener("click", closeLpCoachView);
}

if (runLpAnalysisButton) {
  runLpAnalysisButton.addEventListener("click", renderLpRecommendations);
}

if (openStrategyLabButton) {
  openStrategyLabButton.addEventListener("click", openStrategyLabView);
}

if (closeStrategyLabButton) {
  closeStrategyLabButton.addEventListener("click", closeStrategyLabView);
}

if (loadStrategyDataButton) {
  loadStrategyDataButton.addEventListener("click", loadStrategyVenueData);
}

if (analyzeStrategyButton) {
  analyzeStrategyButton.addEventListener("click", analyzeStrategy);
}

if (strategyBacktestWindow) {
  strategyBacktestWindow.addEventListener("change", analyzeStrategy);
}

if (lpProjectionHoursInput) {
  lpProjectionHoursInput.addEventListener("input", () => {
    if (lpProjectionHoursValue) {
      lpProjectionHoursValue.textContent = `${lpProjectionHoursInput.value}h`;
    }
    renderLpProjectionFromState();
  });
}

function renderPolyline(points, minY, maxY, getValue, tickFormatter) {
  const width = CHART_VIEWBOX.width;
  const height = CHART_VIEWBOX.height;
  const leftPad = 40;
  const rightPad = 20;
  const topPad = 20;
  const bottomPad = 28;
  const innerWidth = width - leftPad - rightPad;
  const innerHeight = height - topPad - bottomPad;

  const normalizeX = (index, count) => {
    if (count <= 1) {
      return leftPad;
    }
    return leftPad + (index / (count - 1)) * innerWidth;
  };

  const normalizeY = (value) => {
    if (maxY === minY) {
      return topPad + innerHeight / 2;
    }
    return topPad + ((maxY - value) / (maxY - minY)) * innerHeight;
  };

  const chartPoints = points.map((point, index) => {
    const value = getValue(point);
    return {
      x: normalizeX(index, points.length),
      y: normalizeY(value),
      timestamp: point.timestamp,
      value,
      rawValue: Number(point.value),
    };
  });
  const path = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  const yTicks = [minY, (minY + maxY) / 2, maxY];
  const grid = yTicks
    .map((value) => {
      const y = normalizeY(value);
      return `<line x1="${leftPad}" y1="${y}" x2="${width - rightPad}" y2="${y}" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
      <text x="6" y="${y + 4}" fill="#94a3b8" font-size="11">${tickFormatter(value)}</text>`;
    })
    .join("");

  const dots = chartPoints
    .map((point) => {
      return `<circle cx="${point.x}" cy="${point.y}" r="2.8" fill="#4be1c1" />`;
    })
    .join("");

  const startLabel = points[0] && points[0].timestamp ? new Date(points[0].timestamp).toLocaleTimeString() : "n/a";
  const midPoint = points[Math.floor(points.length / 2)];
  const midLabel = midPoint && midPoint.timestamp ? new Date(midPoint.timestamp).toLocaleTimeString() : "n/a";
  const endLabel = points[points.length - 1] && points[points.length - 1].timestamp
    ? new Date(points[points.length - 1].timestamp).toLocaleTimeString()
    : "n/a";

  const xLabels = `
    <text x="${leftPad}" y="${height - 8}" fill="#94a3b8" font-size="11">${startLabel}</text>
    <text x="${leftPad + innerWidth / 2 - 30}" y="${height - 8}" fill="#94a3b8" font-size="11">${midLabel}</text>
    <text x="${width - rightPad - 70}" y="${height - 8}" fill="#94a3b8" font-size="11">${endLabel}</text>
  `;

  const svg = `
    ${grid}
    <line x1="${leftPad}" y1="${height - bottomPad}" x2="${width - rightPad}" y2="${height - bottomPad}" stroke="rgba(148,163,184,0.35)" stroke-width="1.2" />
    <polyline fill="none" stroke="#4be1c1" stroke-width="2.5" points="${path}" />
    ${dots}
    ${xLabels}
  `;
  return {
    svg,
    hoverPoints: chartPoints,
    yBounds: {
      top: topPad,
      bottom: height - bottomPad,
    },
  };
}

async function renderChart() {
  if (!marketChart || !chartMeta) {
    return;
  }

  clearChartHover(marketChart);
  chartMeta.textContent = "Loading series...";

  try {
    const selectedWindow = chartWindowSelect ? chartWindowSelect.value : "all";
    const selectedAsset = chartAssetSelect ? chartAssetSelect.value : "SOL";
    const selectedMetric = chartMetricSelect ? chartMetricSelect.value : "index";
    const selectedPoints = chartPointsSelect ? chartPointsSelect.value : "100";
    const marketResponse = await fetch(
      `/api/market-history?asset=${encodeURIComponent(selectedAsset)}&window=${encodeURIComponent(selectedWindow)}&points=${encodeURIComponent(selectedPoints)}`,
      { method: "GET" }
    );
    if (!marketResponse.ok) {
      const marketError = await marketResponse.json().catch(() => ({}));
      const detail = marketError.details || marketError.error || "unknown error";
      throw new Error(detail);
    }
    const data = await marketResponse.json();
    const points = (data.items || []).filter((item) => Number.isFinite(item.value));

    if (points.length < 2) {
      clearChartHover(marketChart);
      marketChart.innerHTML = "";
      chartMeta.textContent = "Not enough points yet for this window. Try All collected or wait for more samples.";
      return;
    }

    const metric = selectedMetric === "price"
      ? {
          label: "Price (USD)",
          getValue: (point) => point.value,
          tick: (value) => value.toFixed(value >= 100 ? 2 : 4),
        }
      : {
          label: "Indexed price (base=100)",
          getValue: (point) => (point.value / points[0].value) * 100,
          tick: (value) => value.toFixed(2),
        };

    const values = points.map((p) => metric.getValue(p));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.01, (max - min) * 0.15);
    const minY = min - pad;
    const maxY = max + pad;

    const polyline = renderPolyline(points, minY, maxY, metric.getValue, metric.tick);
    marketChart.innerHTML = polyline.svg;
    attachChartHover({
      svgEl: marketChart,
      points: polyline.hoverPoints,
      yBounds: polyline.yBounds,
      markerColor: "#4be1c1",
      tooltipLines: (point) => {
        const time = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : "n/a";
        const priceText = Number.isFinite(point.rawValue) ? point.rawValue.toFixed(point.rawValue >= 100 ? 2 : 4) : "n/a";
        const metricText = Number.isFinite(point.value) ? point.value.toFixed(selectedMetric === "price" ? (point.value >= 100 ? 2 : 4) : 3) : "n/a";
        return selectedMetric === "price"
          ? [`${selectedAsset}/USD: ${metricText}`, `Time: ${time}`]
          : [`Indexed: ${metricText}`, `${selectedAsset}/USD: ${priceText}`, `Time: ${time}`];
      },
    });

    const first = metric.getValue(points[0]);
    const last = metric.getValue(points[points.length - 1]);
    const delta = last - first;
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const fromText = points[0] && points[0].timestamp ? new Date(points[0].timestamp).toLocaleTimeString() : "n/a";
    const toText = points[points.length - 1] && points[points.length - 1].timestamp
      ? new Date(points[points.length - 1].timestamp).toLocaleTimeString()
      : "n/a";
    const sourceLabel = data.source || "CoinGecko";
    if (chartSource) {
      chartSource.textContent = sourceLabel;
    }
    chartMeta.textContent = `${metric.label}. Pair ${data.pair || `${selectedAsset}/USD`}. ${points.length} points in ${data.window || selectedWindow}. Trend: ${direction} (${delta.toFixed(4)}). Visible range: ${fromText} to ${toText}. Source: ${sourceLabel}.`;
  } catch (error) {
    clearChartHover(marketChart);
    marketChart.innerHTML = "";
    chartMeta.textContent = `Chart unavailable: ${error.message}`;
  }
}

async function renderLpRecommendations() {
  if (!lpResults || !lpSummary) {
    return;
  }

  const capital = lpCapitalInput ? Number(lpCapitalInput.value || 25000) : 25000;
  const risk = lpRiskInput ? Number(lpRiskInput.value || 3) : 3;
  lpSummary.textContent = "Analyzing route telemetry...";
  lpResults.innerHTML = "";

  try {
    const response = await fetch(
      `/api/lp-recommendations?capital=${encodeURIComponent(String(capital))}&risk=${encodeURIComponent(String(risk))}`,
      {
      method: "GET",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details || data.error || "LP recommendation failed");
    }

    if (lpSource) {
      lpSource.textContent = data.source || "Jupiter route telemetry + heuristic model";
    }

    const summary = data.summary || {};
    lpSummary.textContent =
      `${summary.model || "LP Adviser"} · Capital analyzed ${format(summary.capitalAnalyzedUsdc || capital)} · ` +
      `Risk level ${summary.riskLevel || risk}/5 · ` +
      `Baseline impact ${formatNumber(summary.baselineImpactBps || 0, 2)} bps · ` +
      `Estimated aggregate reduction ${formatNumber(summary.estimatedAggregateReductionBps || 0, 2)} bps · ` +
      `Expected hourly PnL ${formatNumber(summary.expectedHourlyPnlUsdLow || 0, 2)} to ${formatNumber(summary.expectedHourlyPnlUsdHigh || 0, 2)} USD · ` +
      `${summary.liveProbeCount || 0} live probes. ` +
      `${summary.note || ""}`;

    const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    lpResults.innerHTML = recommendations
      .map(
        (item) => `
          <div class="card">
            <h3>${item.venue}</h3>
            <div class="stat">${format(item.suggestedAllocationUsdc || 0)}</div>
            <div class="meta">Suggested allocation · ${item.usageSharePct || 0}% route share</div>
            <div class="meta">Impact: ${formatNumber(item.expectedTraderImpactNowBps || 0, 2)} bps -> ${formatNumber(item.expectedTraderImpactPostBps || 0, 2)} bps (-${formatNumber(item.expectedImpactReductionBps || 0, 2)} bps)</div>
            <div class="meta">Indicative fee APR: ${item.indicativeFeeAprRange || "n/a"} · IL risk: ${item.ilRisk || "n/a"} · Confidence: ${item.confidence || "n/a"}</div>
            <div class="meta">Forecast: ${item.expectedHourlyPctRange || "n/a"} hourly · ${item.expectedDailyPctRange || "n/a"} daily · Expected ${formatNumber(item.expectedHourlyPnlUsdLow || 0, 2)} to ${formatNumber(item.expectedHourlyPnlUsdHigh || 0, 2)} USD per hour</div>
            <div class="meta">Risk score: ${item.riskScore || "n/a"} / 100 · Concentration score: ${item.concentrationScore || "n/a"} / 100</div>
            <div class="meta">${item.action || ""}</div>
          </div>
        `
      )
      .join("");

    await renderLpProjectionChartFromSummary(summary);
  } catch (error) {
    lpSummary.textContent = `LP analysis unavailable: ${error.message}`;
    if (lpProjectionMeta) {
      lpProjectionMeta.textContent = "Projection unavailable due to LP analysis error.";
    }
    if (lpProjectionChart) {
      clearChartHover(lpProjectionChart);
      lpProjectionChart.innerHTML = "";
    }
  }
}

const renderProjectionPolyline = ({ historical, projectedLow, projectedHigh }) => {
  const width = CHART_VIEWBOX.width;
  const height = CHART_VIEWBOX.height;
  const leftPad = 40;
  const rightPad = 20;
  const topPad = 20;
  const bottomPad = 28;
  const innerWidth = width - leftPad - rightPad;
  const innerHeight = height - topPad - bottomPad;

  const timelineLength = historical.length + projectedLow.length;
  const values = [...historical, ...projectedLow, ...projectedHigh].map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.2, (max - min) * 0.15);
  const minY = min - pad;
  const maxY = max + pad;

  const normalizeX = (index) => {
    if (timelineLength <= 1) {
      return leftPad;
    }
    return leftPad + (index / (timelineLength - 1)) * innerWidth;
  };
  const normalizeY = (value) => {
    if (maxY === minY) {
      return topPad + innerHeight / 2;
    }
    return topPad + ((maxY - value) / (maxY - minY)) * innerHeight;
  };

  const historicalCoords = historical.map((p, i) => ({
    x: normalizeX(i),
    y: normalizeY(p.value),
    point: p,
    mode: "historical",
  }));
  const projectedLowCoords = projectedLow.map((p, i) => ({
    x: normalizeX(i + historical.length),
    y: normalizeY(p.value),
    point: p,
  }));
  const projectedHighCoords = projectedHigh.map((p, i) => ({
    x: normalizeX(i + historical.length),
    y: normalizeY(p.value),
    point: p,
  }));

  const historicalPath = historicalCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const projectedLowPath = projectedLowCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const projectedHighPath = projectedHighCoords.map((p) => `${p.x},${p.y}`).join(" ");

  const bandTop = projectedHighCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const bandBottom = projectedLowCoords
    .slice()
    .reverse()
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const band = `${bandTop} ${bandBottom}`;
  const yTicks = [minY, (minY + maxY) / 2, maxY];
  const grid = yTicks
    .map((value) => {
      const y = normalizeY(value);
      return `<line x1="${leftPad}" y1="${y}" x2="${width - rightPad}" y2="${y}" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
      <text x="6" y="${y + 4}" fill="#94a3b8" font-size="11">${value.toFixed(2)}</text>`;
    })
    .join("");

  const startLabel = historical[0] ? new Date(historical[0].timestamp).toLocaleTimeString() : "n/a";
  const splitLabel = historical[historical.length - 1]
    ? new Date(historical[historical.length - 1].timestamp).toLocaleTimeString()
    : "n/a";
  const endLabel = projectedLow[projectedLow.length - 1]
    ? new Date(projectedLow[projectedLow.length - 1].timestamp).toLocaleTimeString()
    : "n/a";

  const splitX = normalizeX(historical.length - 1);

  const svg = `
    ${grid}
    <line x1="${leftPad}" y1="${height - bottomPad}" x2="${width - rightPad}" y2="${height - bottomPad}" stroke="rgba(148,163,184,0.35)" stroke-width="1.2" />
    <line x1="${splitX}" y1="${topPad}" x2="${splitX}" y2="${height - bottomPad}" stroke="rgba(247,184,1,0.5)" stroke-width="1.2" stroke-dasharray="4 4" />
    <polygon points="${band}" fill="rgba(247,184,1,0.18)" />
    <polyline fill="none" stroke="#4be1c1" stroke-width="2.6" points="${historicalPath}" />
    <polyline fill="none" stroke="#f7b801" stroke-width="2.3" stroke-dasharray="6 4" points="${projectedLowPath}" />
    <polyline fill="none" stroke="#9ef01a" stroke-width="2.3" stroke-dasharray="6 4" points="${projectedHighPath}" />
    <text x="${leftPad}" y="${height - 8}" fill="#94a3b8" font-size="11">${startLabel}</text>
    <text x="${splitX - 28}" y="${height - 8}" fill="#f7b801" font-size="11">${splitLabel}</text>
    <text x="${width - rightPad - 70}" y="${height - 8}" fill="#94a3b8" font-size="11">${endLabel}</text>
  `;
  const hoverPoints = [
    ...historicalCoords.map((p) => ({
      x: p.x,
      y: p.y,
      timestamp: p.point.timestamp,
      value: p.point.value,
      mode: "historical",
    })),
    ...projectedLowCoords.map((lowPoint, index) => {
      const highPoint = projectedHighCoords[index];
      const lowVal = lowPoint.point.value;
      const highVal = highPoint ? highPoint.point.value : lowVal;
      const mid = (lowVal + highVal) / 2;
      return {
        x: lowPoint.x,
        y: normalizeY(mid),
        timestamp: lowPoint.point.timestamp,
        value: mid,
        lowValue: lowVal,
        highValue: highVal,
        mode: "projection",
      };
    }),
  ];
  return {
    svg,
    hoverPoints,
    yBounds: {
      top: topPad,
      bottom: height - bottomPad,
    },
  };
};

async function renderLpProjectionChartFromSummary(summary) {
  if (lpProjectionHoursValue && lpProjectionHoursInput) {
    lpProjectionHoursValue.textContent = `${lpProjectionHoursInput.value}h`;
  }

  await prepareLpProjectionState(summary);
  renderLpProjectionFromState();
}

async function prepareLpProjectionState(summary) {
  if (!lpProjectionChart || !lpProjectionMeta) {
    return;
  }
  lpProjectionMeta.textContent = "Loading historical context and projection...";

  try {
    const response = await fetch("/api/market-history?asset=SOL&window=6h&points=80", { method: "GET" });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || "market history unavailable");
    }
    const data = await response.json();
    const hist = (data.items || []).filter((p) => Number.isFinite(p.value));
    if (hist.length < 10) {
      throw new Error("not enough historical points");
    }

    const base = hist[0].value;
    const historical = hist.map((p) => ({
      timestamp: p.timestamp,
      value: (p.value / base) * 100,
    }));
    lpProjectionState.historical = historical;
    lpProjectionState.summary = summary;
  } catch (error) {
    lpProjectionState.historical = null;
    lpProjectionState.summary = null;
    clearChartHover(lpProjectionChart);
    lpProjectionChart.innerHTML = "";
    lpProjectionMeta.textContent = `Projection unavailable: ${error.message}`;
  }
}

function renderLpProjectionFromState() {
  if (!lpProjectionChart || !lpProjectionMeta) {
    return;
  }
  if (!lpProjectionState.historical || !lpProjectionState.summary) {
    return;
  }

  clearChartHover(lpProjectionChart);
  const historical = lpProjectionState.historical;
  const summary = lpProjectionState.summary;
  const horizonHours = lpProjectionHoursInput ? Number(lpProjectionHoursInput.value || 12) : 12;
  const clampedHorizon = Math.max(1, Math.min(24, Number.isFinite(horizonHours) ? horizonHours : 12));
  const capital = Number(summary.capitalAnalyzedUsdc || 25000);
  const lowHourly = capital > 0 ? Number(summary.expectedHourlyPnlUsdLow || 0) / capital : 0.0005;
  const highHourly = capital > 0 ? Number(summary.expectedHourlyPnlUsdHigh || 0) / capital : 0.0015;
  const now = Date.now();
  const lastValue = historical[historical.length - 1].value;
  const projectedLow = [];
  const projectedHigh = [];
  let lowVal = lastValue;
  let highVal = lastValue;
  for (let i = 1; i <= clampedHorizon; i += 1) {
    lowVal *= 1 + lowHourly;
    highVal *= 1 + highHourly;
    const ts = new Date(now + i * 60 * 60 * 1000).toISOString();
    projectedLow.push({ timestamp: ts, value: lowVal });
    projectedHigh.push({ timestamp: ts, value: highVal });
  }

  const projection = renderProjectionPolyline({ historical, projectedLow, projectedHigh });
  lpProjectionChart.innerHTML = projection.svg;
  attachChartHover({
    svgEl: lpProjectionChart,
    points: projection.hoverPoints,
    yBounds: projection.yBounds,
    markerColor: "#f7b801",
    tooltipLines: (point) => {
      const time = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : "n/a";
      if (point.mode === "projection") {
        return [
          `Projection midpoint: ${point.value.toFixed(3)}`,
          `Range: ${point.lowValue.toFixed(3)} to ${point.highValue.toFixed(3)}`,
          `Time: ${time}`,
        ];
      }
      return [`Historical index: ${point.value.toFixed(3)}`, `Time: ${time}`];
    },
  });
  lpProjectionMeta.textContent =
      `Historical: SOL/USD (CoinGecko, last 6h). Projection: LP Adviser hourly range from ${(
        lowHourly * 100
      ).toFixed(3)}% to ${(highHourly * 100).toFixed(3)}% for next ${clampedHorizon}h. Advisory only, not guaranteed.`;
}

const parsePctRange = (text) => {
  const parts = String(text || "")
    .replace(/%/g, "")
    .split("-")
    .map((v) => Number(v.trim()) / 100)
    .filter((v) => Number.isFinite(v));
  if (parts.length < 2) {
    return { low: 0.0005, high: 0.0015 };
  }
  return { low: Math.max(0, parts[0]), high: Math.max(parts[0], parts[1]) };
};

const venueHashUnit = (name) => {
  let hash = 0;
  const text = String(name || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
};

const renderStrategyPool = () => {
  if (!strategyVenuePool) {
    return;
  }
  const venues = Object.keys(strategyState.venueMetrics);
  if (!venues.length) {
    strategyVenuePool.innerHTML = "<div class=\"meta\">Load venue data first.</div>";
    return;
  }
  strategyVenuePool.innerHTML = venues
    .map(
      (venue) => {
        const metric = strategyState.venueMetrics[venue] || {};
        const icon = metric.icon || venue.slice(0, 2).toUpperCase();
        const description = metric.description || "Liquidity venue sourced from routing telemetry.";
        return `<div class="strategy-venue" draggable="true" data-venue="${venue}">
          <span class="strategy-logo">${icon}</span>
          <span class="strategy-name">${venue}</span>
          <span class="strategy-tooltip">${description}</span>
        </div>`;
      }
    )
    .join("");

  strategyVenuePool.querySelectorAll(".strategy-venue").forEach((el) => {
    el.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", event.currentTarget.dataset.venue || "");
    });
  });
};

const renderStrategyDropzone = () => {
  if (!strategyDropzone) {
    return;
  }
  const entries = Object.entries(strategyState.selected);
  if (!entries.length) {
    strategyDropzone.innerHTML = "Drop venues here";
    return;
  }
  strategyDropzone.innerHTML = entries
    .map(
      ([venue, allocationAmount]) => {
        const totalAmount = entries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
        const autoPct = totalAmount > 0 ? (Number(allocationAmount || 0) / totalAmount) * 100 : 0;
        return `
      <div class="strategy-item" data-venue="${venue}">
        <div>${venue}</div>
        <input type="number" min="1" step="100" value="${Math.round(Number(allocationAmount || 0))}" data-allocation-for="${venue}" />
        <div class="strategy-auto-pct" data-pct-for="${venue}">${autoPct.toFixed(1)}%</div>
        <button class="strategy-remove" data-remove="${venue}" type="button">Remove</button>
      </div>
    `;
      }
    )
    .join("");

  strategyDropzone.querySelectorAll("input[data-allocation-for]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const venue = event.target.dataset.allocationFor;
      const value = Number(event.target.value || 0);
      strategyState.selected[venue] = Math.max(1, Number.isFinite(value) ? value : 1);
      updateStrategyAutoPercentages();
      analyzeStrategy();
    });
  });

  strategyDropzone.querySelectorAll("button[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const venue = event.target.dataset.remove;
      delete strategyState.selected[venue];
      renderStrategyDropzone();
      analyzeStrategy();
    });
  });
};

const updateStrategyAutoPercentages = () => {
  if (!strategyDropzone) {
    return;
  }
  const totalAmount = Object.values(strategyState.selected).reduce((sum, amount) => sum + Number(amount || 0), 0);
  strategyDropzone.querySelectorAll("[data-pct-for]").forEach((el) => {
    const venue = el.dataset.pctFor;
    const amount = Number(strategyState.selected[venue] || 0);
    const pct = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    el.textContent = `${pct.toFixed(1)}%`;
  });
};

async function loadStrategyVenueData() {
  if (!strategySummary) {
    return;
  }
  strategySummary.textContent = "Loading venues for strategy lab...";

  const capital = strategyCapitalInput ? Number(strategyCapitalInput.value || 25000) : 25000;
  const risk = strategyRiskInput ? Number(strategyRiskInput.value || 3) : 3;

  try {
    const response = await fetch(
      `/api/lp-recommendations?capital=${encodeURIComponent(String(capital))}&risk=${encodeURIComponent(String(risk))}&limit=20`,
      { method: "GET" }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details || data.error || "failed to load venue data");
    }

    const nextMetrics = {};
    for (const item of data.recommendations || []) {
      nextMetrics[item.venue] = {
        ...item,
        pctRange: parsePctRange(item.expectedHourlyPctRange),
      };
    }
    strategyState.venueMetrics = nextMetrics;
    if (!Object.keys(strategyState.selected).length) {
      const firstVenue = Object.keys(nextMetrics)[0];
      if (firstVenue) {
        strategyState.selected[firstVenue] = Math.max(1000, Math.round(capital));
      }
    }

    if (strategySource) {
      strategySource.textContent = data.source || "Jupiter route telemetry + heuristic model";
    }
    renderStrategyPool();
    renderStrategyDropzone();
    analyzeStrategy();
  } catch (error) {
    strategySummary.textContent = `Strategy lab unavailable: ${error.message}`;
  }
}

function analyzeStrategy() {
  if (!strategySummary) {
    return;
  }
  const venues = Object.entries(strategyState.selected);
  if (!venues.length) {
    strategySummary.textContent = "Add at least one venue to analyze strategy.";
    return;
  }

  const totalAmount = venues.reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
  if (totalAmount <= 0) {
    strategySummary.textContent = "Allocation amount must be greater than 0.";
    return;
  }

  const capital = strategyCapitalInput ? Number(strategyCapitalInput.value || 25000) : 25000;
  let lowPct = 0;
  let highPct = 0;
  let riskScore = 0;
  let concentration = 0;
  let weightedImpactReduction = 0;
  let weightedUsageShare = 0;
  let styleTilt = 0;
  let styleVol = 0;

  for (const [venue, amount] of venues) {
    const weight = Number(amount || 0) / totalAmount;
    const metric = strategyState.venueMetrics[venue];
    if (!metric) {
      continue;
    }
    lowPct += metric.pctRange.low * weight;
    highPct += metric.pctRange.high * weight;
    riskScore += Number(metric.riskScore || 50) * weight;
    concentration += (weight * 100) ** 2;
    weightedImpactReduction += Number(metric.expectedImpactReductionBps || 0) * weight;
    weightedUsageShare += Number(metric.usageSharePct || 0) * weight;
    const h = venueHashUnit(venue);
    styleTilt += (h - 0.5) * 2 * weight;
    styleVol += (0.35 + h * 0.9) * weight;
  }

  const concentrationScore = Math.min(100, Math.round(concentration / 100));
  const hourlyLowUsd = capital * lowPct;
  const hourlyHighUsd = capital * highPct;
  const dailyLowUsd = hourlyLowUsd * 24;
  const dailyHighUsd = hourlyHighUsd * 24;

  strategySummary.textContent =
    `Percentages auto-normalized from block amounts (always 100%). Total block amount ${formatNumber(totalAmount, 2)} USDC, strategy capital ${format(capital)}. ` +
    `Expected hourly return ${(lowPct * 100).toFixed(3)}% to ${(highPct * 100).toFixed(3)}% ` +
    `(${formatNumber(hourlyLowUsd, 2)} to ${formatNumber(hourlyHighUsd, 2)} USD/hour). ` +
    `Expected daily ${formatNumber(dailyLowUsd, 2)} to ${formatNumber(dailyHighUsd, 2)} USD. ` +
    `Risk score ${Math.round(riskScore)}/100, concentration ${concentrationScore}/100.`;

  renderStrategyBacktestChart({
    capital,
    lowPct,
    highPct,
    riskScore,
    concentrationScore,
    impactReductionBps: weightedImpactReduction,
    usageSharePct: weightedUsageShare,
    styleTilt,
    styleVol,
  });
}

if (strategyDropzone) {
  strategyDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  strategyDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    const venue = event.dataTransfer.getData("text/plain");
    if (!venue) {
      return;
    }
    if (!strategyState.selected[venue]) {
      const capital = strategyCapitalInput ? Number(strategyCapitalInput.value || 25000) : 25000;
      const defaultAmount = Math.max(1000, Math.round(capital / Math.max(1, Object.keys(strategyState.selected).length + 1)));
      strategyState.selected[venue] = defaultAmount;
      renderStrategyDropzone();
      analyzeStrategy();
    }
  });
}

if (strategyCapitalInput) {
  strategyCapitalInput.addEventListener("input", () => {
    renderStrategyDropzone();
    analyzeStrategy();
  });
}

const loadBacktestMarket = async (windowKey) => {
  if (strategyBacktestState.marketByWindow[windowKey]) {
    return strategyBacktestState.marketByWindow[windowKey];
  }
  const response = await fetch(
    `/api/market-history?asset=SOL&window=${encodeURIComponent(windowKey)}&points=120`,
    { method: "GET" }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.details || data.error || "historical data unavailable");
  }
  const points = (data.items || []).filter((p) => Number.isFinite(p.value) && p.timestamp);
  strategyBacktestState.marketByWindow[windowKey] = points;
  return points;
};

const renderBacktestSvg = ({ market, lowCurve, baseCurve, highCurve }) => {
  const width = CHART_VIEWBOX.width;
  const height = CHART_VIEWBOX.height;
  const leftPad = 42;
  const rightPad = 20;
  const topPad = 18;
  const bottomPad = 28;
  const innerWidth = width - leftPad - rightPad;
  const innerHeight = height - topPad - bottomPad;
  const count = market.length;
  const allValues = [...market, ...lowCurve, ...baseCurve, ...highCurve].map((p) => p.value);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const pad = Math.max(0.2, (max - min) * 0.15);
  const minY = min - pad;
  const maxY = max + pad;

  const normalizeX = (idx) => leftPad + (count <= 1 ? 0 : (idx / (count - 1)) * innerWidth);
  const normalizeY = (value) => topPad + ((maxY - value) / (maxY - minY || 1)) * innerHeight;

  const mkPath = (arr) => arr.map((p, i) => `${normalizeX(i)},${normalizeY(p.value)}`).join(" ");
  const marketPath = mkPath(market);
  const lowPath = mkPath(lowCurve);
  const basePath = mkPath(baseCurve);
  const highPath = mkPath(highCurve);
  const band = `${highPath} ${[...lowCurve]
    .reverse()
    .map((p, i) => {
      const idx = lowCurve.length - 1 - i;
      return `${normalizeX(idx)},${normalizeY(p.value)}`;
    })
    .join(" ")}`;

  const yTicks = [minY, (minY + maxY) / 2, maxY];
  const yGrid = yTicks
    .map((v) => {
      const y = normalizeY(v);
      return `<line x1="${leftPad}" y1="${y}" x2="${width - rightPad}" y2="${y}" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
      <text x="6" y="${y + 4}" fill="#94a3b8" font-size="11">${v.toFixed(2)}</text>`;
    })
    .join("");

  const startLabel = new Date(market[0].timestamp).toLocaleTimeString();
  const endLabel = new Date(market[market.length - 1].timestamp).toLocaleTimeString();

  const svg = `
    ${yGrid}
    <line x1="${leftPad}" y1="${height - bottomPad}" x2="${width - rightPad}" y2="${height - bottomPad}" stroke="rgba(148,163,184,0.35)" stroke-width="1.2" />
    <polygon points="${band}" fill="rgba(247,184,1,0.14)" />
    <polyline fill="none" stroke="#4be1c1" stroke-width="2.2" points="${marketPath}" />
    <polyline fill="none" stroke="#f7b801" stroke-width="2.1" stroke-dasharray="6 4" points="${lowPath}" />
    <polyline fill="none" stroke="#e5e7eb" stroke-width="2.1" stroke-dasharray="4 3" points="${basePath}" />
    <polyline fill="none" stroke="#9ef01a" stroke-width="2.1" stroke-dasharray="6 4" points="${highPath}" />
    <text x="${leftPad}" y="${height - 8}" fill="#94a3b8" font-size="11">${startLabel}</text>
    <text x="${width - rightPad - 70}" y="${height - 8}" fill="#94a3b8" font-size="11">${endLabel}</text>
  `;
  const hoverPoints = market.map((point, index) => {
    const basePoint = baseCurve[index];
    const lowPoint = lowCurve[index];
    const highPoint = highCurve[index];
    return {
      x: normalizeX(index),
      y: normalizeY(basePoint ? basePoint.value : point.value),
      timestamp: point.timestamp,
      marketValue: point.value,
      lowValue: lowPoint ? lowPoint.value : point.value,
      baseValue: basePoint ? basePoint.value : point.value,
      highValue: highPoint ? highPoint.value : point.value,
    };
  });
  return {
    svg,
    hoverPoints,
    yBounds: {
      top: topPad,
      bottom: height - bottomPad,
    },
  };
};

async function renderStrategyBacktestChart({
  capital,
  lowPct,
  highPct,
  riskScore,
  concentrationScore,
  impactReductionBps,
  usageSharePct,
  styleTilt,
  styleVol,
}) {
  if (!strategyBacktestChart || !strategyBacktestMeta) {
    return;
  }
  clearChartHover(strategyBacktestChart);
  const windowKey = strategyBacktestWindow ? strategyBacktestWindow.value : "6h";
  strategyBacktestMeta.textContent = "Running historical strategy backtest...";

  try {
    const marketRaw = await loadBacktestMarket(windowKey);
    if (!marketRaw || marketRaw.length < 5) {
      throw new Error("not enough market points");
    }

    const marketBase = marketRaw[0].value;
    const market = marketRaw.map((p) => ({
      timestamp: p.timestamp,
      value: (p.value / marketBase) * 100,
    }));
    const lowCurve = [];
    const baseCurve = [];
    const highCurve = [];
    let lowIdx = 100;
    let baseIdx = 100;
    let highIdx = 100;
    const basePct = (lowPct + highPct) / 2;
    const spreadPct = Math.max(0, highPct - lowPct);
    const riskFactor = Math.max(0, Math.min(1.2, Number(riskScore || 50) / 100));
    const concFactor = Math.max(0, Math.min(1, Number(concentrationScore || 40) / 100));
    const impactFactor = Math.max(0, Math.min(1, Number(impactReductionBps || 0) / 20));
    const usageFactor = Math.max(0, Math.min(1, Number(usageSharePct || 0) / 40));

    const tilt = Number.isFinite(styleTilt) ? styleTilt : 0;
    const volStyle = Number.isFinite(styleVol) ? styleVol : 0.7;

    const lowBeta = Math.max(0.05, 0.1 + concFactor * 0.07 + riskFactor * 0.03 + tilt * 0.04);
    const baseBeta = Math.min(1.05, 0.2 + spreadPct * 180 + riskFactor * 0.2 + usageFactor * 0.15 + tilt * 0.1);
    const highBeta = Math.min(1.45, 0.34 + spreadPct * 280 + riskFactor * 0.32 + impactFactor * 0.22 + tilt * 0.14);
    const meanReversion = 0.015 + (1 - concFactor) * 0.02;

    for (let i = 0; i < marketRaw.length; i += 1) {
      if (i > 0) {
        const dtHours = Math.max(
          0,
          (Date.parse(marketRaw[i].timestamp) - Date.parse(marketRaw[i - 1].timestamp)) / (60 * 60 * 1000)
        );
        const marketRet = (marketRaw[i].value / marketRaw[i - 1].value) - 1;
        const swing = marketRet * marketRet * Math.sign(marketRet) * (0.08 + volStyle * 0.05);
        const lowStepRet = lowPct * dtHours + marketRet * lowBeta - meanReversion * Math.max(0, marketRet) + swing * 0.12;
        const baseStepRet = basePct * dtHours + marketRet * baseBeta + swing * 0.22;
        const highStepRet = highPct * dtHours + marketRet * highBeta + impactFactor * Math.max(0, marketRet) * 0.08 + swing * 0.3;

        lowIdx *= 1 + Math.max(-0.06, lowStepRet);
        baseIdx *= 1 + Math.max(-0.08, baseStepRet);
        highIdx *= 1 + Math.max(-0.1, highStepRet);
      }
      const ts = marketRaw[i].timestamp;
      lowCurve.push({ timestamp: ts, value: lowIdx });
      baseCurve.push({ timestamp: ts, value: baseIdx });
      highCurve.push({ timestamp: ts, value: highIdx });
    }

    const backtest = renderBacktestSvg({
      market,
      lowCurve,
      baseCurve,
      highCurve,
    });
    strategyBacktestChart.innerHTML = backtest.svg;
    attachChartHover({
      svgEl: strategyBacktestChart,
      points: backtest.hoverPoints,
      yBounds: backtest.yBounds,
      markerColor: "#e5e7eb",
      tooltipLines: (point) => {
        const time = point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : "n/a";
        return [
          `Market: ${point.marketValue.toFixed(3)}`,
          `Strategy low/base/high: ${point.lowValue.toFixed(3)} / ${point.baseValue.toFixed(3)} / ${point.highValue.toFixed(3)}`,
          `Time: ${time}`,
        ];
      },
    });

    const lowPnl = capital * (lowCurve[lowCurve.length - 1].value / 100 - 1);
    const basePnl = capital * (baseCurve[baseCurve.length - 1].value / 100 - 1);
    const highPnl = capital * (highCurve[highCurve.length - 1].value / 100 - 1);
    strategyBacktestMeta.textContent =
      `Backtest window ${windowKey}. Simulated strategy PnL over historical timestamps: ` +
      `${formatNumber(lowPnl, 2)} to ${formatNumber(highPnl, 2)} USD (base ${formatNumber(basePnl, 2)} USD). ` +
      `Lines: market (turquoise), strategy low (yellow), base (white), high (green). ` +
      `Simulation uses strategy-specific weighting (risk ${Math.round(riskScore || 0)}, concentration ${Math.round(
        concentrationScore || 0
      )}, impact reduction ${formatNumber(impactReductionBps || 0, 2)} bps, style tilt ${formatNumber(tilt, 3)}). Advisory only.`;
  } catch (error) {
    clearChartHover(strategyBacktestChart);
    strategyBacktestChart.innerHTML = "";
    strategyBacktestMeta.textContent = `Backtest unavailable: ${error.message}`;
  }
}

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
  const risk = Number(document.getElementById("risk").value);

  if (!amount || amount < 100) {
    setResult("Best route", "Enter a valid amount greater than or equal to 100.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Fetching live quote...";

  try {
    const selectedOption = targetSelect ? targetSelect.options[targetSelect.selectedIndex] : null;
    const outputMint = selectedOption ? selectedOption.value : "USDT";
    const outputSymbol = selectedOption ? (selectedOption.dataset.symbol || selectedOption.textContent || "USDT") : "USDT";
    const outputDecimals = selectedOption ? Number(selectedOption.dataset.decimals || 6) : 6;

    const params = new URLSearchParams({
      amount: String(amount),
      outputMint: String(outputMint),
      outputSymbol: String(outputSymbol),
      outputDecimals: String(outputDecimals),
      risk: String(risk),
    });

    const response = await fetch(`/api/quote?${params.toString()}`, { method: "GET" });
    const payload = await response.json();

    if (!response.ok) {
      const details = payload.details ? ` (${payload.details})` : "";
      throw new Error(`${payload.error || "Failed to fetch route"}${details}`);
    }

    const routePath = payload.route && payload.route.length ? payload.route.join(" -> ") : payload.primaryVenue;
    if (executionSource) {
      executionSource.textContent = payload.provider || "Jupiter";
    }
    const trend = payload.trend ? `${payload.trend.direction} (${formatPercent(payload.trend.deltaPct || 0)})` : "n/a";
    const body = [
      `Provider: <strong>${payload.provider}</strong>.`,
      `Route: <strong>${routePath}</strong>.`,
      `Expected output: <strong>${formatNumber(payload.outAmount, 4)} ${payload.outputSymbol}</strong>.`,
      `Price impact: <strong>${formatPercent(payload.priceImpactPct)}</strong>.`,
      `Decision: <strong>${payload.decision.action}</strong> (score ${payload.decision.score}).`,
      `Reason: <strong>${payload.decision.reason}</strong>.`,
      `Trend: <strong>${trend}</strong>.`,
      `Estimated savings vs naive path: <strong>${formatNumber(payload.estimatedSavings, 4)} ${payload.outputSymbol}</strong>.`,
      `Risk mode: <strong>${payload.confidence}</strong>.`,
      `Estimated routing cost proxy: <strong>${format(payload.estimatedCostUsd, 2)}</strong>.`,
    ].join("<br />");

    setResult("Best live route", body);

    if (lastQuoteTime && payload.timestamp) {
      lastQuoteTime.textContent = `Last live quote: ${new Date(payload.timestamp).toLocaleTimeString()}`;
    }

    if (payload.priceImpactPct > 0.01) {
      setAlert("High impact alert: consider reducing size or waiting for better liquidity.");
    }
  } catch (error) {
    setResult("Best live route", `Failed to fetch quote. ${error.message}`);
    setAlert("Quote request failed. Check provider status and API key settings.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Compute route";
    await loadHealth(false);
    await renderHistory();
  }
});

loadHealth();
renderHistory();
loadTokens();
