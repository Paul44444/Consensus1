# StableSweep (Hackathon Prototype)

StableSweep is a lightweight web project that demonstrates gas-aware stable routing with live Jupiter quotes on Solana.

## Stack
- Frontend: static HTML/CSS/JS
- Backend: Node.js (`http` + native `fetch`)
- Data source: Jupiter Quote API

## Run locally

```bash
cd /Users/paulrichter/Documents/codex/snake1
npm run dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## API endpoints
- `GET /api/quote?amount=50000&output=USDT&risk=3`
- `GET /api/quote?amount=50000&outputMint=<mint>&outputSymbol=SOL&outputDecimals=9&risk=3`
- `GET /api/health`
- `GET /api/history`
- `GET /api/series`
- `GET /api/market-history?asset=SOL&window=6h&points=100`
- `GET /api/lp-recommendations?capital=25000`
- `GET /api/lp-recommendations?capital=25000&risk=3`
- `GET /api/tokens`

## Source responsibilities
- `/api/quote` and decisioning use `Jupiter` (execution/routing data).
- `/api/market-history` uses `CoinGecko` (historical market data).
- The chart UI uses `/api/market-history` only.
- `/api/lp-recommendations` uses `Jupiter` route telemetry + heuristics to produce non-custodial LP suggestions.
- `/api/tokens` uses Jupiter token list (with local fallback) to populate many output currencies.

## Files
- `index.html` - UI layout and copy
- `styles.css` - styling
- `app.js` - frontend logic calling backend endpoints
- `server.js` - static file server + Jupiter-backed API routes

## Notes
- Input asset is fixed to `USDC` for this prototype.
- Supported output assets are dynamically loaded from Jupiter token list (plus local fallback set).
- Optional: set `JUP_API_KEY` before running if `api.jup.ag` requires a key in your region.
  - Example: `JUP_API_KEY=your_key npm run dev`
- Risk mode maps to slippage bps on backend:
  - 1: 10 bps
  - 2: 20 bps
  - 3: 35 bps
  - 4: 50 bps
  - 5: 75 bps
- Quote responses include a decision layer (`Buy now / Reduce size / Wait`) and trend signal.
- Quote history is kept in memory (last 60 records).
- LP Adviser provides advisory allocation recommendations; it does not custody or deploy user funds.
- LP Adviser supports risk preference (`1-5`) and returns forecast ranges (hourly/daily) with explicit risk and concentration scores.
- LP Adviser includes a projection chart combining historical `SOL/USD` context with a forecast band and a live horizon slider (`1h` to `24h`).
- Strategy Lab adds drag-and-drop venue composition with allocation controls and live portfolio simulation (hourly/daily range, risk score, concentration score).
- Strategy Lab now loads up to 20 venues, shows compact logo badges, and includes hover descriptions for venue context.
- Strategy Lab allocation input is amount-based (USDC per venue); percentages are auto-derived from block amounts and normalize to 100%.
- Strategy Lab includes an integrated historical backtest chart (market vs strategy low/base/high simulation) for the selected window.
- Market chart series is sampled every 5 seconds for `USDC -> USDT` at `10,000 USDC`.
- Chart supports windows: `30m`, `6h`, `today`, `all` (via `?window=`).
- Chart supports metric modes in UI: indexed price (base 100) and raw price (USD).
- Chart supports point density control (50 or 100 points) via `?points=`.
- Chart view now supports historical market assets (`SOL`, `BTC`, `ETH`) from CoinGecko for immediate multi-hour volatility.
- Historical market responses are cached in memory for 90 seconds to reduce rate-limit pressure.
