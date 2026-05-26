// Overview — iOS-style hierarchy: two huge today stats up top, then a
// simple grouped list of stores below. Realtime keeps it fresh.
import Link from "next/link";
import Nav from "@/components/Nav";
import LiveRefresh from "@/components/LiveRefresh";
import { createClient } from "@/lib/supabase/server";
import {
  computeStoreStats,
  fmtCount,
  formatMoneyMinor,
  groupSnapshots,
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
        .gte("taken_at", new Date(Date.now() - 95 * 86_400_000).toISOString())
        .order("taken_at", { ascending: true }),
      supabase.from("fetch_errors").select("store_id, message, occurred_at"),
    ]);

  const storeList: Store[] = stores ?? [];
  const snapList: Snapshot[] = snapshots ?? [];
  const errList: StoreError[] = errors ?? [];

  return (
    <>
      <Nav />
      <LiveRefresh />
      <main className="px-4 pb-16 max-w-2xl mx-auto">
        {storeList.length === 0 ? <Empty /> : (
          <Overview stores={storeList} snapshots={snapList} errors={errList} />
        )}
      </main>
    </>
  );
}

function Empty() {
  return (
    <div className="glass p-8 text-center mt-6">
      <div className="text-base font-semibold mb-2">No shops yet</div>
      <p className="text-sm text-text-2 mb-5">
        Add your Depop usernames to start tracking.
      </p>
      <Link href="/stores" className="pill inline-block">Add shops</Link>
    </div>
  );
}

function Overview({
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
  const perStore = stores
    .map((s) => ({
      store: s,
      stats: computeStoreStats(
        snapsByStore.get(s.id) ?? [],
        errByStore.get(s.id) ?? null,
        s.avg_price_minor,
      ),
    }))
    .sort((a, b) => b.stats.today - a.stats.today);

  const todayCount = perStore.reduce((a, s) => a + s.stats.today, 0);
  const todayRev = perStore.reduce(
    (a, s) => a + (s.stats.todayRevenue ?? 0),
    0,
  );
  const weekCount = perStore.reduce((a, s) => a + s.stats.week, 0);
  const monthCount = perStore.reduce((a, s) => a + s.stats.month, 0);

  return (
    <>
      {/* HERO — two stacked huge stats */}
      <section className="glass mt-3 px-6 py-9 sm:py-12">
        <div className="text-center mb-9">
          <div className="text-[64px] sm:text-[80px] leading-none font-semibold tracking-tight tabular-nums">
            {fmtCount(todayCount)}
          </div>
          <div className="mt-2 text-[13px] text-text-2">
            sold today
          </div>
        </div>

        <div className="text-center">
          <div className="text-[44px] sm:text-[56px] leading-none font-semibold tracking-tight tabular-nums text-text-2">
            {todayRev > 0 ? formatMoneyMinor(todayRev) : "—"}
          </div>
          <div className="mt-2 text-[13px] text-text-2">
            earned today
          </div>
        </div>

        <div className="mt-9 pt-5 border-t border-line flex justify-between text-[12px] text-text-3">
          <span>This week <span className="text-text-2 tabular-nums font-medium ml-1">{fmtCount(weekCount)}</span></span>
          <span>This month <span className="text-text-2 tabular-nums font-medium ml-1">{fmtCount(monthCount)}</span></span>
        </div>
      </section>

      {/* STORES — grouped list, iOS-style */}
      <div className="px-2 pt-7 pb-2 text-[13px] text-text-2 font-medium">
        Stores
      </div>

      <section className="glass overflow-hidden">
        {perStore.map(({ store, stats }, i) => {
          const label = store.display_name || store.username;
          const todayRevForStore = stats.todayRevenue ?? 0;
          return (
            <div
              key={store.id}
              className={`flex items-center justify-between gap-3 px-5 py-4 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-[16px] font-medium truncate flex items-center gap-2">
                  <Dot lastSeen={stats.lastSeen} hasError={!!stats.error} />
                  {label}
                </div>
                {label !== store.username && (
                  <div className="text-[12px] text-text-3 mt-0.5 truncate">
                    @{store.username}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[18px] font-semibold tabular-nums">
                  {fmtCount(stats.today)}
                </div>
                {todayRevForStore > 0 && (
                  <div className="text-[12px] text-text-3 tabular-nums">
                    {formatMoneyMinor(todayRevForStore, store.currency)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Errors summary, if any */}
      {errors.length > 0 && (
        <div className="mt-4 glass p-4 text-[12px] text-text-2 leading-relaxed">
          <div className="text-text-3 mb-1 text-[11px] uppercase tracking-wider">Issues</div>
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
    </>
  );
}

function Dot({
  lastSeen,
  hasError,
}: {
  lastSeen: number | null;
  hasError: boolean;
}) {
  let cls = "bg-white/15";
  if (hasError) cls = "bg-amber-300";
  else if (lastSeen && Date.now() - lastSeen < 15 * 60_000) {
    cls = "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
  }
  return <span className={`w-1.5 h-1.5 rounded-full inline-block ${cls}`} />;
}
