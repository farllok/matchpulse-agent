const demoFixtures = [
  {
    FixtureId: 900101,
    Participant1: "Brazil",
    Participant2: "Japan",
    Participant1IsHome: true,
    StartTime: "2026-07-10T19:00:00Z",
    status: "Pre-match",
    pressure: 72,
  },
  {
    FixtureId: 900102,
    Participant1: "Spain",
    Participant2: "United States",
    Participant1IsHome: true,
    StartTime: "2026-07-11T16:00:00Z",
    status: "Pre-match",
    pressure: 58,
  },
  {
    FixtureId: 900103,
    Participant1: "Argentina",
    Participant2: "France",
    Participant1IsHome: false,
    StartTime: "2026-07-12T20:00:00Z",
    status: "Market active",
    pressure: 84,
  },
];

const state = {
  fixtures: demoFixtures,
  source: "demo",
};

const els = {
  feedStatus: document.querySelector("#feedStatus"),
  matchCount: document.querySelector("#matchCount"),
  signalCount: document.querySelector("#signalCount"),
  confidenceAvg: document.querySelector("#confidenceAvg"),
  fixtureGrid: document.querySelector("#fixtureGrid"),
  signalList: document.querySelector("#signalList"),
  jwtInput: document.querySelector("#jwtInput"),
  apiTokenInput: document.querySelector("#apiTokenInput"),
  competitionInput: document.querySelector("#competitionInput"),
  refreshButton: document.querySelector("#refreshButton"),
  loadDemoButton: document.querySelector("#loadDemoButton"),
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mapFixture(raw) {
  const homeTeam = raw.Participant1IsHome ? raw.Participant1 : raw.Participant2;
  const awayTeam = raw.Participant1IsHome ? raw.Participant2 : raw.Participant1;
  const pressure =
    raw.pressure ??
    Math.min(95, Math.max(35, Math.round(((raw.FixtureId || 100) % 61) + 35)));

  return {
    id: raw.FixtureId,
    homeTeam,
    awayTeam,
    startTime: raw.StartTime || raw.startTime || new Date().toISOString(),
    status: raw.status || "Scheduled",
    pressure,
  };
}

function buildSignals(fixtures) {
  return fixtures.map((fixture) => {
    let label = "Watch";
    let detail = "Stable pre-match conditions. No sharp action suggested.";

    if (fixture.pressure >= 80) {
      label = "High movement";
      detail =
        "Market pressure is elevated. Agent should inspect odds deltas and verify score state before acting.";
    } else if (fixture.pressure >= 65) {
      label = "Momentum";
      detail =
        "Moderate pressure detected. Useful for fan narrative and low-risk market monitoring.";
    }

    return {
      fixture,
      label,
      detail,
      confidence: Math.min(96, Math.max(52, fixture.pressure + 8)),
    };
  });
}

function render() {
  const fixtures = state.fixtures.map(mapFixture);
  const signals = buildSignals(fixtures);
  const confidenceAvg = signals.length
    ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
    : 0;

  els.feedStatus.textContent = state.source === "live" ? "TxLINE live" : "Demo feed";
  els.matchCount.textContent = fixtures.length;
  els.signalCount.textContent = signals.length;
  els.confidenceAvg.textContent = `${confidenceAvg}%`;

  els.fixtureGrid.innerHTML = fixtures
    .map(
      (fixture) => `
        <article class="fixture-card">
          <strong>${escapeHtml(fixture.homeTeam)} vs ${escapeHtml(fixture.awayTeam)}</strong>
          <p class="muted">${escapeHtml(formatDate(fixture.startTime))} | ${escapeHtml(fixture.status)}</p>
          <span>Pressure ${fixture.pressure}</span>
        </article>
      `
    )
    .join("");

  els.signalList.innerHTML = signals
    .map(
      (signal) => `
        <article class="signal-card">
          <div>
            <p><b>${escapeHtml(signal.label)}</b>: ${escapeHtml(signal.fixture.homeTeam)} vs ${escapeHtml(signal.fixture.awayTeam)}</p>
            <p class="muted">${escapeHtml(signal.detail)}</p>
          </div>
          <span>${signal.confidence}%</span>
        </article>
      `
    )
    .join("");
}

async function loadTxlineFixtures() {
  const jwt = els.jwtInput.value.trim();
  const apiToken = els.apiTokenInput.value.trim();
  const competitionId = els.competitionInput.value.trim();

  if (!jwt || !apiToken) {
    state.fixtures = demoFixtures;
    state.source = "demo";
    render();
    return;
  }

  const url = new URL("https://txline.txodds.com/api/fixtures/snapshot");
  if (competitionId) {
    url.searchParams.set("competitionId", competitionId);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TxLINE returned ${response.status}`);
  }

  const data = await response.json();
  const fixtures = Array.isArray(data) ? data : data.fixtures;
  state.fixtures = Array.isArray(fixtures) ? fixtures.slice(0, 12) : [];
  state.source = "live";
  render();
}

els.refreshButton.addEventListener("click", async () => {
  els.refreshButton.disabled = true;
  els.refreshButton.textContent = "Refreshing...";
  try {
    await loadTxlineFixtures();
  } catch (error) {
    state.fixtures = demoFixtures;
    state.source = "demo";
    render();
    alert(`Could not load TxLINE yet: ${error.message}. Demo feed restored.`);
  } finally {
    els.refreshButton.disabled = false;
    els.refreshButton.textContent = "Refresh feed";
  }
});

els.loadDemoButton.addEventListener("click", () => {
  state.fixtures = demoFixtures;
  state.source = "demo";
  render();
});

render();
