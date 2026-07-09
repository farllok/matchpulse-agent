# MatchPulse Agent

MatchPulse Agent is a lightweight MVP for the Superteam Earn World Cup Hackathon powered by TxODDS.

It turns football fixture data into readable market, trading-agent, and fan-experience signals. The app runs with bundled demo data for judging and can switch to TxLINE snapshots when a free World Cup API token is activated.

Target: [World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup/) — submissions close July 19, 2026. The target track is Trading Tools and Agents.

## Live Demo

https://farllok.github.io/matchpulse-agent/

## Hackathon Fit

- Markets: surfaces high-pressure fixtures and market movement candidates.
- Trading agents: generates explainable signals with confidence scores and risk text.
- Fan experiences: converts raw match metadata into live readable narratives.

## Run Locally

Open `index.html` in a browser.

No build step is required.

## Use TxLINE Data

1. Activate a free World Cup tier in TxLINE.
2. Get a guest JWT from `/auth/guest/start`.
3. Activate the API token through `/api/token/activate`.
4. Paste both values into the dashboard and click `Refresh feed`.

If no credentials are provided, the app uses demo data.

Do not commit JWTs or API tokens. The fields are intentionally session-only and are never written to disk.

## Submission Links Needed

- Live MVP URL: https://farllok.github.io/matchpulse-agent/
- Demo video URL: TBD after recording
- Public repository URL: https://github.com/farllok/matchpulse-agent
- Optional X post or project profile

## Current Status

This is a first-pass MVP intended to be published quickly, then improved with:

- odds snapshot ingestion
- score snapshot ingestion
- signal history
- short generated match summaries
- on-chain proof display
# MatchPulse Agent

MatchPulse Agent is a lightweight MVP for the Superteam Earn World Cup Hackathon powered by TxODDS.

It turns football fixture data into readable market, trading-agent, and fan-experience signals. The app runs with bundled demo data for judging and can switch to TxLINE snapshots when a free World Cup API token is activated.

Target: [World Cup Hackathon](https://superteam.fun/earn/hackathon/world-cup/) — submissions close July 19, 2026. The target track is Trading Tools and Agents.

## Hackathon Fit

- Markets: surfaces high-pressure fixtures and market movement candidates.
- Trading agents: generates explainable signals with confidence scores and risk text.
- Fan experiences: converts raw match metadata into live readable narratives.

## Run Locally

Open `index.html` in a browser.

No build step is required.

## Use TxLINE Data

1. Activate a free World Cup tier in TxLINE.
2. Get a guest JWT from `/auth/guest/start`.
3. Activate the API token through `/api/token/activate`.
4. Paste both values into the dashboard and click `Refresh feed`.

If no credentials are provided, the app uses demo data.

Do not commit JWTs or API tokens. The fields are intentionally session-only and are never written to disk.

## Submission Links Needed

- Live MVP URL
- Demo video URL
- Public repository URL
- Optional X post or project profile

## Current Status

This is a first-pass MVP intended to be published quickly, then improved with:

- odds snapshot ingestion
- score snapshot ingestion
- signal history
- short generated match summaries
- on-chain proof display
