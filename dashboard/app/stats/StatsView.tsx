"use client";

import { useState, useMemo } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Dropdown from "@/components/Dropdown";
import type { Snapshot, Store } from "@/lib/stats";
import { formatMoneyMinor, groupSnapshots } from "@/lib/stats";
import {
  bestDayThisMonth,
  dailySeries,
  dailySeriesPerStore,
  hourOfWeekPerStore,
  monthlyContiguous,
  monthlySeriesPerStore,
  salesByHourOfWeek,
  salesByMonth,
  snapshotsToSales,
  weeklySeries,
  weeklySeriesPerStore,
} from "@/lib/analytics";
import { colorForStore } from "@/lib/colors";

type Range = "7d" | "1m" | "3m" | "1y";
type ChartKind = "bar" | "line";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "1y", label: "1Y" },
];

const CHART_OPTIONS: { value: ChartKind; label: string }[] = [
  { value: "bar", label: "Bars" },
  { value: "line", label: "Line" },
];

export default function StatsView({
  stores,
  snapshots,
}: {
  stores: Store[];
  snapshots: Snapshot[];
}) {
  const [storeId, setStoreId] = useState<string>("all");
  const [range, setRange] = useState<Range>("1m");
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const snapsByStore = useMemo(() => groupSnapshots(snapshots), [snapshots]);
  const filtered =
    storeId === "all" ? snapshots : snapsByStore.get(storeId) ?? [];
  const sales = useMemo(() => snapshotsToSales(filtered), [filtered]);

  const selectedStore = stores.find((s) => s.id === storeId);
  const currency = selectedStore?.currency ?? "USD";
  const avg = selectedStore?.avg_price_minor ?? avgAcrossStores(stores);
  const accent = selectedStore ? colorForStore(selectedStore) : null;

  const series = useMemo(() => {
    if (range === "7d") return dailySeries(sales, 7);
    if (range === "1m") return dailySeries(sales, 30);
    if (range === "3m") return weeklySeries(sales, 12);
    return monthlyContiguous(sales, 12);
  }, [sales, range]);

  const heatmap = useMemo(() => salesByHourOfWeek(sales), [sales]);
  const best = useMemo(() => bestDayThisMonth(sales), [sales]);
  const monthTotals = useMemo(() => salesByMonth(sales), [sales]);

  const totalInRange = series.reduce((a, b) => a + b.count, 0);
  const totalRev = avg != null ? totalInRange * avg : 0;

  const storeOptions = [
    { value: "all", label: "All stores" },
    { value: "compare", label: "Compare stores" },
    ...stores.map((s) => ({
      value: s.id,
      label: s.username,
    })),
  ];

  const isCompare = storeId === "compare";

  // Per-store series for Compare mode, bucketed to match the range.
  const perStoreSeries = useMemo(() => {
    if (!isCompare) return null;
    if (range === "7d") return dailySeriesPerStore(snapsByStore, 7);
    if (range === "1m") return dailySeriesPerStore(snapsByStore, 30);
    if (range === "3m") return weeklySeriesPerStore(snapsByStore, 12);
    return monthlySeriesPerStore(snapsByStore, 12);
  }, [isCompare, snapsByStore, range]);

  const perStoreHeatmap = useMemo(() => {
    if (!isCompare) return null;
    return hourOfWeekPerStore(snapsByStore);
  }, [isCompare, snapsByStore]);

  // For the Compare leaderboard: totals per store across the range.
  const compareTotals = useMemo(() => {
    if (!isCompare || !perStoreSeries) return [];
    const rows = stores.map((s) => {
      const ser = perStoreSeries.get(s.id) ?? [];
      const count = ser.reduce((a, b) => a + b.count, 0);
      const rev = s.avg_price_minor != null ? count * s.avg_price_minor : null;
      return { store: s, count, rev };
    });
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [isCompare, perStoreSeries, stores]);

  const rangeLabel = {
    "7d": "last 7 days",
    "1m": "last month",
    "3m": "last 3 months",
    "1y": "last year",
  }[range];

  const selected = selectedBar != null ? series[selectedBar] : null;

  return (
    <>
      <h1 className="text-[24px] sm:text-[26px] font-bold mt-3 mb-3 tracking-tight">Stats</h1>

      <div className="flex gap-2 mb-3 flex-wrap items-center animate-fade-up">
        <Dropdown value={storeId} options={storeOptions} onChange={setStoreId} />
        <Dropdown<Range>
          value={range}
          options={RANGE_OPTIONS}
          onChange={(v) => {
            setRange(v);
            setSelectedBar(null);
          }}
        />
        <Dropdown<ChartKind>
          value={chartKind}
          options={CHART_OPTIONS}
          onChange={setChartKind}
        />
      </div>

      {/* HEADLINE — compare mode shows a leaderboard, else big totals */}
      {isCompare ? (
        <section className="glass px-5 sm:px-6 py-5 mb-3 animate-fade-up">
          <div className="text-[11px] text-text-3 mb-3 font-semibold tracking-wider uppercase">
            Leaderboard · {rangeLabel}
          </div>
          {compareTotals.length === 0 ? (
            <div className="text-[13px] text-text-3 py-2">No stores yet.</div>
          ) : (
            <div className="space-y-2">
              {compareTotals.map(({ store, count, rev }, i) => (
                <LeaderRow
                  key={store.id}
                  rank={i + 1}
                  store={store}
                  count={count}
                  rev={rev}
                  max={compareTotals[0]?.count ?? 1}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="glass px-6 py-9 sm:py-10 mb-3 text-center animate-fade-up">
          <AnimatedNumber
            value={totalInRange}
            format="count"
            className="num block text-[72px] sm:text-[88px] leading-[0.95] font-bold"
          />
          <div className="mt-3 text-[13px] text-text-2 font-medium">
            sold {rangeLabel}
          </div>

          {avg != null && (
            <>
              <AnimatedNumber
                value={totalRev}
                format="money"
                currency={currency}
                className="num block text-[36px] sm:text-[44px] leading-none font-semibold text-money mt-7"
              />
              <div className="mt-2.5 text-[13px] text-text-2 font-medium">
                earned {rangeLabel}
              </div>
            </>
          )}

          {best && (
            <div className="mt-6 pt-4 border-t border-line text-[13px]">
              <span className="text-text-3">Best day this month — </span>
              <span className="num text-white font-semibold">
                {best.count.toLocaleString("en-US")}
              </span>
              <span className="text-text-3">
                {" "}on{" "}
                {best.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </section>
      )}

      {/* MAIN CHART */}
      <section
        className="glass p-5 sm:p-6 mb-2.5 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex justify-between items-baseline mb-1">
          <div className="text-[13px] text-text-2 font-semibold tracking-tight">
            Sales
          </div>
          <div className="text-[11px] text-text-3 font-medium">{rangeLabel}</div>
        </div>

        {/* Selected bar callout */}
        <div className="h-7 flex items-center text-[12px] mb-3">
          {selected ? (
            <div className="flex items-baseline gap-2 animate-fade-in">
              <span className="text-text-3">{selected.label}</span>
              <span className="num font-semibold text-white text-[15px]">
                {selected.count}
              </span>
              {avg != null && selected.count > 0 && (
                <span className="num-tight text-money-soft font-semibold">
                  {formatMoneyMinor(selected.count * avg, currency)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-text-3 text-[11.5px]">
              Tap a bar to see details
            </span>
          )}
        </div>

        {isCompare && perStoreSeries ? (
          <>
            {chartKind === "bar" ? (
              <CompareBarChart
                stores={stores}
                perStoreSeries={perStoreSeries}
                days={range === "7d" ? 7 : range === "1m" ? 30 : 12}
              />
            ) : (
              <CompareLineChart
                stores={stores}
                perStoreSeries={perStoreSeries}
              />
            )}
            <Legend stores={stores} />
          </>
        ) : chartKind === "bar" ? (
          <Chart
            data={series}
            selected={selectedBar}
            onSelect={(i) => setSelectedBar(selectedBar === i ? null : i)}
            accent={accent}
          />
        ) : (
          <LineChart
            data={series}
            selected={selectedBar}
            onSelect={(i) => setSelectedBar(selectedBar === i ? null : i)}
            accent={accent ?? "#ffffff"}
          />
        )}
      </section>

      {/* HEATMAP */}
      <section
        className="glass p-5 sm:p-6 mb-2.5 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="text-[13px] text-text-2 mb-1 font-semibold tracking-tight">
          When you sell
        </div>
        <div className="text-[11.5px] text-text-3 mb-5">
          Hours of day × days of week
        </div>
        {isCompare && perStoreHeatmap ? (
          <CompareHeatmap stores={stores} grids={perStoreHeatmap} />
        ) : (
          <Heatmap grid={heatmap} />
        )}
        {isCompare && (
          <Legend stores={stores} />
        )}
      </section>

      {/* MONTHLY LIST */}
      {monthTotals.length > 1 && (
        <section
          className="glass p-5 sm:p-6 animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="text-[13px] text-text-2 mb-2 font-semibold tracking-tight">
            By month
          </div>
          <div className="divide-y divide-line">
            {monthTotals
              .slice(-12)
              .reverse()
              .map((m) => (
                <div
                  key={m.key}
                  className="flex justify-between items-baseline py-3 text-[14px]"
                >
                  <span className="text-text-2">{m.label}</span>
                  <div className="text-right">
                    <span className="num font-semibold">
                      {m.count.toLocaleString("en-US")}
                    </span>
                    {avg != null && (
                      <span className="num-tight text-[12px] text-money-soft ml-2.5 font-semibold">
                        {formatMoneyMinor(m.count * avg, currency)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {sales.length === 0 && (
        <div className="text-[13px] text-text-3 text-center mt-8 leading-relaxed">
          No sales recorded yet.
          <br />
          Once the extension polls a few times, stats fill in.
        </div>
      )}
    </>
  );
}

function avgAcrossStores(stores: Store[]): number | null {
  const withPrices = stores.filter((s) => s.avg_price_minor != null);
  if (withPrices.length === 0) return null;
  return Math.round(
    withPrices.reduce((a, s) => a + (s.avg_price_minor ?? 0), 0) /
      withPrices.length,
  );
}

function Chart({
  data,
  selected,
  onSelect,
  accent,
}: {
  data: { key?: string; date?: string; label: string; count: number }[];
  selected: number | null;
  onSelect: (i: number) => void;
  accent?: string | null;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const labelStride = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  const tint = accent ?? null;

  return (
    <div>
      <div className="flex items-end gap-1 h-44 sm:h-48">
        {data.map((d, i) => {
          const h = (d.count / max) * 100;
          const isSelected = selected === i;
          const barStyle: React.CSSProperties = {
            height: `${h}%`,
            minHeight: d.count > 0 ? "4px" : "0",
            animation: `fadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${i * 22}ms both`,
          };
          if (isSelected) {
            barStyle.background = tint ?? "#34D399";
            barStyle.boxShadow = `0 0 18px -4px ${tint ?? "#34D399"}aa`;
          } else if (tint) {
            barStyle.background = `linear-gradient(to top, ${tint}88 0%, ${tint} 100%)`;
          }
          return (
            <button
              key={d.key ?? d.date ?? d.label + i}
              onClick={() => onSelect(i)}
              className="flex-1 h-full flex flex-col justify-end group focus:outline-none"
            >
              <div
                className={`w-full rounded-md transition-all duration-300 ease-ios-spring ${
                  !tint && !isSelected
                    ? "bg-gradient-to-t from-white/55 to-white/90 group-hover:from-white/75 group-hover:to-white"
                    : ""
                }`}
                style={barStyle}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div
            key={(d.key ?? d.date ?? d.label) + "-lbl"}
            className="flex-1 text-[9.5px] text-text-3/80 text-center font-medium truncate"
          >
            {i % labelStride === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({
  data,
  selected,
  onSelect,
  accent,
}: {
  data: { key?: string; date?: string; label: string; count: number }[];
  selected: number | null;
  onSelect: (i: number) => void;
  accent: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 600;
  const h = 180;
  const padX = 8;
  const padY = 14;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + usableH - (d.count / max) * usableH;
    return [x, y] as const;
  });

  const path = smoothPath(points);

  const areaPath = points.length
    ? `${path} L ${points[points.length - 1][0]},${h} L ${points[0][0]},${h} Z`
    : "";

  const labelStride = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  const gradId = `line-fill-${Math.abs(
    accent.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0),
  )}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-44 sm:h-48"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map(([x, y], i) => {
          const isSel = selected === i;
          return (
            <g key={data[i].key ?? data[i].date ?? i}>
              <circle
                cx={x}
                cy={y}
                r={isSel ? 5 : 2.5}
                fill={isSel ? accent : "#0A0A0B"}
                stroke={accent}
                strokeWidth={isSel ? 2 : 1.5}
                style={{
                  filter: isSel ? `drop-shadow(0 0 6px ${accent})` : undefined,
                }}
              />
              {/* Invisible larger hit target for tapping */}
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="transparent"
                onClick={() => onSelect(i)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div
            key={(d.key ?? d.date ?? d.label) + "-lbl"}
            className="flex-1 text-[9.5px] text-text-3/80 text-center font-medium truncate"
          >
            {i % labelStride === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// Catmull-Rom → cubic Bezier with control points clamped to the data
// range. Without the clamp, sharp transitions (e.g. 0 → 0 → spike →
// 0 → 0) cause the curve to overshoot below the baseline. The clamp
// keeps the curve within the actual min/max Y of the data so it can
// never render below "zero sales".
function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  const tension = 0.22;
  // SVG Y is inverted (down is larger). The "baseline" is the largest Y.
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const clamp = (y: number) => Math.max(minY, Math.min(maxY, y));
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = clamp(p1[1] + (p2[1] - p0[1]) * tension);
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = clamp(p2[1] - (p3[1] - p1[1]) * tension);
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function LeaderRow({
  rank,
  store,
  count,
  rev,
  max,
}: {
  rank: number;
  store: Store;
  count: number;
  rev: number | null;
  max: number;
}) {
  const tint = colorForStore(store);
  const widthPct = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-line">
      {/* Filled bar background using the store's color, sized by share */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{
          width: `${widthPct}%`,
          background: `linear-gradient(90deg, ${tint}33 0%, ${tint}1a 100%)`,
        }}
      />
      <div className="relative flex items-center gap-3 px-3 py-2.5">
        <span
          className="num text-[12px] font-bold text-text-3 w-5 text-center flex-shrink-0"
        >
          {rank}
        </span>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: tint, boxShadow: `0 0 8px ${tint}99` }}
        />
        <span className="text-[14px] font-semibold truncate flex-1">
          {store.username}
        </span>
        <div className="text-right flex-shrink-0">
          <div className="num text-[16px] font-semibold leading-none">
            {count.toLocaleString("en-US")}
          </div>
          {rev != null && rev > 0 && (
            <div className="num-tight text-[10.5px] text-money-soft mt-0.5 font-semibold">
              {formatMoneyMinor(rev, store.currency)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === Compare-mode components: stacked bars, multi-line, multi-color heatmap ===

function CompareBarChart({
  stores,
  perStoreSeries,
  days,
}: {
  stores: Store[];
  perStoreSeries: Map<string, { key: string; label: string; count: number }[]>;
  days: number;
}) {
  // Build a per-day array of { storeId → count } over the right window.
  // Each per-store series has `days` length already (or fewer for monthly).
  const length = days;
  const dayLabels: string[] = [];
  const stacked: { store: Store; count: number }[][] = [];
  for (let i = 0; i < length; i++) stacked.push([]);

  for (const store of stores) {
    const series = perStoreSeries.get(store.id) ?? [];
    for (let i = 0; i < length; i++) {
      const point = series[series.length - length + i] ?? series[i];
      if (!point) continue;
      if (!dayLabels[i]) dayLabels[i] = point.label;
      stacked[i].push({ store, count: point.count });
    }
  }

  const totalsPerDay = stacked.map((arr) => arr.reduce((a, b) => a + b.count, 0));
  const max = Math.max(1, ...totalsPerDay);
  const labelStride = length > 14 ? Math.ceil(length / 7) : 1;

  return (
    <div>
      <div className="flex items-end gap-1 h-44 sm:h-48">
        {stacked.map((seg, i) => {
          const total = totalsPerDay[i];
          const heightPct = (total / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 h-full flex flex-col justify-end"
            >
              <div
                className="w-full rounded-md overflow-hidden flex flex-col-reverse"
                style={{
                  height: `${heightPct}%`,
                  minHeight: total > 0 ? "4px" : "0",
                  animation: `fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 22}ms both`,
                }}
              >
                {seg
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <div
                      key={s.store.id}
                      style={{
                        height: `${(s.count / total) * 100}%`,
                        background: colorForStore(s.store),
                      }}
                      title={`${s.store.username}: ${s.count}`}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {dayLabels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-[9.5px] text-text-3/80 text-center font-medium truncate"
          >
            {i % labelStride === 0 ? label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareLineChart({
  stores,
  perStoreSeries,
}: {
  stores: Store[];
  perStoreSeries: Map<string, { key: string; label: string; count: number }[]>;
}) {
  // All series should have the same length and labels — take the first.
  const firstSeries = perStoreSeries.values().next().value ??
    ([] as { date: string; label: string; count: number }[]);
  const length = firstSeries.length;
  if (length === 0) return null;

  const w = 600;
  const h = 180;
  const padX = 8;
  const padY = 14;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;
  const stepX = length > 1 ? usableW / (length - 1) : 0;

  // Max across all stores at any single day, for shared Y-scale.
  let max = 1;
  for (const series of perStoreSeries.values()) {
    for (const pt of series) if (pt.count > max) max = pt.count;
  }

  const labelStride = length > 14 ? Math.ceil(length / 7) : 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-44 sm:h-48"
        preserveAspectRatio="none"
      >
        {stores.map((store) => {
          const series = perStoreSeries.get(store.id) ?? [];
          if (series.length === 0) return null;
          const color = colorForStore(store);
          const points = series.map((d, i) => {
            const x = padX + i * stepX;
            const y = padY + usableH - (d.count / max) * usableH;
            return [x, y] as const;
          });
          const path = smoothPath(points);
          return (
            <g key={store.id}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2}
                  fill={color}
                  opacity={0.85}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-1 mt-2">
        {firstSeries.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-[9.5px] text-text-3/80 text-center font-medium truncate"
          >
            {i % labelStride === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareHeatmap({
  stores,
  grids,
}: {
  stores: Store[];
  grids: Map<string, number[][]>;
}) {
  // Per (day, hour) cell, sum across stores → intensity; split colors
  // by each store's contribution.
  const totalGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const grid of grids.values()) {
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) totalGrid[d][h] += grid[d][h];
    }
  }
  const max = Math.max(1, ...totalGrid.flat());

  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "18px repeat(24, 1fr)" }}
      >
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-[9px] text-text-3/70 text-center font-medium">
            {h % 6 === 0 ? h : ""}
          </div>
        ))}
        {totalGrid.map((row, day) => (
          <div key={day} className="contents">
            <div className="text-[10.5px] text-text-3 flex items-center justify-center font-semibold">
              {DAY_LABELS[day]}
            </div>
            {row.map((total, hour) => {
              if (total === 0) {
                return (
                  <div
                    key={hour}
                    className="aspect-square rounded-[3px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  />
                );
              }
              const intensity = total / max;
              return (
                <div
                  key={hour}
                  className="aspect-square rounded-[3px] overflow-hidden flex"
                  style={{ opacity: 0.35 + intensity * 0.65 }}
                  title={stores
                    .map((s) => {
                      const c = grids.get(s.id)?.[day][hour] ?? 0;
                      return c > 0 ? `${s.username}: ${c}` : null;
                    })
                    .filter(Boolean)
                    .join("\n")}
                >
                  {stores.map((s) => {
                    const c = grids.get(s.id)?.[day][hour] ?? 0;
                    if (c === 0) return null;
                    return (
                      <div
                        key={s.id}
                        style={{
                          flex: c,
                          background: colorForStore(s),
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ stores }: { stores: Store[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
      {stores.map((s) => (
        <div key={s.id} className="inline-flex items-center gap-1.5 text-[11px]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: colorForStore(s) }}
          />
          <span className="text-text-2">{s.username}</span>
        </div>
      ))}
    </div>
  );
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "18px repeat(24, 1fr)" }}
      >
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-[9px] text-text-3/70 text-center font-medium">
            {h % 6 === 0 ? h : ""}
          </div>
        ))}
        {grid.map((row, day) => (
          <div key={day} className="contents">
            <div className="text-[10.5px] text-text-3 flex items-center justify-center font-semibold">
              {DAY_LABELS[day]}
            </div>
            {row.map((count, hour) => {
              const intensity = max > 0 ? count / max : 0;
              const opacity = count === 0 ? 0.04 : 0.18 + intensity * 0.78;
              return (
                <div
                  key={hour}
                  className="aspect-square rounded-[3px] transition-transform duration-200 hover:scale-125"
                  style={{ backgroundColor: `rgba(255,255,255,${opacity})` }}
                  title={`${DAY_LABELS[day]} ${hour}:00 — ${count} sales`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-text-3 justify-end">
        <span>less</span>
        {[0.04, 0.25, 0.5, 0.75, 0.96].map((o) => (
          <div
            key={o}
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: `rgba(255,255,255,${o})` }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
