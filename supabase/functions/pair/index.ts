// POST /pair
//
// Body: { code: "428193", label?: "Home PC Chrome" }
//
// Flow:
//   1. Dashboard (logged-in user) creates a pair_code row, shows the
//      6-digit code to the user.
//   2. User pastes the code into the extension's options page.
//   3. Extension POSTs here with the code.
//   4. We look up the code, mint a long-lived bearer token, store its
//      SHA-256 hash in device_tokens, delete the code, and return the
//      raw token + the supabase URL.
//
// The raw token is shown to the user exactly once and persisted by the
// extension in chrome.storage.local. If they lose it they pair again.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, preflight } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function generateToken(): string {
  // 32 bytes, base64url-encoded → ~43 chars, ~256 bits of entropy.
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: { code?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const code = (body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return json({ error: "code must be 6 digits" }, 400);
  }

  // Look up code.
  const { data: pair, error: pairErr } = await admin
    .from("pair_codes")
    .select("user_id, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (pairErr) return json({ error: "lookup failed" }, 500);
  if (!pair) return json({ error: "invalid or expired code" }, 404);
  if (new Date(pair.expires_at).getTime() < Date.now()) {
    await admin.from("pair_codes").delete().eq("code", code);
    return json({ error: "invalid or expired code" }, 404);
  }

  const token = generateToken();
  const tokenHash = await sha256Hex(token);

  const { error: insErr } = await admin.from("device_tokens").insert({
    user_id: pair.user_id,
    token_hash: tokenHash,
    label: body.label ?? null,
  });
  if (insErr) return json({ error: "could not mint token" }, 500);

  // Burn the code so it can't be reused.
  await admin.from("pair_codes").delete().eq("code", code);

  return json({
    token,
    supabase_url: SUPABASE_URL,
    user_id: pair.user_id,
  });
});
