"use client";

import { useEffect } from "react";
import Sparkline from "./Sparkline";
import {
  computeStoreStats,
  formatMoneyMinor,
  type Snapshot,
  type Store,
} from "@/lib/stats";
import { snapshotsToSales, sparkline, isOnFire } from "@/lib/analytics";
import { colorForStore, colorForUsername } from "@/lib/colors";
import Flame from "./Flame";

export default function StoreSheet({
  store,
  snapshots,
  onClose,
}: {
  store: Store;
  snapshots: Snapshot[];
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const stats = computeStoreStats(snapshots, null, store.avg_price_minor);
  const sales = snapshotsToSales(snapshots);
  const spark = sparkline(sales, 30);
  const fire = isOnFire(sales);
  const color = colorForStore(store);
  const label = store.display_name || store.username;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — anchored to bottom on mobile, centered modal on larger */}
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="glass !rounded-t-3xl sm:!rounded-3xl max-w-md mx-auto p-6 pb-8 animate-sheet-up sm:animate-scale-in"
          style={{ boxShadow: `0 -20px 60px -20px ${colorForUsername(store.username, 0.35)}` }}
        >
          {/* Sheet handle (mobile) */}
          <div className="sm:hidden flex justify-center -mt-2 mb-3">
            <div className="w-9 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: color, boxShadow: `0 0 10px ${colorForUsername(store.username, 0.6)}` }}
                />
                <h2 className="text-[20px] font-bold tracking-tight truncate">{label}</h2>
                {fire.onFire && <Flame size={14} />}
              </div>
              <a
                href={`https://www.depop.com/${encodeURIComponent(store.username)}/`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-text-3 hover:text-white transition-colors block mt-0.5"
              >
                depop.com/{store.username}
              </a>
            </div>
            <button
              onClick={onClose}
              className="ghost !px-3 !py-1.5 text-[12px]"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <Tile label="Today" value={stats.today} money={stats.todayRevenue} currency={store.currency} />
            <Tile label="Week" value={stats.week} money={stats.weekRevenue} currency={store.currency} />
            <Tile label="Month" value={stats.month} money={stats.monthRevenue} currency={store.currency} />
          </div>

          {/* Sparkline */}
          <div className="mb-3">
            <div className="text-[11px] text-text-3 mb-2 font-medium">Last 30 days</div>
            <Sparkline values={spark.values} color={color} width={400} height={56} className="w-full" />
          </div>

          {/* Lifetime + on-fire context */}
          <div className="pt-4 border-t border-line space-y-1.5 text-[13px]">
            <Row left="Lifetime sold" right={(stats.totalSold ?? 0).toLocaleString("en-US")} />
            {fire.avg > 0 && (
              <Row
                left="14-day daily avg"
                right={fire.avg.toFixed(1)}
              />
            )}
            {fire.onFire && (
              <div className="text-[12.5px] text-[#FF9A3C] font-semibold mt-2">
                On fire — {Math.round(fire.ratio * 100)}% of normal pace.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  money,
  currency,
}: {
  label: string;
  value: number;
  money: number | null;
  currency: string;
}) {
  return (
    <div className="bg-white/[0.04] border border-line rounded-2xl p-3.5 text-center">
      <div className="num text-[22px] font-bold leading-none">
        {value.toLocaleString("en-US")}
      </div>
      {money != null && money > 0 ? (
        <div className="num-tight text-[11px] text-money-soft font-semibold mt-1.5">
          {formatMoneyMinor(money, currency)}
        </div>
      ) : (
        <div className="text-[11px] text-text-3 mt-1.5">{label.toLowerCase()}</div>
      )}
      <div className="text-[10px] text-text-3 mt-0.5 font-medium uppercase tracking-wider">
        {money != null && money > 0 ? label : ""}
      </div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-text-3">{left}</span>
      <span className="num font-semibold">{right}</span>
    </div>
  );
}
