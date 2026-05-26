// Overview — single hero card. Today totals up top with animated
// count-up, pace + best-day, per-store breakdown. iOS-style.
import Link from "next/link";
import Nav from "@/components/Nav";
import LiveRefresh from "@/components/LiveRefresh";
import AnimatedNumber from "@/components/AnimatedNumber";
import { createClient } from "@/lib/supabase/server";
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
  paceProjection,
  snapshotsToSales,
} from "@/lib/analytics";

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
      <main className="px-4 pb-20 max-w-2xl mx-auto">
        {storeList.length === 0 ? <Empty /> : (
          <Overview stores={storeList} snapshots={snapList} errors={errList} />
        )}
      </main>
    </>
  );
}

function Empty() {
  return (
    <div className="glass p-9 text-center mt-6 animate-fade-up">
      <div className="text-lg font-semibold mb-2 tracking-tight">No shops yet</div>
      <p className="text-[14px] text-text-2 mb-6 max-w-xs mx-auto leading-relaxed">
        Add the Depop usernames you want to track. Stats fill in once the extension polls.
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

  const allSales = snapshotsToSales(snapshots);
  const pace = paceProjection(allSales);
  const best = bestDayThisMonth(allSales);

  return (
    <>
      <section className="glass mt-4 px-6 sm:px-8 pt-11 pb-3 animate-fade-up">
        {/* TODAY COUNT */}
        <div className="text-center">
          <AnimatedNumber
            value={todayCount}
            className="num block text-[88px] sm:text-[104px] leading-[0.95] font-bold"
          />
          <div className="mt-3 text-[14px] text-text-2 font-medium">
            sold today
          </div>
        </div>

        {/* TODAY REVENUE */}
        <div className="text-center mt-9">
          <AnimatedNumber
            value={todayRev}
            format={(n) => (n > 0 ? formatMoneyMinor(Math.round(n)) ?? "$0" : "$0")}
            className="num block text-[48px] sm:text-[60px] leading-none font-semibold text-white/85"
          />
          <div className="mt-2.5 text-[14px] text-text-2 font-medium">
            earned today
          </div>
        </div>

        {/* PACE + BEST DAY */}
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

        {/* PER-STORE BREAKDOWN */}
        <div className="mt-7 border-t border-line">
          {perStore.map(({ store, stats }, i) => {
            const label = store.display_name || store.username;
            const revToday = stats.todayRevenue ?? 0;
            return (
              <div
                key={store.id}
                className="flex items-center justify-between gap-3 py-4 border-b border-line last:border-b-0 animate-fade-up"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <Dot lastSeen={stats.lastSeen} hasError={!!stats.error} />
                  <div className="min-w-0">
                    <div className="text-[16px] font-medium truncate tracking-tight">
                      {label}
                    </div>
                    {label !== store.username && (
                      <div className="text-[12px] text-text-3 truncate mt-0.5">
                        @{store.username}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="num text-[20px] font-semibold">
                    {stats.today.toLocaleString("en-US")}
                  </div>
                  {revToday > 0 && (
                    <div className="text-[12px] text-text-3 num-tight mt-0.5">
                      {formatMoneyMinor(revToday, store.currency)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
    </>
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

function Dot({
  lastSeen,
  hasError,
}: {
  lastSeen: number | null;
  hasError: boolean;
}) {
  let cls = "bg-white/15";
  if (hasError) cls = "bg-amber-300/90";
  else if (lastSeen && Date.now() - lastSeen < 15 * 60_000) {
    cls = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]";
  }
  return <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${cls}`} />;
}
