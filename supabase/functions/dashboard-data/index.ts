// GET /dashboard-data
//
// Authorization: Bearer <device-token>
//
// Returns everything the extension popup needs to render in one round
// trip: the user's stores + the last ~95 days of snapshots + current
// fetch errors. The popup does the same MAX-MIN math the dashboard
// does — keeps the math in one place client-side.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json, preflight } from "../_shared/cors.ts";
import { userIdFromBearer } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await userIdFromBearer(req, admin);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const { data: stores, error: sErr } = await admin
    .from("stores")
    .select("id, username, display_name, avg_price_minor, currency, avatar_url")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("username");
  if (sErr) return json({ error: "stores read failed" }, 500);

  if (!stores || stores.length === 0) {
    return json({ stores: [], snapshots: [], errors: [] });
  }

  const storeIds = stores.map((s) => s.id);

  // 95 days of snapshots — same window the schema prunes to.
  const cutoff = new Date(Date.now() - 95 * 86_400_000).toISOString();
  const { data: snapshots, error: snErr } = await admin
    .from("snapshots")
    .select("store_id, sold_count, taken_at")
    .in("store_id", storeIds)
    .gte("taken_at", cutoff)
    .order("taken_at", { ascending: true });
  if (snErr) return json({ error: "snapshots read failed" }, 500);

  const { data: errors, error: eErr } = await admin
    .from("fetch_errors")
    .select("store_id, message, occurred_at")
    .in("store_id", storeIds);
  if (eErr) return json({ error: "errors read failed" }, 500);

  return json({
    stores,
    snapshots: snapshots ?? [],
    errors: errors ?? [],
  });
});
