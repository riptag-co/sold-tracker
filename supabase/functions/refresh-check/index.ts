// GET /refresh-check
//
// Authorization: Bearer <device-token>
//
// Returns { manual_refresh_at: ISO timestamp | null }. The extension
// polls this every ~30 seconds. When the value is newer than its last
// seen, it kicks off an immediate Depop poll. Lightweight — single
// row lookup, tiny response.

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

  const { data, error } = await admin
    .from("control")
    .select("manual_refresh_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) return json({ error: "control read failed" }, 500);

  return json({
    manual_refresh_at: data?.manual_refresh_at ?? null,
  });
});
