# StableSweep - DeFi Decision Intelligence

## One-liner
StableSweep turns live routing data into a trader decision: **Buy now, Reduce size, or Wait**, with transparent reasoning.

## Problem
DeFi traders can get swap routes, but still face execution uncertainty:
- Is this the right time to execute?
- Is this route fragile right now?
- Is the quote likely to degrade before execution?

## Why Existing Solutions Are Not Enough
Aggregators already optimize route construction, but mostly return quote/routing outputs.
They usually do not deliver a clear human-facing execution recommendation with reliability context.

## Our Differentiation
StableSweep adds a decision layer on top of routing:
- Action recommendation: **Buy now / Reduce size / Wait**
- Decision score with explanation
- Reliability context: provider health + recent trend behavior
- Scenario mode for repeatable benchmarking in a demo

## How It Works
1. Pull live route/quote data.
2. Evaluate execution quality (impact, slippage tolerance, route complexity).
3. Compute recommendation + confidence.
4. Surface recommendation in a simple trader UI.

## Demo Flow (Judge Friendly)
1. Open app and run a live route quote.
2. Show recommendation and reason.
3. Run judge scenario preset and compare output.
4. Open chart view to show evolving market context.

## User Value
- Faster and clearer execution decisions
- Lower avoidable costs from poor timing
- Better risk control during degraded market/provider conditions

## Current Build (Implemented)
- Live quote integration with fallback behavior
- Recommendation engine with score and reason
- Provider status monitoring (live/degraded/down)
- Scenario runner and chart view

## Next Steps
- Persisted historical data for stronger chart reliability
- Transaction builder endpoint for execution handoff
- Split-order planner with time-sliced execution suggestions
