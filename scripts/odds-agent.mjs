import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const STATE_DIR = resolve(".matchpulse");
const STATE_FILE = resolve(STATE_DIR, "agent-state.json");
const SIGNAL_LOG = resolve(STATE_DIR, "signals.jsonl");
const HISTORY_WINDOW_MS = 5 * 60_000;
const WATCH_THRESHOLD_BPS = 75;
const ACTION_THRESHOLD_BPS = 150;

function marketKey(odd, selection) {
  return [odd.FixtureId, odd.Bookmaker, odd.SuperOddsType, odd.MarketParameters || "", odd.MarketPeriod || "", selection].join("|");
}

export function normalizeOdds(rows) {
  const normalized = new Map();
  for (const odd of Array.isArray(rows) ? rows : []) {
    if (!String(odd.Bookmaker || "").includes("StablePrice")) continue;
    for (let index = 0; index < (odd.PriceNames || []).length; index += 1) {
      const probability = Number(odd.Pct?.[index]);
      if (!Number.isFinite(probability)) continue;
      const selection = odd.PriceNames[index];
      normalized.set(marketKey(odd, selection), {
        fixtureId: odd.FixtureId,
        bookmaker: odd.Bookmaker,
        market: odd.SuperOddsType,
        parameters: odd.MarketParameters || "",
        period: odd.MarketPeriod || "Match",
        selection,
        probability,
        price: Number(odd.Prices?.[index]) / 1000,
        timestamp: Number(odd.Ts),
      });
    }
  }
  return normalized;
}

function fixtureName(fixture) {
  return `${fixture.Participant1} vs ${fixture.Participant2}`;
}

export function buildSignal(current, previous, fixture) {
  const deltaPct = current.probability - previous.probability;
  const deltaBps = Math.round(deltaPct * 100);
  const absBps = Math.abs(deltaBps);
  if (absBps < WATCH_THRESHOLD_BPS) return null;
  const elapsedMinutes = Math.max(0.1, Math.abs(current.timestamp - previous.timestamp) / 60_000);
  const velocityBpsPerMinute = Math.round(absBps / elapsedMinutes);
  const tone = absBps >= ACTION_THRESHOLD_BPS ? "risk" : "watch";
  const direction = deltaBps > 0 ? "shortening" : "drifting";
  const confidence = Math.min(96, Math.round(52 + absBps / 5 + Math.min(12, velocityBpsPerMinute / 5)));
  return {
    id: `${current.fixtureId}:${current.market}:${current.parameters}:${current.selection}:${current.timestamp}`,
    fixtureId: current.fixtureId,
    fixture: fixtureName(fixture),
    homeTeam: fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2,
    awayTeam: fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1,
    label: tone === "risk" ? "Actionable move" : "Movement watch",
    detail: `${current.selection} ${direction} ${absBps} bps over ${elapsedMinutes.toFixed(1)} min in ${current.market}.`,
    confidence,
    tone,
    market: current.market,
    selection: current.selection,
    direction,
    deltaBps,
    velocityBpsPerMinute,
    previousPct: previous.probability,
    currentPct: current.probability,
    previousPrice: previous.price,
    currentPrice: current.price,
    windowMinutes: Number(elapsedMinutes.toFixed(1)),
    detectedAt: new Date(current.timestamp).toISOString(),
  };
}

async function requestJson(url, credentials) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${credentials.TXLINE_JWT}`,
      "x-api-token": credentials.TXLINE_API_TOKEN,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`TxLINE ${response.status} for ${new URL(url).pathname}`);
  return response.json();
}

async function readPersistedState() {
  try { return JSON.parse(await readFile(STATE_FILE, "utf8")); } catch { return null; }
}

export async function createOddsAgent({ loadCredentials, intervalMs = 60_000 }) {
  await mkdir(STATE_DIR, { recursive: true });
  const persisted = await readPersistedState();
  let baseline = new Map(persisted?.baseline || []);
  let status = persisted?.status || {
    state: "starting", updatedAt: null, nextRunAt: null, fixtures: [], signals: [],
    metrics: { fixturesMonitored: 0, oddsFixtures: 0, marketsTracked: 0, activeSignals: 0, actionableSignals: 0 },
  };
  let running = false;

  async function cycle() {
    if (running) return status;
    running = true;
    try {
      const credentials = await loadCredentials();
      const origin = credentials.TXLINE_API_ORIGIN || "https://txline.txodds.com";
      if (origin !== "https://txline.txodds.com") throw new Error("Unsupported TxLINE origin");
      const fixtures = await requestJson(`${origin}/api/fixtures/snapshot`, credentials);
      const now = Date.now();
      const results = await Promise.all((Array.isArray(fixtures) ? fixtures : []).map(async (fixture) => {
        const currentRows = await requestJson(`${origin}/api/odds/snapshot/${fixture.FixtureId}`, credentials);
        let previousMap = baseline;
        if (![...baseline.keys()].some((key) => key.startsWith(`${fixture.FixtureId}|`)) && currentRows.length) {
          const historicalRows = await requestJson(`${origin}/api/odds/snapshot/${fixture.FixtureId}?asOf=${now - HISTORY_WINDOW_MS}`, credentials);
          previousMap = normalizeOdds(historicalRows);
        }
        const currentMap = normalizeOdds(currentRows);
        const signals = [];
        for (const [key, current] of currentMap) {
          const previous = previousMap.get(key);
          if (previous && current.timestamp > previous.timestamp) {
            const signal = buildSignal(current, previous, fixture);
            if (signal) signals.push(signal);
          }
          baseline.set(key, current);
        }
        return { fixture, marketCount: currentMap.size, signals };
      }));

      const signals = results.flatMap((result) => result.signals)
        .sort((a, b) => Math.abs(b.deltaBps) - Math.abs(a.deltaBps)).slice(0, 24);
      const fixtureSignals = new Map();
      for (const signal of signals) fixtureSignals.set(signal.fixtureId, Math.max(fixtureSignals.get(signal.fixtureId) || 0, Math.abs(signal.deltaBps)));
      const agentFixtures = results.map(({ fixture, marketCount }) => ({
        ...fixture,
        status: typeof fixture.GameState === "string" ? fixture.GameState : "Scheduled",
        pressure: Math.min(95, Math.round((fixtureSignals.get(fixture.FixtureId) || 0) / 2)),
        marketCount,
      }));
      status = {
        state: "running",
        updatedAt: new Date(now).toISOString(),
        nextRunAt: new Date(now + intervalMs).toISOString(),
        fixtures: agentFixtures,
        signals,
        metrics: {
          fixturesMonitored: agentFixtures.length,
          oddsFixtures: results.filter((result) => result.marketCount > 0).length,
          marketsTracked: results.reduce((sum, result) => sum + result.marketCount, 0),
          activeSignals: signals.length,
          actionableSignals: signals.filter((signal) => signal.tone === "risk").length,
        },
      };
      if (signals.length) await appendFile(SIGNAL_LOG, `${signals.map((signal) => JSON.stringify(signal)).join("\n")}\n`, "utf8");
      await writeFile(STATE_FILE, JSON.stringify({ status, baseline: [...baseline] }, null, 2), "utf8");
    } catch (error) {
      status = { ...status, state: "error", error: error.message, nextRunAt: new Date(Date.now() + intervalMs).toISOString() };
    } finally {
      running = false;
    }
    return status;
  }

  await cycle();
  const timer = setInterval(cycle, intervalMs);
  timer.unref();
  return { getStatus: () => status, runNow: cycle };
}
