# StableSweep AI

StableSweep AI is a DeFi intelligence app built during the easyA Consensus Hackathon.  
It combines live execution routing with LP strategy guidance and historical/backtest visualization.

Live demo: [https://stablesweep.onrender.com](https://stablesweep.onrender.com)  
Repository: [https://github.com/Paul44444/Consensus1](https://github.com/Paul44444/Consensus1)

![Choosing methods](choose_tokens.png)
![Strategy analysis chart](cut_diagram_strategy.png)


## What it does

- **Live Routing Simulator**: fetches live Jupiter quotes and scores route quality (impact, hops, risk profile).
- **Chart View**: shows historical price context (SOL/BTC/ETH) with multiple windows and interactive hover tooltips.
- **LP Adviser**: proposes non-custodial liquidity allocation recommendations with projected risk/return ranges.
- **Strategy Lab**: lets users drag venues, set amount allocations, auto-normalize percentages, and run historical backtest simulations.

## Architecture

- **Frontend**: `index.html` + `styles.css` + `app.js` (single-page app with view navigation).
- **Backend**: `server.js` using Node `http` + native `fetch`.
- **Execution data source**: Jupiter (`/api/quote`, route telemetry for `/api/lp-recommendations`).
- **Historical market data source**: CoinGecko (`/api/market-history`).
- **Key design choice**: execution and historical data are intentionally separated by source.

## API Endpoints

- `GET /api/quote?amount=50000&outputMint=<mint>&outputSymbol=SOL&outputDecimals=9&risk=3`
- `GET /api/health`
- `GET /api/history`
- `GET /api/series`
- `GET /api/market-history?asset=SOL&window=6h&points=100`
- `GET /api/tokens`
- `GET /api/lp-recommendations?capital=25000&risk=3&limit=20`

## Local Development

```bash
cd /Users/paulrichter/Documents/codex/snake1
npm install
npm run dev
```

Then open: [http://127.0.0.1:5173](http://127.0.0.1:5173)

## Environment Variables

- `HOST` (default `0.0.0.0`)
- `PORT` (default `5173`)
- `JUP_API_KEY` (optional; useful when region/rate limits require key-based access)

Example:

```bash
HOST=0.0.0.0 PORT=5173 JUP_API_KEY=your_key npm run dev
```

## Notes

- Input asset is fixed to `USDC` in this prototype.
- Output assets are loaded from Jupiter token list with local fallback tokens.
- Risk mode maps to backend slippage presets (`1..5`).
- Quote/series/history and recommendation data are in-memory (prototype persistence model).
- LP Adviser and Strategy Lab are **advisory only** and do not custody or deploy user funds.

## Project Files

- `/Users/paulrichter/Documents/codex/snake1/index.html` - UI structure and views
- `/Users/paulrichter/Documents/codex/snake1/styles.css` - visual design, animations, chart styling
- `/Users/paulrichter/Documents/codex/snake1/app.js` - frontend state, API integration, chart rendering/interactions
- `/Users/paulrichter/Documents/codex/snake1/server.js` - static server + API endpoints + data adapters
