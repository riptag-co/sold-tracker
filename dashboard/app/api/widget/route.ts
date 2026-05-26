// GET /api/widget
//
// Public, unauthenticated JSON endpoint optimized for iOS Scriptable
// widgets and other minimal consumers. Returns today's totals + a
// compact per-store list. No auth — the dashboard URL is the secret.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeStoreStats,
  groupSnapshots,
  type Snapshot,
  type Store,
} from "@/lib/stats";
import { paceProjection, snapshotsToSales } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const [{ data: stores }, { data: snapshots }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, username, display_name, avg_price_minor, currency, color, avatar_url")
      .is("deleted_at", null)
      .order("username"),
    supabase
      .from("snapshots")
      .select("store_id, sold_count, taken_at")
      .gte("taken_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order("taken_at", { ascending: true }),
  ]);

  const storeList: Store[] = stores ?? [];
  const snapList: Snapshot[] = snapshots ?? [];
  const snapsByStore = groupSnapshots(snapList);

  const perStore = storeList.map((s) => {
    const stats = computeStoreStats(
      snapsByStore.get(s.id) ?? [],
      null,
      s.avg_price_minor,
    );
    return {
      username: s.username,
      display_name: s.display_name,
      today: stats.today,
      today_revenue_minor: stats.todayRevenue,
      currency: s.currency,
    };
  });

  const todayTotal = perStore.reduce((a, s) => a + s.today, 0);
  const todayRevTotal = perStore.reduce(
    (a, s) => a + (s.today_revenue_minor ?? 0),
    0,
  );

  const pace = paceProjection(snapshotsToSales(snapList));

  return NextResponse.json(
    {
      today_sold: todayTotal,
      today_revenue_minor: todayRevTotal,
      currency: "USD",
      pace_projected: pace.basis === "none" ? null : pace.projected,
      stores: perStore.sort((a, b) => b.today - a.today),
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "access-control-allow-origin": "*",
      },
    },
  );
}
