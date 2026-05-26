// Pure-math derivations from the snapshot stream. Snapshots are
// monotonic lifetime counters, so the number of sales between any two
// snapshots is just `c2 - c1`. We attribute that delta to the later
// snapshot's timestamp (close enough at 5-minute polling resolution).

import type { Snapshot } from "./stats";

export type Sale = { t: number; n: number };  // n sales at time t

// Flatten snapshots → individual sale events (one per non-zero delta
// between consecutive snapshots, attributed to the later timestamp).
export function snapshotsToSales(snaps: Snapshot[]): Sale[] {
  if (snaps.length < 2) return [];
  const sorted = [...snaps].sort(
    (a, b) => Date.parse(a.taken_at) - Date.parse(b.taken_at),
  );
  const sales: Sale[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].sold_count;
    const cur = sorted[i].sold_count;
    if (cur > prev) {
      sales.push({ t: Date.parse(sorted[i].taken_at), n: cur - prev });
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

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
