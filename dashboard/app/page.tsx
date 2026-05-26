// Overview — hero card with today totals + per-store breakdown.
// Long-press a store row to open a quick-stats sheet. On-fire badge
// appears when a shop is >= 1.5x its 14-day average.
import Link from "next/link";
import LiveRefresh from "@/components/LiveRefresh";
import OverviewClient from "./OverviewClient";
import { createClient } from "@/lib/supabase/server";
import type { Snapshot, Store, StoreError } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: stores }, { data: snapshots }, { data: errors }] =
    await Promise.all([
      supabase
        .from("stores")
        .select("id, username, display_name, avg_price_minor, currency, color")
        .order("username"),
      supabase
        .from("snapshots")
        .select("store_id, sold_count, taken_at")
        // Overview only needs current-month math + 14-day pace lookback.
        // Drop 95 → 35 days to slice query latency.
        .gte("taken_at", new Date(Date.now() - 35 * 86_400_000).toISOString())
        .order("taken_at", { ascending: true }),
      supabase.from("fetch_errors").select("store_id, message, occurred_at"),
    ]);

  const storeList: Store[] = stores ?? [];
  const snapList: Snapshot[] = snapshots ?? [];
  const errList: StoreError[] = errors ?? [];

  return (
    <>
      <LiveRefresh />
      <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto">
        {storeList.length === 0 ? (
          <Empty />
        ) : (
          <OverviewClient
            stores={storeList}
            snapshots={snapList}
            errors={errList}
          />
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
