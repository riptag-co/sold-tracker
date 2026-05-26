"use client";

import { useState, useMemo } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Dropdown from "@/components/Dropdown";
import type { Snapshot, Store } from "@/lib/stats";
import { formatMoneyMinor, groupSnapshots } from "@/lib/stats";
import {
  bestDayThisMonth,
  dailySeries,
  salesByHourOfWeek,
  salesByMonth,
  snapshotsToSales,
  weeklySeries,
} from "@/lib/analytics";
import { colorForStore } from "@/lib/colors";

type Range = "7d" | "30d" | "12w" | "12m";
type ChartKind = "bar" | "line";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "12w", label: "12W" },
  { value: "12m", label: "12M" },
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
  const [range, setRange] = useState<Range>("30d");
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
    if (range === "30d") return dailySeries(sales, 30);
    if (range === "12w") return weeklySeries(sales, 12);
    return salesByMonth(sales).slice(-12);
  }, [sales, range]);

  const heatmap = useMemo(() => salesByHourOfWeek(sales), [sales]);
  const best = useMemo(() => bestDayThisMonth(sales), [sales]);
  const monthTotals = useMemo(() => salesByMonth(sales), [sales]);

  const totalInRange = series.reduce((a, b) => a + b.count, 0);
  const totalRev = avg != null ? totalInRange * avg : 0;

  const storeOptions = [
    { value: "all", label: "All stores" },
    ...stores.map((s) => ({
      value: s.id,
      label: s.username,
    })),
  ];

  const rangeLabel = {
    "7d": "last 7 days",
    "30d": "last 30 days",
    "12w": "last 12 weeks",
    "12m": "last 12 months",
  }[range];

  const selected = selectedBar != null ? series[selectedBar] : null;

  return (
    <>
      <h1 className="text-[26px] font-bold mt-5 mb-5 tracking-tight">Stats</h1>

      <div className="flex gap-2 mb-5 flex-wrap items-center animate-fade-up">
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

      {/* HEADLINE */}
      <section className="glass px-6 py-10 sm:py-12 mb-4 text-center animate-fade-up">
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
              className="num block text-[36px] sm:text-[44px] leading-none font-semibold text-money mt-8"
            />
            <div className="mt-2.5 text-[13px] text-text-2 font-medium">
              earned {rangeLabel}
            </div>
          </>
        )}

        {best && (
          <div className="mt-7 pt-5 border-t border-line text-[13px]">
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

      {/* MAIN CHART */}
      <section
        className="glass p-6 mb-4 animate-fade-up"
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

        {chartKind === "bar" ? (
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
        className="glass p-6 mb-4 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="text-[13px] text-text-2 mb-1 font-semibold tracking-tight">
          When you sell
        </div>
        <div className="text-[11.5px] text-text-3 mb-5">
          Hours of day × days of week
        </div>
        <Heatmap grid={heatmap} />
      </section>

      {/* MONTHLY LIST */}
      {monthTotals.length > 1 && (
        <section
          className="glass p-6 animate-fade-up"
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

  // Smooth Catmull-Rom-ish curve through points.
  let path = "";
  if (points.length > 0) {
    path = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      const [px, py] = points[i - 1];
      const cpx = (px + x) / 2;
      path += ` Q ${cpx},${py} ${x},${y}`;
    }
  }

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
