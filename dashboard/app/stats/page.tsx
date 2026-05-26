import StatsView from "./StatsView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createClient();
  const [{ data: stores }, { data: snapshots }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, username, display_name, avg_price_minor, currency, color")
      .order("username"),
    supabase
      .from("snapshots")
      .select("store_id, sold_count, taken_at")
      .gte("taken_at", new Date(Date.now() - 95 * 86_400_000).toISOString())
      .order("taken_at", { ascending: true }),
  ]);

  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto">
      <StatsView stores={stores ?? []} snapshots={snapshots ?? []} />
    </main>
  );
}
