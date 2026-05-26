// Overview: hero with all-stores totals + per-store cards. Server
// component for fast first paint; a thin client wrapper subscribes to
// realtime snapshot inserts and refreshes via router.refresh().
import Link from "next/link";
import Nav from "@/components/Nav";
import LiveRefresh from "@/components/LiveRefresh";
import { createClient } from "@/lib/supabase/server";
import {
  computeStoreStats,
  fmtCount,
  formatMoneyMinor,
  groupSnapshots,
  relTime,
  type Snapshot,
  type Store,
  type StoreError,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: stores }, { data: snapshots }, { data: errors }] =
    await Promise.all([
      supabase
        .from("stores")
        .select("id, username, display_name, avg_price_minor, currency")
        .order("username"),
      supabase
        .from("snapshots")
        .select("store_id, sold_count, taken_at")
        .gte(
          "taken_at",
          new Date(Date.now() - 95 * 86_400_000).toISOString(),
        )
        .order("taken_at", { ascending: true }),
      supabase
        .from("fetch_errors")
        .select("store_id, message, occurred_at"),
    ]);

  const storeList: Store[] = stores ?? [];
  const snapList: Snapshot[] = snapshots ?? [];
  const errList: StoreError[] = errors ?? [];

  return (
    <>
      <Nav />
      <LiveRefresh />
      <main className="px-4 pb-10 max-w-3xl mx-auto">
        {storeList.length === 0 ? (
          <EmptyState />
        ) : (
          <Dashboard
            stores={storeList}
            snapshots={snapList}
            errors={errList}
          />
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="glass p-7 text-center animate-rise">
      <div className="text-base font-semibold mb-2">No shops yet</div>
      <p className="text-sm text-text-2 mb-5">
        Add the Depop usernames you want to track. After you pair the
        extension, it&apos;ll start polling them every few minutes.
      </p>
      <Link href="/stores" className="pill inline-block">Add shops</Link>
    </div>
  );
}

function Dashboard({
  stores,
  snapshots,
  errors,
}: {
  stores: Store[];
  snapshots: Snapshot[];
  errors: StoreError[];
}) {
  const snapsByStore = groupSnapshots(snapshots);
  const errByStore = new Map(errors.map((e) => [e.store_id, e]));
  const perStore = stores.map((s) => ({
    store: s,
    stats: computeStoreStats(
      snapsByStore.get(s.id) ?? [],
      errByStore.get(s.id) ?? null,
      s.avg_price_minor,
    ),
  }));

  const sumCount = (key: "today" | "week" | "month") =>
    perStore.reduce((a, s) => a + s.stats[key], 0);
  const sumRev = (key: "todayRevenue" | "weekRevenue" | "monthRevenue") =>
    perStore.reduce((a, s) => a + (s.stats[key] ?? 0), 0);
  const totalSold = perStore.reduce(
    (a, s) => a + (s.stats.totalSold ?? 0),
    0,
  );
  const monthRev = sumRev("monthRevenue");

  return (
    <>
      {/* HERO */}
      <section className="glass p-5 sm:p-6 mb-3 animate-rise">
        <div className="text-[10px] font-semibold tracking-[0.16em] uppercase text-text-3 mb-4">
          All Stores Combined
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Stat value={sumCount("today")} label="Today" big />
          <Stat value={sumCount("week")} label="Week" big divider />
          <Stat value={sumCount("month")} label="Month" big divider />
        </div>
        <div className="mt-4 pt-3 border-t border-line text-xs text-text-3 flex flex-wrap gap-x-5 gap-y-1 justify-between">
          <span>Lifetime <span className="text-white tabular-nums font-medium">{fmtCount(totalSold)}</span></span>
          {monthRev > 0 && (
            <span>Month ≈ <span className="text-white tabular-nums font-medium">{formatMoneyMinor(monthRev)}</span></span>
          )}
        </div>
      </section>

      {/* STORES */}
      <div className="flex justify-between items-baseline px-1 mt-5 mb-2">
        <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-text-3">Stores</span>
        <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-text-3">{stores.length} active</span>
      </div>

      <div className="grid gap-2">
        {perStore.map(({ store, stats }) => (
          <StoreCard key={store.id} store={store} stats={stats} />
        ))}
      </div>
    </>
  );
}

function Stat({
  value,
  label,
  big = false,
  divider = false,
}: {
  value: number | null;
  label: string;
  big?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`${divider ? "border-l border-line pl-3 sm:pl-4" : ""}`}>
      <div className={`num font-semibold ${big ? "text-2xl sm:text-3xl" : "text-lg"}`}>
        {fmtCount(value)}
      </div>
      <span className="lbl block mt-1.5">{label}</span>
    </div>
  );
}

function StoreCard({
  store,
  stats,
}: {
  store: Store;
  stats: ReturnType<typeof computeStoreStats>;
}) {
  const label = store.display_name || store.username;
  const monthRev = stats.monthRevenue;
  const fresh = freshness(stats.lastSeen, !!stats.error);

  return (
    <div className="glass p-4 animate-rise">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${fresh.cls}`} />
          <span className="font-semibold text-[15px] truncate">{label}</span>
        </span>
        <a
          href={`https://www.depop.com/${encodeURIComponent(store.username)}/`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] uppercase tracking-[0.06em] text-text-3 hover:text-white border border-line-strong rounded-full px-2.5 py-1 flex-shrink-0"
        >
          View
        </a>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat value={stats.today} label="Today" />
        <MiniStat value={stats.week} label="Week" />
        <MiniStat value={stats.month} label="Month" />
      </div>

      <div className="mt-2.5 flex justify-between items-center text-[11px] text-text-3">
        <span>Lifetime <span className="text-text-2 tabular-nums">{fmtCount(stats.totalSold)}</span></span>
        {monthRev != null && monthRev > 0 ? (
          <span>
            Month ≈ <span className="text-text-2 tabular-nums">{formatMoneyMinor(monthRev, store.currency)}</span>
          </span>
        ) : (
          <span>{relTime(stats.lastSeen)}</span>
        )}
      </div>

      {stats.error && (
        <div className="mt-2.5 px-2.5 py-2 bg-white/[0.04] border border-line rounded-lg text-[11px] text-text-2 leading-snug">
          {stats.error.message}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="bg-white/[0.025] border border-line rounded-xl px-2.5 py-2.5">
      <div className="num font-semibold text-base">{fmtCount(value)}</div>
      <span className="lbl mt-1.5 block text-[8.5px]">{label}</span>
    </div>
  );
}

function freshness(lastSeen: number | null, hasError: boolean) {
  if (hasError) return { cls: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]" };
  if (!lastSeen) return { cls: "bg-white/20" };
  const age = Date.now() - lastSeen;
  if (age > 15 * 60_000) return { cls: "bg-white/20" };
  if (age > 6 * 60_000) return { cls: "bg-white/40" };
  return { cls: "bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]" };
}
