// Pure-math derivations from the snapshot stream. Snapshots are
// monotonic lifetime counters, so the number of sales between any two
// snapshots is just `c2 - c1`. We attribute that delta to the later
// snapshot's timestamp (close enough at 5-minute polling resolution).

import type { Snapshot } from "./stats";

export type Sale = { t: number; n: number };  // n sales at time t

// Flatten snapshots → individual sale events. Critically: snapshots
// from different stores have unrelated sold_count values (one store's
// lifetime might be 600 while another's is 2), so we must compute
// deltas WITHIN each store, never across them. The naive "sort all,
// take consecutive deltas" approach inflates totals by the gap
// between stores' lifetime counters.
export function snapshotsToSales(snaps: Snapshot[]): Sale[] {
  if (snaps.length < 2) return [];

  const byStore = new Map<string, Snapshot[]>();
  for (const s of snaps) {
    let arr = byStore.get(s.store_id);
    if (!arr) byStore.set(s.store_id, (arr = []));
    arr.push(s);
  }

  const sales: Sale[] = [];
  for (const storeSnaps of byStore.values()) {
    if (storeSnaps.length < 2) continue;
    const sorted = [...storeSnaps].sort(
      (a, b) => Date.parse(a.taken_at) - Date.parse(b.taken_at),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].sold_count;
      const cur = sorted[i].sold_count;
      if (cur > prev) {
        sales.push({ t: Date.parse(sorted[i].taken_at), n: cur - prev });
      }
    }
  }
  return sales;
}

// Group sales by local day (YYYY-MM-DD).
export function salesByDay(sales: Sale[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sales) {
    const d = new Date(s.t);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out.set(key, (out.get(key) ?? 0) + s.n);
  }
  return out;
}

// 7x24 matrix [dayOfWeek 0=Sun..6=Sat][hour 0..23] = total sales.
export function salesByHourOfWeek(sales: Sale[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const s of sales) {
    const d = new Date(s.t);
    grid[d.getDay()][d.getHours()] += s.n;
  }
  return grid;
}

// Ordered array of {date, count} for the last `days` days, ending today.
// Missing days fill in as 0.
export function dailySeries(
  sales: Sale[],
  days: number,
  now = new Date(),
): { date: string; label: string; count: number }[] {
  const byDay = salesByDay(sales);
  const out: { date: string; label: string; count: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out.push({
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      count: byDay.get(key) ?? 0,
    });
  }
  return out;
}

// Best day in the current calendar month.
export function bestDayThisMonth(
  sales: Sale[],
  now = new Date(),
): { date: Date; count: number } | null {
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  let best: { date: Date; count: number } | null = null;
  for (const [key, count] of salesByDay(sales)) {
    if (!key.startsWith(ym)) continue;
    if (!best || count > best.count) {
      const [y, m, d] = key.split("-").map(Number);
      best = { date: new Date(y, m - 1, d), count };
    }
  }
  return best;
}

// Today's pace projection. Looks at the past `lookbackDays` complete
// days. For each, computes the fraction of that day's total achieved
// by the same fraction-of-day-elapsed as today. Averages those
// fractions, then projects: today_so_far / avg_fraction.
//
// Falls back to linear extrapolation when there isn't enough history
// (< 3 prior days of data).
export function paceProjection(
  sales: Sale[],
  lookbackDays = 14,
  now = new Date(),
): { current: number; projected: number; basis: "curve" | "linear" | "none" } {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayT = startOfToday.getTime();
  const elapsedMs = now.getTime() - todayT;
  const fractionElapsed = elapsedMs / 86_400_000;

  const todayCurrent = sales
    .filter((s) => s.t >= todayT)
    .reduce((a, b) => a + b.n, 0);

  // Build per-past-day cumulative-fraction-at-this-time-of-day.
  const fractions: number[] = [];
  for (let i = 1; i <= lookbackDays; i++) {
    const dayStart = new Date(startOfToday);
    dayStart.setDate(dayStart.getDate() - i);
    const dayStartT = dayStart.getTime();
    const dayEndT = dayStartT + 86_400_000;
    const cutoffT = dayStartT + elapsedMs;
    let dayTotal = 0;
    let dayByCutoff = 0;
    for (const s of sales) {
      if (s.t >= dayStartT && s.t < dayEndT) {
        dayTotal += s.n;
        if (s.t < cutoffT) dayByCutoff += s.n;
      }
    }
    if (dayTotal > 0) fractions.push(dayByCutoff / dayTotal);
  }

  if (todayCurrent === 0) {
    return { current: 0, projected: 0, basis: "none" };
  }

  if (fractions.length >= 3) {
    const avgFrac = fractions.reduce((a, b) => a + b, 0) / fractions.length;
    if (avgFrac > 0.02) {
      return {
        current: todayCurrent,
        projected: Math.round(todayCurrent / avgFrac),
        basis: "curve",
      };
    }
  }

  // Linear fallback.
  if (fractionElapsed > 0.05) {
    return {
      current: todayCurrent,
      projected: Math.round(todayCurrent / fractionElapsed),
      basis: "linear",
    };
  }

  return { current: todayCurrent, projected: todayCurrent, basis: "none" };
}

// Weekly series (ISO-style: Monday-start). Returns last `weeks` buckets
// ending in the current week.
export function weeklySeries(
  sales: Sale[],
  weeks: number,
  now = new Date(),
): { key: string; label: string; count: number }[] {
  const out: { key: string; label: string; count: number }[] = [];
  const startThisWeek = mondayOf(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(startThisWeek);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const count = sales
      .filter((s) => s.t >= ws.getTime() && s.t < we.getTime())
      .reduce((a, b) => a + b.n, 0);
    out.push({
      key: `${ws.getFullYear()}-W${weekNumber(ws)}`,
      label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }
  return out;
}

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function weekNumber(d: Date): number {
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - firstJan.getTime()) / 86_400_000);
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

// Lifetime monthly totals — useful for the stats page.
export function salesByMonth(
  sales: Sale[],
): { key: string; label: string; count: number }[] {
  const by = new Map<string, number>();
  for (const s of sales) {
    const d = new Date(s.t);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    by.set(key, (by.get(key) ?? 0) + s.n);
  }
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: new Date(y, m - 1).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        count,
      };
    });
}

// Is this shop "on fire"? Today's count >= 1.5x the per-day average
// over the past `lookbackDays`, with a sanity floor (avg >= 1).
export function isOnFire(
  sales: Sale[],
  lookbackDays = 14,
  now = new Date(),
): { onFire: boolean; today: number; avg: number; ratio: number } {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayT = startOfToday.getTime();
  const startLookback = todayT - lookbackDays * 86_400_000;

  const today = sales.filter((s) => s.t >= todayT).reduce((a, b) => a + b.n, 0);
  const past = sales.filter((s) => s.t >= startLookback && s.t < todayT);
  const totalPast = past.reduce((a, b) => a + b.n, 0);
  const avg = totalPast / lookbackDays;
  const ratio = avg > 0 ? today / avg : 0;
  const onFire = avg >= 1 && ratio >= 1.5;
  return { onFire, today, avg, ratio };
}

// Per-store daily series — returns one daily series per store_id.
// Used by Compare mode to draw a separate line/bar per shop.
export function dailySeriesPerStore(
  snapsByStore: Map<string, Snapshot[]>,
  days: number,
  now = new Date(),
): Map<string, { date: string; label: string; count: number }[]> {
  const out = new Map<string, { date: string; label: string; count: number }[]>();
  for (const [storeId, snaps] of snapsByStore) {
    const sales = snapshotsToSales(snaps);
    out.set(storeId, dailySeries(sales, days, now));
  }
  return out;
}

// Last N calendar months, zero-filled — useful for the 1Y range so
// every store's series has aligned buckets.
export function monthlyContiguous(
  sales: Sale[],
  months = 12,
  now = new Date(),
): { key: string; label: string; count: number }[] {
  const out: { key: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const startT = start.getTime();
    const endT = end.getTime();
    let count = 0;
    for (const s of sales) {
      if (s.t >= startT && s.t < endT) count += s.n;
    }
    out.push({
      key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      count,
    });
  }
  return out;
}

export function weeklySeriesPerStore(
  snapsByStore: Map<string, Snapshot[]>,
  weeks: number,
  now = new Date(),
): Map<string, { key: string; label: string; count: number }[]> {
  const out = new Map<string, { key: string; label: string; count: number }[]>();
  for (const [storeId, snaps] of snapsByStore) {
    out.set(storeId, weeklySeries(snapshotsToSales(snaps), weeks, now));
  }
  return out;
}

export function monthlySeriesPerStore(
  snapsByStore: Map<string, Snapshot[]>,
  months = 12,
  now = new Date(),
): Map<string, { key: string; label: string; count: number }[]> {
  const out = new Map<string, { key: string; label: string; count: number }[]>();
  for (const [storeId, snaps] of snapsByStore) {
    out.set(storeId, monthlyContiguous(snapshotsToSales(snaps), months, now));
  }
  return out;
}

// Per-store hour-of-week — returns one 7x24 grid per store_id.
export function hourOfWeekPerStore(
  snapsByStore: Map<string, Snapshot[]>,
): Map<string, number[][]> {
  const out = new Map<string, number[][]>();
  for (const [storeId, snaps] of snapsByStore) {
    out.set(storeId, salesByHourOfWeek(snapshotsToSales(snaps)));
  }
  return out;
}

// Sparkline: last `days` days of counts, normalized to [0..1].
// Returns the values array AND the max so callers can label it.
export function sparkline(
  sales: Sale[],
  days = 14,
  now = new Date(),
): { values: number[]; max: number } {
  const series = dailySeries(sales, days, now);
  const values = series.map((s) => s.count);
  const max = Math.max(1, ...values);
  return { values, max };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
