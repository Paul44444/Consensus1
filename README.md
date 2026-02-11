# StableSweep (Hackathon Prototype)

A lightweight web prototype for a gas-aware stable routing concept on RobinPump.

## Run locally

Option A (Python):

```
python3 -m http.server 5173
```

Then open `http://localhost:5173` and load `index.html`.

Option B (VS Code Live Server):
- Open the folder in VS Code.
- Right click `index.html` > "Open with Live Server".

## Files
- `index.html` — layout and copy
- `styles.css` — styling
- `app.js` — mock data + routing simulator

## Next steps
- Replace mock pools in `app.js` with RobinPump data
- Add wallet connect + transaction builder
- Add alerts for low-liquidity windows
