// POST /ingest
//
// Authorization: Bearer <device-token>
// Body: { results: Array<
//   | { username: string, ok: true,  count: number }
//   | { username: string, ok: false, error: string }
// > }
//
// The extension does one batch ingest per poll cycle. For each result:
//  - If the username doesn't exist as a store for this user yet, we
//    auto-create it (the dashboard's source of truth is the stores
//    table, but the extension reads usernames from the same table, so
//    in practice the row will already exist).
//  - On ok: insert a snapshot row, clear any existing fetch_errors row.
//  - On error: upsert into fetch_errors with the message.
//
// Snapshots are append-only; the dashboard computes today/week/month
// as MAX(sold_count) - MIN(sold_count) within the window.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, preflight } from "../_shared/cors.ts";
import { userIdFromBearer } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Result =
  | { username: string; ok: true; count: number }
  | { username: string; ok: false; error: string };

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const userId = await userIdFromBearer(req, admin);
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: { results?: Result[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const results = Array.isArray(body.results) ? body.results : [];
  if (results.length === 0) return json({ accepted: 0 });

  // Load existing stores for this user once, keyed by username.
  const { data: stores, error: storesErr } = await admin
    .from("stores")
    .select("id, username")
    .eq("user_id", userId);
  if (storesErr) return json({ error: "stores lookup failed" }, 500);

  const idByUsername = new Map<string, string>(
    (stores ?? []).map((s) => [s.username, s.id]),
  );

  // Auto-create any unknown stores (lowercased usernames match how the
  // dashboard stores them).
  const unknownUsernames = [
    ...new Set(
      results
        .map((r) => r.username.toLowerCase().trim())
        .filter((u) => u && !idByUsername.has(u)),
    ),
  ];

  if (unknownUsernames.length > 0) {
    const { data: inserted, error: insErr } = await admin
      .from("stores")
      .insert(
        unknownUsernames.map((username) => ({ user_id: userId, username })),
      )
      .select("id, username");
    if (insErr) return json({ error: "could not auto-create stores" }, 500);
    for (const s of inserted ?? []) idByUsername.set(s.username, s.id);
  }

  const snapshotRows: Array<{
    store_id: string;
    sold_count: number;
    taken_at: string;
  }> = [];
  const errorRows: Array<{
    store_id: string;
    message: string;
    occurred_at: string;
  }> = [];
  const clearedStoreIds: string[] = [];
  const now = new Date().toISOString();

  for (const r of results) {
    const storeId = idByUsername.get(r.username.toLowerCase().trim());
    if (!storeId) continue;

    if (r.ok && Number.isFinite(r.count) && r.count >= 0) {
      snapshotRows.push({
        store_id: storeId,
        sold_count: Math.trunc(r.count),
        taken_at: now,
      });
      clearedStoreIds.push(storeId);
    } else if (!r.ok) {
      errorRows.push({
        store_id: storeId,
        message: String(r.error ?? "unknown error").slice(0, 500),
        occurred_at: now,
      });
    }
  }

  if (snapshotRows.length > 0) {
    const { error } = await admin.from("snapshots").insert(snapshotRows);
    if (error) return json({ error: "snapshot insert failed" }, 500);
  }
  if (clearedStoreIds.length > 0) {
    await admin
      .from("fetch_errors")
      .delete()
      .in("store_id", clearedStoreIds);
  }
  if (errorRows.length > 0) {
    await admin
      .from("fetch_errors")
      .upsert(errorRows, { onConflict: "store_id" });
  }

  return json({
    accepted: snapshotRows.length,
    errors: errorRows.length,
  });
});
