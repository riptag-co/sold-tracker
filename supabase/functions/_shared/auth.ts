// Verifies a device-token bearer header against the device_tokens
// table. Returns the user_id for that token, or null if invalid.
//
// Tokens are stored hashed (SHA-256 hex) so a DB leak doesn't expose
// live credentials. The extension sends the raw token; we hash it
// before lookup.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function userIdFromBearer(
  req: Request,
  admin: SupabaseClient,
): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const tokenHash = await sha256Hex(match[1].trim());

  const { data, error } = await admin
    .from("device_tokens")
    .select("user_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  // Bump last_used_at, fire and forget.
  admin
    .from("device_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .then(() => {});

  return data.user_id as string;
}
