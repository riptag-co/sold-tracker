// Shared math helpers for both the extension popup and the dashboard.
// Snapshots arrive from /dashboard-data as { store_id, sold_count,
// taken_at: ISO8601 }. Sold-in-window math is MAX - MIN because
// Depop's lifetime counter only ever goes up.

export function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function todayWindow(now = new Date()) {
  const start = startOfLocalDay(now);
  return { start, end: start + 86_400_000 };
}

// Week starts on Monday.
export function weekWindow(now = new Date()) {
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  const daysSinceMonday = (startDay.getDay() + 6) % 7;
  startDay.setDate(startDay.getDate() - daysSinceMonday);
  const start = startDay.getTime();
  return { start, end: start + 7 * 86_400_000 };
}

export function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { start, end };
}

export function soldInWindow(snaps, start, end) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of snaps) {
    const t = typeof s.taken_at === "number"
      ? s.taken_at
      : Date.parse(s.taken_at);
    const c = s.sold_count ?? s.c;
    if (t >= start && t < end) {
      if (c < lo) lo = c;
      if (c > hi) hi = c;
    }
  }
  if (hi === -Infinity) return 0;
  return hi - lo;
}

export function latestSnapshot(snaps) {
  if (!snaps || snaps.length === 0) return null;
  return snaps.reduce((a, b) => {
    const ta = typeof a.taken_at === "number" ? a.taken_at : Date.parse(a.taken_at);
    const tb = typeof b.taken_at === "number" ? b.taken_at : Date.parse(b.taken_at);
    return tb > ta ? b : a;
  });
}

// Group a flat snapshots array by store_id.
export function groupSnapshots(snapshots) {
  const by = new Map();
  for (const s of snapshots) {
    if (!by.has(s.store_id)) by.set(s.store_id, []);
    by.get(s.store_id).push(s);
  }
  return by;
}

export function computeStoreStats(snaps, err, avgPriceMinor, now = new Date()) {
  const today = todayWindow(now);
  const week = weekWindow(now);
  const month = monthWindow(now);
  const latest = latestSnapshot(snaps);
  const todayCount = soldInWindow(snaps, today.start, today.end);
  const weekCount = soldInWindow(snaps, week.start, week.end);
  const monthCount = soldInWindow(snaps, month.start, month.end);
  const avg = Number.isFinite(avgPriceMinor) ? avgPriceMinor : null;
  return {
    today: todayCount,
    week: weekCount,
    month: monthCount,
    todayRevenue: avg != null ? todayCount * avg : null,
    weekRevenue: avg != null ? weekCount * avg : null,
    monthRevenue: avg != null ? monthCount * avg : null,
    totalSold: latest ? latest.sold_count ?? latest.c : null,
    lastSeen: latest
      ? (typeof latest.taken_at === "number"
          ? latest.taken_at
          : Date.parse(latest.taken_at))
      : null,
    error: err,
  };
}

export function formatMoneyMinor(minor, currency = "USD") {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}
