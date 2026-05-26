"use client";

import { useMemo, useRef, useState } from "react";
import AnimatedNumber from "@/components/AnimatedNumber";
import StoreSheet from "@/components/StoreSheet";
import Flame from "@/components/Flame";
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
import RefreshButton from "@/components/RefreshButton";

const LONG_PRESS_MS = 500;

export default function OverviewClient({
  stores,
  snapshots,
  errors,
}: {
  stores: Store[];
  snapshots: Snapshot[];
  errors: StoreError[];
}) {
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
        .sort((a, b) => b.stats.today - a.stats.today),
    [stores, snapsByStore, errByStore],
  );

  const todayCount = perStore.reduce((a, s) => a + s.stats.today, 0);
  const todayRev = perStore.reduce(
    (a, s) => a + (s.stats.todayRevenue ?? 0),
    0,
  );

  const allSales = useMemo(() => snapshotsToSales(snapshots), [snapshots]);
  const pace = useMemo(() => paceProjection(allSales), [allSales]);
  const best = useMemo(() => bestDayThisMonth(allSales), [allSales]);

  const [sheetStoreId, setSheetStoreId] = useState<string | null>(null);
  const sheetStore = sheetStoreId
    ? stores.find((s) => s.id === sheetStoreId) ?? null
    : null;
  const sheetSnaps = sheetStoreId ? snapsByStore.get(sheetStoreId) ?? [] : [];

  return (
    <>
      <div className="flex justify-end mt-3 mb-1">
        <RefreshButton />
      </div>
      <section className="glass px-6 sm:px-8 pt-11 pb-3 animate-fade-up">
        {/* TODAY COUNT */}
        <div className="text-center">
          <AnimatedNumber
            value={todayCount}
            format="count"
            className="num block text-[88px] sm:text-[104px] leading-[0.95] font-bold"
          />
          <div className="mt-3 text-[14px] text-text-2 font-medium">
            sold today
          </div>
        </div>

        {/* TODAY REVENUE — green */}
        <div className="text-center mt-10">
          <AnimatedNumber
            value={todayRev}
            format="money"
            className="num block text-[48px] sm:text-[60px] leading-none font-semibold text-money"
          />
          <div className="mt-2.5 text-[14px] text-text-2 font-medium">
            earned today
          </div>
        </div>

        {(pace.basis !== "none" || best) && (
          <div className="mt-9 pt-5 border-t border-line space-y-2.5">
            {pace.basis !== "none" && pace.projected > pace.current && (
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

        {/* PER-STORE BREAKDOWN — long-press → sheet */}
        <div className="mt-7 border-t border-line">
          {perStore.map(({ store, stats, fire }, i) => (
            <StoreRow
              key={store.id}
              store={store}
              stats={stats}
              onFire={fire.onFire}
              index={i}
              onLongPress={() => setSheetStoreId(store.id)}
            />
          ))}
        </div>
      </section>

      {errors.length > 0 && (
        <div className="mt-4 glass p-4 text-[13px] text-text-2 leading-relaxed animate-fade-up">
          <div className="text-text-3 mb-1.5 text-[11px] font-medium tracking-wide uppercase">
            Issues
          </div>
          {errors.map((e) => {
            const s = stores.find((x) => x.id === e.store_id);
            return (
              <div key={e.store_id} className="mt-1">
                <span className="font-medium">@{s?.username ?? "?"}</span>
                <span className="text-text-3"> — {e.message}</span>
              </div>
            );
          })}
        </div>
      )}

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

function StoreRow({
  store,
  stats,
  onFire,
  index,
  onLongPress,
}: {
  store: Store;
  stats: ReturnType<typeof computeStoreStats>;
  onFire: boolean;
  index: number;
  onLongPress: () => void;
}) {
  const timer = useRef<number | null>(null);
  const moved = useRef(false);
  const label = store.username;
  const revToday = stats.todayRevenue ?? 0;
  const hasError = !!stats.error;
  // On error we override the per-store tint with red so it pops.
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
      {/* Left tint bar */}
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
          {stats.today.toLocaleString("en-US")}
        </div>
        {revToday > 0 && (
          <div className="text-[12px] text-money-soft num-tight mt-0.5 font-semibold">
            {formatMoneyMinor(revToday, store.currency)}
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
