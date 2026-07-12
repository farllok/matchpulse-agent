import assert from "node:assert/strict";
import { buildSignal, normalizeOdds } from "./odds-agent.mjs";

const rows = [{
  FixtureId: 42,
  Bookmaker: "TXLineStablePriceDemargined",
  SuperOddsType: "1X2_PARTICIPANT_RESULT",
  PriceNames: ["part1", "draw", "part2"],
  Prices: [2000, 4000, 4000],
  Pct: ["50.000", "NA", "25.000"],
  Ts: 600_000,
}];

const normalized = normalizeOdds(rows);
assert.equal(normalized.size, 2, "NA probabilities must be excluded");

const fixture = { Participant1: "Alpha", Participant2: "Beta", Participant1IsHome: true };
const previous = { fixtureId: 42, market: "1X2_PARTICIPANT_RESULT", parameters: "", selection: "part1", probability: 48, price: 2.083, timestamp: 300_000 };
const current = { ...previous, probability: 50, price: 2, timestamp: 600_000 };
const actionable = buildSignal(current, previous, fixture);
assert.equal(actionable.deltaBps, 200);
assert.equal(actionable.direction, "shortening");
assert.equal(actionable.tone, "risk");
assert.equal(actionable.windowMinutes, 5);

assert.equal(buildSignal({ ...current, probability: 48.5 }, previous, fixture), null, "Moves below 75 bps must not signal");

console.log("Odds agent strategy tests passed.");
