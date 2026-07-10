# Superteam Earn Submission Draft

## Project Title

MatchPulse Agent

## Short Description

MatchPulse Agent is a TxODDS-ready World Cup dashboard that converts fixture, score, and odds context into explainable market and fan-experience signals.

## What It Does

- Displays World Cup fixtures from a demo feed or TxLINE snapshots.
- Generates confidence-scored match signals.
- Explains why each fixture is worth watching.
- Keeps the UI simple enough for fans and structured enough for agent workflows.

## Why It Uses TxODDS

The app is built around the TxLINE data model documented by TxODDS. It supports the free World Cup tier flow where a user activates API access and sends:

- `Authorization: Bearer <jwt>`
- `X-Api-Token: <apiToken>`

The current adapter accepts a verified fixture endpoint from the TxLINE API reference. It only sends credentials to the official TxLINE mainnet or devnet API domains over HTTPS.

The next build should add:

- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`
- score and odds streaming where available

## Track Fit

Markets:
The app flags high-pressure fixtures as candidates for deeper market inspection.

Trading agents:
The signal layer is structured for automated agents to reason about confidence, market pressure, and risk.

Fan experiences:
The same signals are presented as readable live match narratives.

## Required Submission Fields

Live MVP:
https://farllok.github.io/matchpulse-agent/

Demo Video:
https://github.com/farllok/matchpulse-agent/blob/main/demo/matchpulse-demo.webm

Public Repository:
https://github.com/farllok/matchpulse-agent

Optional X Post:
TBD.
