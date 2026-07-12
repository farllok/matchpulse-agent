const demoFixtures = [
  { FixtureId: 900101, Participant1: "Brazil", Participant2: "Japan", Participant1IsHome: true, StartTime: "2026-07-10T19:00:00Z", status: "Pre-match", pressure: 72 },
  { FixtureId: 900102, Participant1: "Spain", Participant2: "United States", Participant1IsHome: true, StartTime: "2026-07-11T16:00:00Z", status: "Pre-match", pressure: 58 },
  { FixtureId: 900103, Participant1: "Argentina", Participant2: "France", Participant1IsHome: false, StartTime: "2026-07-12T20:00:00Z", status: "Market active", pressure: 84 },
];

const TXLINE_HOSTS = new Set(["txline.txodds.com", "txline-dev.txodds.com"]);
const REQUEST_TIMEOUT_MS = 12_000;
const state = { fixtures: demoFixtures, signals: [], agentMetrics: null, source: "demo", filter: "all", sort: "pressure", refreshedAt: null, timer: null, requestController: null };
const els = Object.fromEntries([
  "feedStatus", "lastUpdated", "summaryText", "matchCount", "signalCount", "confidenceAvg", "highRiskCount", "fixtureGrid", "signalList", "jwtInput", "apiTokenInput", "endpointInput", "competitionInput", "autoRefreshInput", "refreshButton", "loadDemoButton", "statusFilter", "sortSelect", "connectionMessage",
].map((id) => [id, document.querySelector(`#${id}`)]));

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const formatDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Time unavailable" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); };

function mapFixture(raw) {
  const homeTeam = raw.Participant1IsHome ? raw.Participant1 : raw.Participant2;
  const awayTeam = raw.Participant1IsHome ? raw.Participant2 : raw.Participant1;
  const suppliedPressure = Number(raw.pressure);
  const fallbackPressure = Math.round(((Number(raw.FixtureId || raw.id) || 100) % 61) + 35);
  const pressure = Number.isFinite(suppliedPressure) ? Math.min(95, Math.max(0, Math.round(suppliedPressure))) : Math.min(95, Math.max(35, fallbackPressure));
  const status = typeof raw.GameState === "string" ? raw.GameState : raw.status || "Scheduled";
  return { id: raw.FixtureId || raw.id, homeTeam: homeTeam || raw.homeTeam || "Home", awayTeam: awayTeam || raw.awayTeam || "Away", startTime: raw.StartTime || raw.startTime || new Date().toISOString(), status, pressure };
}

function buildSignals(fixtures) {
  if (state.source === "live") {
    const visibleIds = new Set(fixtures.map((fixture) => fixture.id));
    return state.signals.filter((signal) => visibleIds.has(signal.fixtureId));
  }
  return fixtures.map((fixture) => {
    if (fixture.pressure >= 80) return { fixture, label: "High movement", detail: "Inspect odds deltas and score state before any action.", confidence: Math.min(96, fixture.pressure + 8), tone: "risk" };
    if (fixture.pressure >= 65) return { fixture, label: "Momentum", detail: "Monitor the next update for a confirmed movement pattern.", confidence: Math.min(96, fixture.pressure + 8), tone: "watch" };
    return { fixture, label: "Watch", detail: "Stable conditions. Keep the fixture in the passive queue.", confidence: Math.min(96, fixture.pressure + 8), tone: "calm" };
  });
}

function isActive(fixture) { return /active|live|in[-\s]?play/i.test(fixture.status); }
function visibleFixtures() {
  const fixtures = state.fixtures.map(mapFixture).filter((fixture) => state.filter === "all" || (state.filter === "active" ? isActive(fixture) : !isActive(fixture)));
  return fixtures.sort((a, b) => state.sort === "time" ? new Date(a.startTime).getTime() - new Date(b.startTime).getTime() : b.pressure - a.pressure);
}

function render() {
  const fixtures = visibleFixtures(); const signals = buildSignals(fixtures);
  const confidenceAvg = signals.length ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length) : 0;
  const highRisk = signals.filter((signal) => signal.tone === "risk").length;
  els.feedStatus.textContent = state.source === "live" ? "TxLINE live" : "Demo snapshot";
  els.feedStatus.classList.toggle("is-live", state.source === "live");
  els.lastUpdated.textContent = state.refreshedAt ? `Updated ${formatDate(state.refreshedAt)}` : "Waiting for data";
  els.summaryText.textContent = state.source === "live" ? (signals.length ? "Autonomous agent detected probability movement. Review the strongest moves first." : "Autonomous agent is monitoring live odds. No movement exceeds the signal threshold.") : "Bundled snapshot is active. Live mode needs valid TxLINE credentials.";
  els.matchCount.textContent = state.agentMetrics?.marketsTracked ?? fixtures.length; els.signalCount.textContent = signals.length; els.confidenceAvg.textContent = `${confidenceAvg}%`; els.highRiskCount.textContent = state.agentMetrics?.actionableSignals ?? highRisk;
  els.fixtureGrid.innerHTML = fixtures.length ? fixtures.map((fixture) => `<article class="fixture-card ${fixture.pressure >= 80 ? "is-risk" : ""}"><div class="fixture-top"><span class="fixture-status">${escapeHtml(fixture.status)}</span><span class="pressure-score">${fixture.pressure}</span></div><strong>${escapeHtml(fixture.homeTeam)} <em>vs</em> ${escapeHtml(fixture.awayTeam)}</strong><p>${escapeHtml(formatDate(fixture.startTime))}</p><div class="pressure-bar"><span style="width:${fixture.pressure}%"></span></div></article>`).join("") : '<p class="empty-state">No fixtures match this filter.</p>';
  els.signalList.innerHTML = signals.length ? signals.map((signal) => `<article class="signal-card ${signal.tone}"><div><p><b>${escapeHtml(signal.label)}</b></p><strong>${escapeHtml(signal.fixture || `${signal.homeTeam} vs ${signal.awayTeam}`)}</strong><p class="muted">${escapeHtml(signal.detail)}</p></div><span>${signal.confidence}%</span></article>`).join("") : '<p class="empty-state">No movement above 75 bps. Agent continues monitoring.</p>';
}

function setMessage(message, kind = "") { els.connectionMessage.textContent = message; els.connectionMessage.className = `connection-message ${kind}`; }
function configureAutoRefresh() { clearInterval(state.timer); state.timer = null; if (els.autoRefreshInput.checked) { state.timer = setInterval(() => els.refreshButton.click(), 60_000); setMessage("Auto-refresh is on. Tokens remain only in memory.", "success"); } }

async function loadTxlineFixtures() {
  const jwt = els.jwtInput.value.trim(); const apiToken = els.apiTokenInput.value.trim(); const endpoint = els.endpointInput.value.trim(); const competitionId = els.competitionInput.value.trim();
  let url;
  const hasManualCredentials = Boolean(jwt && apiToken && endpoint);
  if (hasManualCredentials) {
    try { url = new URL(endpoint); } catch { throw new Error("Enter a valid HTTPS endpoint"); }
    if (url.protocol !== "https:" || !TXLINE_HOSTS.has(url.hostname)) throw new Error("For token safety, use an official TxLINE HTTPS endpoint");
    if (competitionId) url.searchParams.set("competitionId", competitionId);
  } else {
    url = new URL("/api/agent/status", window.location.origin);
  }
  state.requestController?.abort();
  state.requestController = new AbortController();
  const timeout = setTimeout(() => state.requestController?.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    const headers = hasManualCredentials ? { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken, Accept: "application/json" } : { Accept: "application/json" };
    response = await fetch(url, { signal: state.requestController.signal, headers });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timed out after 12 seconds");
    throw error;
  } finally {
    clearTimeout(timeout);
    state.requestController = null;
  }
  if (!response.ok) {
    if (!hasManualCredentials && response.status === 404) {
      state.fixtures = demoFixtures; state.source = "demo"; state.refreshedAt = new Date();
      setMessage("Demo mode is active. Run MatchPulse locally to use saved TxLINE credentials."); render(); return;
    }
    throw new Error(`TxLINE returned ${response.status}`);
  }
  const data = await response.json();
  if (!hasManualCredentials && data.state === "error") throw new Error(data.error || "Odds agent is unavailable");
  const fixtures = Array.isArray(data) ? data : data.fixtures || data.data;
  if (!Array.isArray(fixtures)) throw new Error("Response did not include a fixture array");
  state.fixtures = fixtures.filter((fixture) => fixture && typeof fixture === "object").slice(0, 24);
  state.signals = Array.isArray(data.signals) ? data.signals : [];
  state.agentMetrics = data.metrics || null;
  state.source = "live"; state.refreshedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  setMessage(`Agent running: ${state.agentMetrics?.marketsTracked || 0} markets, ${state.signals.length} active signals.`, "success"); render();
}

els.refreshButton.addEventListener("click", async () => { els.refreshButton.disabled = true; els.refreshButton.setAttribute("aria-busy", "true"); els.refreshButton.textContent = "Refreshing"; try { await loadTxlineFixtures(); } catch (error) { state.source = "demo"; state.fixtures = demoFixtures; state.refreshedAt = new Date(); setMessage(`Live request failed: ${error.message}. Demo snapshot restored.`, "error"); render(); } finally { els.refreshButton.disabled = false; els.refreshButton.removeAttribute("aria-busy"); els.refreshButton.textContent = "Refresh"; } });
els.loadDemoButton.addEventListener("click", () => { state.fixtures = demoFixtures; state.source = "demo"; state.refreshedAt = new Date(); setMessage("Demo snapshot restored."); render(); });
els.statusFilter.addEventListener("change", (event) => { state.filter = event.target.value; render(); });
els.sortSelect.addEventListener("change", (event) => { state.sort = event.target.value; render(); });
els.autoRefreshInput.addEventListener("change", configureAutoRefresh);
state.refreshedAt = new Date(); render();
loadTxlineFixtures().catch((error) => setMessage(`Live request failed: ${error.message}. Demo snapshot remains active.`, "error"));
