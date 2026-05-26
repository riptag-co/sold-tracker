import { createClient } from "@/lib/supabase/server";
import GoalsView from "./GoalsView";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();

  const [{ data: stores }, { data: snapshots }, { data: goals }, { data: control }] =
    await Promise.all([
      supabase
        .from("stores")
        .select("id, username, display_name, avg_price_minor, currency, color, avatar_url")
        .is("deleted_at", null),
      supabase
        .from("snapshots")
        .select("store_id, sold_count, taken_at")
        .gte("taken_at", new Date(Date.now() - 95 * 86_400_000).toISOString())
        .order("taken_at", { ascending: true }),
      supabase
        .from("goals")
        .select("id, store_id, period, metric, target, label, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("control").select("main_goal_id").eq("id", 1).maybeSingle(),
    ]);

  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto">
      <GoalsView
        stores={stores ?? []}
        snapshots={snapshots ?? []}
        goals={goals ?? []}
        mainGoalId={control?.main_goal_id ?? null}
      />
    </main>
  );
}
