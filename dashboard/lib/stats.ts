// Same MAX-MIN window math the extension uses. Snapshots arrive from
// Supabase as { store_id, sold_count, taken_at: ISO8601 }.

export type Snapshot = {
  store_id: string;
  sold_count: number;
  taken_at: string;
};

export type Store = {
  id: string;
  username: string;
  display_name: string | null;
  avg_price_minor: number | null;
  currency: string;
};

export type StoreError = {
  store_id: string;
  message: string;
  occurred_at: string;
};

export type StoreStats = {
  today: number;
  week: number;
  month: number;
  todayRevenue: number | null;
  weekRevenue: number | null;
  monthRevenue: number | null;
  totalSold: number | null;
  lastSeen: number | null;
  error: StoreError | null;
};

export function startOfLocalDay(d = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function todayWindow(now = new Date()) {
  const start = startOfLocalDay(now);
  return { start, end: start + 86_400_000 };
}

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

export function soldInWindow(snaps: Snapshot[], start: number, end: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of snaps) {
    const t = Date.parse(s.taken_at);
    if (t >= start && t < end) {
      if (s.sold_count < lo) lo = s.sold_count;
      if (s.sold_count > hi) hi = s.sold_count;
    }
  }
  if (hi === -Infinity) return 0;
  return hi - lo;
}

export function latestSnapshot(snaps: Snapshot[]): Snapshot | null {
  if (!snaps.length) return null;
  return snaps.reduce((a, b) =>
    Date.parse(b.taken_at) > Date.parse(a.taken_at) ? b : a,
  );
}

export function groupSnapshots(snapshots: Snapshot[]): Map<string, Snapshot[]> {
  const by = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    let arr = by.get(s.store_id);
    if (!arr) by.set(s.store_id, (arr = []));
    arr.push(s);
  }
  return by;
}

export function computeStoreStats(
  snaps: Snapshot[],
  err: StoreError | null,
  avgPriceMinor: number | null,
  now = new Date(),
): StoreStats {
  const today = todayWindow(now);
  const week = weekWindow(now);
  const month = monthWindow(now);
  const latest = latestSnapshot(snaps);
  const todayCount = soldInWindow(snaps, today.start, today.end);
  const weekCount = soldInWindow(snaps, week.start, week.end);
  const monthCount = soldInWindow(snaps, month.start, month.end);
  const avg = avgPriceMinor;
  return {
    today: todayCount,
    week: weekCount,
    month: monthCount,
    todayRevenue: avg != null ? todayCount * avg : null,
    weekRevenue: avg != null ? weekCount * avg : null,
    monthRevenue: avg != null ? monthCount * avg : null,
    totalSold: latest ? latest.sold_count : null,
    lastSeen: latest ? Date.parse(latest.taken_at) : null,
    error: err,
  };
}

export function formatMoneyMinor(
  minor: number | null,
  currency = "USD",
): string | null {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function fmtCount(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

export function relTime(ms: number | null): string {
  if (!ms) return "no data yet";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
