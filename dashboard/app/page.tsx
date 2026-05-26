// Overview — hero card with today/week/month totals + per-store
// breakdown. Long-press a store row for quick stats. The period
// picker top-left chooses what window to display. The ring around it
// shows the user's starred "main goal" progress.
import Link from "next/link";
import LiveRefresh from "@/components/LiveRefresh";
import OverviewClient from "./OverviewClient";
import { createClient } from "@/lib/supabase/server";
import type { Snapshot, Store, StoreError } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Goal = {
  id: string;
  store_id: string | null;
  period: "day" | "week" | "month";
  metric: "sales" | "revenue";
  target: number;
};

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: stores },
    { data: snapshots },
    { data: errors },
    { data: control },
  ] = await Promise.all([
    supabase
      .from("stores")
      .select("id, username, display_name, avg_price_minor, currency, color")
      .order("username"),
    supabase
      .from("snapshots")
      .select("store_id, sold_count, taken_at")
      .gte("taken_at", new Date(Date.now() - 35 * 86_400_000).toISOString())
      .order("taken_at", { ascending: true }),
    supabase.from("fetch_errors").select("store_id, message, occurred_at"),
    supabase.from("control").select("main_goal_id").eq("id", 1).maybeSingle(),
  ]);

  let mainGoal: Goal | null = null;
  if (control?.main_goal_id) {
    const { data } = await supabase
      .from("goals")
      .select("id, store_id, period, metric, target")
      .eq("id", control.main_goal_id)
      .maybeSingle();
    mainGoal = (data as Goal) ?? null;
  }

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
            mainGoal={mainGoal}
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
