// Service worker: on a schedule, fetches the user's tracked usernames
// from the dashboard, polls each Depop shop's public profile page,
// scrapes the sold count, and pushes the batch to the dashboard.
//
// All persistent state lives in the cloud now (Supabase). The only
// things stored locally are the pairing creds (supabaseUrl,
// deviceToken, userId) and the refresh interval.

import {
  fetchDashboardData,
  fetchRefreshCheck,
  ingest,
  isPaired,
} from "./lib/api.js";

const SOLD_RX = /(\d[\d,]*)\s+sold\b/i;
const DEFAULT_REFRESH_MINUTES = 5;
const ALARM_NAME = "refresh";
const CONTROL_ALARM = "control-check";
const CONTROL_PERIOD_MIN = 0.5; // 30s — minimum Chrome allows in dev.

let lastManualRefreshSeen = null;

const onlyDigits = (s) => parseInt(String(s).replace(/[^\d]/g, ""), 10);

async function getRefreshMinutes() {
  const { refreshMinutes } = await chrome.storage.local.get("refreshMinutes");
  const n = Number(refreshMinutes);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REFRESH_MINUTES;
  return n;
}

async function ensureAlarm() {
  const period = await getRefreshMinutes();
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing || existing.periodInMinutes !== period) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: period,
      delayInMinutes: 0.05,
    });
  }

  // Faster alarm: checks for manual refresh requests every 30 seconds.
  const ctrl = await chrome.alarms.get(CONTROL_ALARM);
  if (!ctrl || ctrl.periodInMinutes !== CONTROL_PERIOD_MIN) {
    await chrome.alarms.clear(CONTROL_ALARM);
    await chrome.alarms.create(CONTROL_ALARM, {
      periodInMinutes: CONTROL_PERIOD_MIN,
      delayInMinutes: 0.1,
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const { refreshMinutes } = await chrome.storage.local.get("refreshMinutes");
  if (refreshMinutes == null) {
    await chrome.storage.local.set({ refreshMinutes: DEFAULT_REFRESH_MINUTES });
  }
  await ensureAlarm();
  refreshAll().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  refreshAll().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) refreshAll().catch(() => {});
  else if (alarm.name === CONTROL_ALARM) checkManualRefresh().catch(() => {});
});

async function checkManualRefresh() {
  if (!(await isPaired())) return;
  let ts;
  try {
    ts = await fetchRefreshCheck();
  } catch {
    return;
  }
  if (!ts) return;
  // Initialize on first sight so we don't fire on a stale value.
  if (lastManualRefreshSeen == null) {
    lastManualRefreshSeen = ts;
    return;
  }
  if (ts !== lastManualRefreshSeen) {
    lastManualRefreshSeen = ts;
    refreshAll().catch(() => {});
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.refreshMinutes) ensureAlarm();
  // Re-poll the moment we pair so the user sees data immediately.
  if (changes.deviceToken && changes.deviceToken.newValue) {
    refreshAll().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "refreshNow") {
    refreshAll()
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }
});

async function fetchSoldCount(username) {
  const url = `https://www.depop.com/${encodeURIComponent(username)}/`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "text/html,application/xhtml+xml" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("user not found");
  if (res.status === 403 || res.status === 503) {
    throw new Error(
      `blocked (HTTP ${res.status}) — open depop.com in a tab to refresh your session`,
    );
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(SOLD_RX);
  if (!m) throw new Error("sold count not found on page");
  const n = onlyDigits(m[1]);
  if (!Number.isFinite(n)) throw new Error("could not parse number");
  return n;
}

async function refreshAll() {
  if (!(await isPaired())) {
    return { skipped: "not paired" };
  }

  // Pull the canonical store list from the dashboard. If the user
  // hasn't added any shops yet, there's nothing to do.
  let dash;
  try {
    dash = await fetchDashboardData();
  } catch (e) {
    return { skipped: `dashboard read failed: ${e.message || e}` };
  }
  const usernames = (dash.stores ?? []).map((s) => s.username);
  if (usernames.length === 0) return { skipped: "no stores" };

  const results = await Promise.all(
    usernames.map(async (username) => {
      try {
        const count = await fetchSoldCount(username);
        return { username, ok: true, count };
      } catch (e) {
        return { username, ok: false, error: e.message || String(e) };
      }
    }),
  );

  try {
    const ingestResult = await ingest(results);
    await chrome.storage.local.set({ lastRunAt: Date.now() });
    return { ok: true, ...ingestResult };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
