# MatchPulse Agent

MatchPulse Agent is a lightweight MVP for the Superteam Earn World Cup Hackathon powered by TxODDS.

It turns football fixture data into readable market, trading-agent, and fan-experience signals. The app runs with bundled demo data for judging and can switch to TxLINE snapshots when a free World Cup API token is activated.

## Autonomous Odds Agent

The local agent runs once per minute without user input. It:

- loads the TxLINE fixture snapshot;
- fetches current StablePrice markets for each fixture;
- bootstraps a five-minute historical baseline with the `asOf` parameter;
- converts probability changes to basis points and velocity;
- creates a watch signal at 75 bps and an actionable signal at 150 bps;
- persists baselines and an append-only signal log under `.matchpulse/`.

`GET /api/agent/status` exposes the current deterministic decision state without exposing credentials. The browser is a monitoring client; the strategy runs on the server even when the page is closed.

Target: [World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup/) — submissions close July 19, 2026. The target track is Trading Tools and Agents.

## Live Demo

https://farllok.github.io/matchpulse-agent/

## Hackathon Fit

- Markets: surfaces high-pressure fixtures and market movement candidates.
- Trading agents: generates explainable signals with confidence scores and risk text.
- Fan experiences: converts raw match metadata into live readable narratives.

## Run Locally

Run `node scripts/dev-server.mjs`, then open `http://127.0.0.1:4173`.

No package install or build step is required.

## Use TxLINE Data

When `.env` contains `TXLINE_JWT` and `TXLINE_API_TOKEN`, the local server detects them automatically and loads `/api/fixtures/snapshot`. Run `npm start` and open `http://127.0.0.1:4173`.

The published GitHub Pages build remains static and never receives local credentials. Its connection form supports session-only manual testing when needed.

If no credentials are provided, the app uses demo data.

Do not commit JWTs or API tokens. `.env` is Git-ignored and the local proxy never sends credentials to the browser.

## Submission Links

- Live MVP URL: https://farllok.github.io/matchpulse-agent/
- Demo video URL: https://github.com/farllok/matchpulse-agent/blob/main/demo/matchpulse-demo.webm
- Public repository URL: https://github.com/farllok/matchpulse-agent
- Optional X post or project profile

## Current Status

This is a first-pass MVP intended to be published quickly, then improved with:

- odds snapshot ingestion
- score snapshot ingestion
- signal history
- short generated match summaries
- on-chain proof display
