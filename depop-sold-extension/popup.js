import {
  computeStoreStats,
  groupSnapshots,
  formatMoneyMinor,
} from "./lib/stats.js";
import { fetchDashboardData, isPaired } from "./lib/api.js";

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function freshnessClass(lastSeen, refreshMs, hasError) {
  if (hasError) return "err";
  if (!lastSeen) return "dead";
  const age = Date.now() - lastSeen;
  if (age > refreshMs * 4) return "dead";
  if (age > refreshMs * 1.5) return "stale";
  return "";
}

function relTime(ms) {
  if (!ms) return "no data yet";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function renderNotPaired() {
  return `
    <div class="glass empty">
      <div class="title">Not paired</div>
      <div>Open the dashboard, generate a pairing code, and connect this extension to your account.</div>
      <button id="open-settings">Pair extension</button>
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="glass empty">
      <div class="title">No shops yet</div>
      <div>Open the dashboard and add the Depop usernames you want to track.</div>
      <button id="open-settings">Open settings</button>
    </div>
  `;
}

function renderHero(perStore) {
  const sumCount = (k) =>
    perStore.reduce((a, s) => a + (s.stats[k] || 0), 0);
  const sumRev = (k) =>
    perStore.reduce((a, s) => a + (s.stats[k] || 0), 0);
  const totalSold = perStore.reduce(
    (a, s) => a + (s.stats.totalSold || 0), 0,
  );
  const monthRev = sumRev("monthRevenue");
  const monthRevFmt = monthRev > 0 ? formatMoneyMinor(monthRev) : null;
  return `
    <section class="glass hero">
      <div class="hero-label">All Stores Combined</div>
      <div class="hero-stats">
        <div class="stat"><div class="num">${fmt(sumCount("today"))}</div><span class="lbl">Today</span></div>
        <div class="stat"><div class="num">${fmt(sumCount("week"))}</div><span class="lbl">Week</span></div>
        <div class="stat"><div class="num">${fmt(sumCount("month"))}</div><span class="lbl">Month</span></div>
      </div>
      <div class="hero-foot">
        <span>Lifetime <span class="num-inline">${fmt(totalSold)}</span></span>
        ${monthRevFmt ? `<span>Month ≈ <span class="num-inline">${monthRevFmt}</span></span>` : ""}
      </div>
    </section>
  `;
}

function renderStore(store, stats, refreshMs) {
  const cls = freshnessClass(stats.lastSeen, refreshMs, !!stats.error);
  const errBlock = stats.error
    ? `<div class="store-err">${esc(stats.error.message)}</div>`
    : "";
  const revBlock =
    stats.monthRevenue != null && stats.monthRevenue > 0
      ? `<span>Month ≈ <span class="num-inline">${formatMoneyMinor(stats.monthRevenue, store.currency)}</span></span>`
      : "";
  const label = store.display_name || store.username;
  return `
    <div class="glass store">
      <div class="store-head">
        <span class="store-name">
          <span class="freshness ${cls}"></span>
          <span class="label">${esc(label)}</span>
        </span>
        <a class="store-open" href="https://www.depop.com/${encodeURIComponent(store.username)}/" target="_blank" rel="noreferrer">View</a>
      </div>
      <div class="store-stats">
        <div class="stat"><div class="num">${fmt(stats.today)}</div><span class="lbl">Today</span></div>
        <div class="stat"><div class="num">${fmt(stats.week)}</div><span class="lbl">Week</span></div>
        <div class="stat"><div class="num">${fmt(stats.month)}</div><span class="lbl">Month</span></div>
      </div>
      <div class="store-foot">
        <span>Lifetime <span class="num-inline">${fmt(stats.totalSold)}</span></span>
        ${revBlock || `<span>${relTime(stats.lastSeen)}</span>`}
      </div>
      ${errBlock}
    </div>
  `;
}

async function render() {
  const content = document.getElementById("content");
  const { refreshMinutes = 5 } = await chrome.storage.local.get("refreshMinutes");
  const refreshMs = refreshMinutes * 60_000;

  if (!(await isPaired())) {
    content.innerHTML = renderNotPaired();
    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => chrome.runtime.openOptionsPage());
    setStatus("UNPAIRED");
    return;
  }

  let data;
  try {
    data = await fetchDashboardData();
  } catch (e) {
    content.innerHTML = `
      <div class="glass empty">
        <div class="title">Can't reach dashboard</div>
        <div>${esc(e.message || String(e))}</div>
        <button id="open-settings">Open settings</button>
      </div>
    `;
    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => chrome.runtime.openOptionsPage());
    setStatus("OFFLINE", true);
    return;
  }

  if (!data.stores || data.stores.length === 0) {
    content.innerHTML = renderEmpty();
    document
      .getElementById("open-settings")
      ?.addEventListener("click", () => chrome.runtime.openOptionsPage());
    setStatus("EMPTY");
    return;
  }

  const errByStore = new Map((data.errors ?? []).map((e) => [e.store_id, e]));
  const snapsByStore = groupSnapshots(data.snapshots ?? []);

  const perStore = data.stores.map((s) => ({
    store: s,
    stats: computeStoreStats(
      snapsByStore.get(s.id) ?? [],
      errByStore.get(s.id) ?? null,
      s.avg_price_minor,
    ),
  }));

  const hasErr = perStore.some((s) => s.stats.error);
  const hasData = perStore.some((s) => s.stats.lastSeen);

  content.innerHTML =
    renderHero(perStore) +
    `<div class="section-label"><span>Stores</span><span>${data.stores.length} active</span></div>` +
    `<div class="stores">${perStore.map((s) => renderStore(s.store, s.stats, refreshMs)).join("")}</div>`;

  if (hasErr) setStatus("WARN", true);
  else if (hasData) setStatus("LIVE");
  else setStatus("SYNCING");
}

function setStatus(text, isError = false) {
  const el = document.getElementById("status");
  el.classList.toggle("error", isError);
  document.getElementById("status-text").textContent = text;
}

document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("refresh-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.classList.remove("spinning");
  void btn.offsetWidth;
  btn.classList.add("spinning");
  setStatus("SYNCING");
  await chrome.runtime.sendMessage({ type: "refreshNow" });
  await render();
});

// Re-render on any local-storage change (e.g. after pairing or token clear).
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") render();
});

render();
