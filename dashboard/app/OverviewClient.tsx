"use client";

import { useMemo, useRef, useState } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import StoreSheet from "@/components/StoreSheet";
import Flame from "@/components/Flame";
import PeriodPicker, { type Period } from "@/components/PeriodPicker";
import RefreshButton from "@/components/RefreshButton";
import {
  computeStoreStats,
  formatMoneyMinor,
  groupSnapshots,
  type Snapshot,
  type Store,
  type StoreError,
} from "@/lib/stats";
import {
  bestDayThisMonth,
  isOnFire,
  paceProjection,
  snapshotsToSales,
} from "@/lib/analytics";
import { colorForStore } from "@/lib/colors";

const LONG_PRESS_MS = 500;

type MainGoal = {
  id: string;
  store_id: string | null;
  period: "day" | "week" | "month";
  metric: "sales" | "revenue";
  target: number;
} | null;

export default function OverviewClient({
  stores,
  snapshots,
  errors,
  mainGoal,
}: {
  stores: Store[];
  snapshots: Snapshot[];
  errors: StoreError[];
  mainGoal: MainGoal;
}) {
  const [period, setPeriod] = useState<Period>("day");

  const snapsByStore = useMemo(() => groupSnapshots(snapshots), [snapshots]);
  const errByStore = useMemo(
    () => new Map(errors.map((e) => [e.store_id, e])),
    [errors],
  );

  const perStore = useMemo(
    () =>
      stores
        .map((s) => {
          const sn = snapsByStore.get(s.id) ?? [];
          const stats = computeStoreStats(
            sn,
            errByStore.get(s.id) ?? null,
            s.avg_price_minor,
          );
          const sales = snapshotsToSales(sn);
          const fire = isOnFire(sales);
          return { store: s, stats, fire };
        })
        .sort((a, b) => pickStatCount(b.stats, period) - pickStatCount(a.stats, period)),
    [stores, snapsByStore, errByStore, period],
  );

  const periodCount = perStore.reduce(
    (a, s) => a + pickStatCount(s.stats, period),
    0,
  );
  const periodRev = perStore.reduce(
    (a, s) => a + (pickStatRevenue(s.stats, period) ?? 0),
    0,
  );

  const allSales = useMemo(() => snapshotsToSales(snapshots), [snapshots]);
  const pace = useMemo(() => paceProjection(allSales), [allSales]);
  const best = useMemo(() => bestDayThisMonth(allSales), [allSales]);

  // Main goal progress — used to draw the ring around the period picker.
  const mainGoalProgress = useMemo(() => {
    if (!mainGoal) return null;
    let count = 0;
    let revenue = 0;
    const relevant = mainGoal.store_id
      ? stores.filter((s) => s.id === mainGoal.store_id)
      : stores;
    for (const s of relevant) {
      const sn = snapsByStore.get(s.id) ?? [];
      const stats = computeStoreStats(sn, null, s.avg_price_minor);
      const c = pickStatCount(stats, mainGoal.period);
      count += c;
      revenue += pickStatRevenue(stats, mainGoal.period) ?? 0;
    }
    const value = mainGoal.metric === "revenue" ? revenue : count;
    return mainGoal.target > 0 ? value / mainGoal.target : 0;
  }, [mainGoal, stores, snapsByStore]);

  const mainGoalColor = useMemo(() => {
    if (!mainGoal) return undefined;
    if (mainGoal.store_id) {
      const s = stores.find((x) => x.id === mainGoal.store_id);
      if (s) return colorForStore(s);
    }
    return "#34D399";
  }, [mainGoal, stores]);

  const [sheetStoreId, setSheetStoreId] = useState<string | null>(null);
  const sheetStore = sheetStoreId
    ? stores.find((s) => s.id === sheetStoreId) ?? null
    : null;
  const sheetSnaps = sheetStoreId ? snapsByStore.get(sheetStoreId) ?? [] : [];

  const periodLabel =
    period === "day" ? "today" : period === "week" ? "this week" : "this month";

  return (
    <>
      <section className="glass mt-2 sm:mt-4 px-5 sm:px-8 pt-9 sm:pt-11 pb-2 animate-fade-up relative">
        {/* Top-left: period picker with main-goal progress ring */}
        <div className="absolute top-3 left-3">
          <PeriodPicker
            value={period}
            onChange={setPeriod}
            progress={mainGoalProgress}
            progressColor={mainGoalColor}
          />
        </div>

        {/* Top-right: refresh */}
        <div className="absolute top-3 right-3">
          <RefreshButton />
        </div>

        {/* HEADLINE — count */}
        <div className="text-center">
          <AnimatedNumber
            value={periodCount}
            format="count"
            className="num block text-[88px] sm:text-[104px] leading-[0.95] font-bold"
          />
          <div className="mt-3 text-[14px] text-text-2 font-medium">
            sold {periodLabel}
          </div>
        </div>

        {/* HEADLINE — money */}
        <div className="text-center mt-10">
          <AnimatedNumber
            value={periodRev}
            format="money"
            className="num block text-[48px] sm:text-[60px] leading-none font-semibold text-money"
          />
          <div className="mt-2.5 text-[14px] text-text-2 font-medium">
            earned {periodLabel}
          </div>
        </div>

        {((period === "day" && pace.basis !== "none") || best) && (
          <div className="mt-9 pt-5 border-t border-line space-y-2.5">
            {period === "day" &&
              pace.basis !== "none" &&
              pace.projected > pace.current && (
                <InfoRow
                  left="On pace for"
                  right={pace.projected.toLocaleString("en-US")}
                  rightSuffix="today"
                />
              )}
            {best && (
              <InfoRow
                left="Best day this month"
                right={best.count.toLocaleString("en-US")}
                rightSuffix={`on ${best.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                })}`}
              />
            )}
          </div>
        )}

        {/* PER-STORE BREAKDOWN — period aware */}
        <div className="mt-7 border-t border-line">
          {perStore.map(({ store, stats, fire }, i) => (
            <StoreRow
              key={store.id}
              store={store}
              stats={stats}
              period={period}
              onFire={fire.onFire}
              index={i}
              onLongPress={() => setSheetStoreId(store.id)}
            />
          ))}
        </div>
      </section>

      {sheetStore && (
        <StoreSheet
          store={sheetStore}
          snapshots={sheetSnaps}
          onClose={() => setSheetStoreId(null)}
        />
      )}
    </>
  );
}

function pickStatCount(
  stats: ReturnType<typeof computeStoreStats>,
  period: Period,
): number {
  return period === "day" ? stats.today : period === "week" ? stats.week : stats.month;
}

function pickStatRevenue(
  stats: ReturnType<typeof computeStoreStats>,
  period: Period,
): number | null {
  return period === "day"
    ? stats.todayRevenue
    : period === "week"
      ? stats.weekRevenue
      : stats.monthRevenue;
}

function StoreRow({
  store,
  stats,
  period,
  onFire,
  index,
  onLongPress,
}: {
  store: Store;
  stats: ReturnType<typeof computeStoreStats>;
  period: Period;
  onFire: boolean;
  index: number;
  onLongPress: () => void;
}) {
  const timer = useRef<number | null>(null);
  const moved = useRef(false);
  const label = store.username;
  const count = pickStatCount(stats, period);
  const rev = pickStatRevenue(stats, period) ?? 0;
  const hasError = !!stats.error;
  const tint = hasError ? "#F87171" : colorForStore(store);

  function startPress() {
    moved.current = false;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (!moved.current) {
        if ("vibrate" in navigator) navigator.vibrate(8);
        onLongPress();
      }
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative flex items-center justify-between gap-3 py-4 border-b border-line last:border-b-0 animate-fade-up cursor-pointer active:bg-white/[0.02] transition-colors select-none pl-3"
      style={{ animationDelay: `${60 + index * 40}ms` }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onPointerMove={() => {
        moved.current = true;
        cancelPress();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: tint, opacity: 0.85 }}
      />
      <div className="min-w-0 flex items-center gap-3">
        <FreshnessDot lastSeen={stats.lastSeen} hasError={hasError} tint={tint} />
        <div className="min-w-0">
          <div
            className="text-[16px] font-medium truncate tracking-tight flex items-center gap-1.5"
            style={hasError ? { color: "#F87171" } : undefined}
          >
            {label}
            {onFire && !hasError && <Flame size={11} />}
          </div>
          <div className="text-[12px] text-text-3 truncate mt-0.5">
            {hasError ? (
              <span style={{ color: "#FCA5A5" }}>
                Banned or blocked — {stats.error?.message}
              </span>
            ) : (
              <>depop.com/{store.username}</>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="num text-[20px] font-semibold">
          {count.toLocaleString("en-US")}
        </div>
        {rev > 0 && (
          <div className="text-[12px] text-money-soft num-tight mt-0.5 font-semibold">
            {formatMoneyMinor(rev, store.currency)}
          </div>
        )}
      </div>
    </div>
  );
}

function FreshnessDot({
  lastSeen,
  hasError,
  tint,
}: {
  lastSeen: number | null;
  hasError: boolean;
  tint: string;
}) {
  if (hasError) {
    return (
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: "#F87171",
          boxShadow: "0 0 8px rgba(248,113,113,0.7)",
        }}
      />
    );
  }
  const fresh = lastSeen && Date.now() - lastSeen < 15 * 60_000;
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: tint,
        boxShadow: fresh ? `0 0 8px ${tint}` : "none",
        opacity: fresh ? 1 : 0.45,
      }}
    />
  );
}

function InfoRow({
  left,
  right,
  rightSuffix,
}: {
  left: string;
  right: string;
  rightSuffix?: string;
}) {
  return (
    <div className="flex justify-between items-baseline text-[13px]">
      <span className="text-text-3">{left}</span>
      <span>
        <span className="num text-white font-semibold text-[16px]">{right}</span>
        {rightSuffix && (
          <span className="text-text-3 ml-1.5 font-medium">{rightSuffix}</span>
        )}
      </span>
    </div>
  );
}
