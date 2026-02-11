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
- `GET /api/health`

## Files
- `index.html` - UI layout and copy
- `styles.css` - styling
- `app.js` - frontend logic calling backend endpoints
- `server.js` - static file server + Jupiter-backed API routes

## Notes
- Input asset is fixed to `USDC` for this prototype.
- Supported output assets are `USDT` and `USDC`.
- Risk mode maps to slippage bps on backend:
  - 1: 10 bps
  - 2: 20 bps
  - 3: 35 bps
  - 4: 50 bps
  - 5: 75 bps
