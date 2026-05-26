"use client";

import { useState, useMemo } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import type { Snapshot, Store } from "@/lib/stats";
import { formatMoneyMinor, groupSnapshots } from "@/lib/stats";
import {
  bestDayThisMonth,
  dailySeries,
  salesByHourOfWeek,
  salesByMonth,
  snapshotsToSales,
} from "@/lib/analytics";

type Range = "7d" | "30d" | "month";

export default function StatsView({
  stores,
  snapshots,
}: {
  stores: Store[];
  snapshots: Snapshot[];
}) {
  const [storeId, setStoreId] = useState<string>("all");
  const [range, setRange] = useState<Range>("30d");

  const snapsByStore = useMemo(() => groupSnapshots(snapshots), [snapshots]);
  const filtered =
    storeId === "all" ? snapshots : snapsByStore.get(storeId) ?? [];
  const sales = useMemo(() => snapshotsToSales(filtered), [filtered]);

  const selectedStore = stores.find((s) => s.id === storeId);
  const currency = selectedStore?.currency ?? "USD";
  const avg = selectedStore?.avg_price_minor ?? avgAcrossStores(stores);

  const days = range === "7d" ? 7 : 30;
  const series = useMemo(() => dailySeries(sales, days), [sales, days]);
  const heatmap = useMemo(() => salesByHourOfWeek(sales), [sales]);
  const best = useMemo(() => bestDayThisMonth(sales), [sales]);
  const monthTotals = useMemo(() => salesByMonth(sales), [sales]);

  const totalInRange = series.reduce((a, b) => a + b.count, 0);
  const monthTotal = range === "month" ? monthCount(sales) : null;
  const displayTotal = monthTotal ?? totalInRange;
  const displayRev = avg != null ? displayTotal * avg : 0;

  return (
    <>
      <h1 className="text-[26px] font-bold mt-5 mb-5 tracking-tight">Stats</h1>

      <div className="flex gap-2 mb-5 flex-wrap items-center animate-fade-up">
        <Select value={storeId} onChange={setStoreId}>
          <option value="all">All stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name || s.username}
            </option>
          ))}
        </Select>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {/* HEADLINE — stacked sold + earned, like overview */}
      <section className="glass px-6 py-10 sm:py-12 mb-4 text-center animate-fade-up">
        <AnimatedNumber
          value={displayTotal}
          className="num block text-[72px] sm:text-[88px] leading-[0.95] font-bold"
        />
        <div className="mt-3 text-[13px] text-text-2 font-medium">
          {range === "7d" && "sold last 7 days"}
          {range === "30d" && "sold last 30 days"}
          {range === "month" && "sold this month"}
        </div>

        {avg != null && (
          <>
            <AnimatedNumber
              value={displayRev}
              format="money"
              currency={currency}
              className="num block text-[36px] sm:text-[44px] leading-none font-semibold text-money mt-8"
            />
            <div className="mt-2.5 text-[13px] text-text-2 font-medium">
              {range === "7d" && "earned last 7 days"}
              {range === "30d" && "earned last 30 days"}
              {range === "month" && "earned this month"}
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

      <section
        className="glass p-6 mb-4 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <div className="text-[13px] text-text-2 mb-4 font-semibold tracking-tight">
          {range === "7d" ? "Last 7 days" : "Last 30 days"}
        </div>
        <BarChart data={series} />
      </section>

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

function monthCount(sales: { t: number; n: number }[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return sales
    .filter((s) => s.t >= start && s.t < end)
    .reduce((a, b) => a + b.n, 0);
}

function avgAcrossStores(stores: Store[]): number | null {
  const withPrices = stores.filter((s) => s.avg_price_minor != null);
  if (withPrices.length === 0) return null;
  return Math.round(
    withPrices.reduce((a, s) => a + (s.avg_price_minor ?? 0), 0) /
      withPrices.length,
  );
}

function BarChart({
  data,
}: {
  data: { date: string; label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center group">
          <div
            className="w-full rounded-md bg-gradient-to-t from-white/55 to-white/90 group-hover:from-white/75 group-hover:to-white transition-all duration-200"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? "3px" : "0",
              animation: `fadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${i * 18}ms both`,
            }}
            title={`${d.label}: ${d.count}`}
          />
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

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/[0.04] border border-line-strong rounded-full px-4 py-2 text-[13px] font-semibold text-white outline-none cursor-pointer hover:bg-white/[0.07] transition-colors"
    >
      {children}
    </select>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  const opts: { v: Range; label: string }[] = [
    { v: "7d", label: "7d" },
    { v: "30d", label: "30d" },
    { v: "month", label: "Month" },
  ];
  return (
    <div className="flex gap-0.5 bg-white/[0.04] border border-line p-0.5 rounded-full">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-300 ease-ios-spring ${
            value === o.v
              ? "bg-white text-[#0A0A0B] shadow-[0_2px_8px_-2px_rgba(255,255,255,0.25)]"
              : "text-text-2 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
