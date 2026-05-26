// Server-side Supabase clients. Single-user mode: no auth, RLS off, so
// the anon key has full read access and the service-role key is used
// from server routes for clarity (and for any operation we'd rather
// not expose via the public-facing anon role).
import { createClient as createBaseClient } from "@supabase/supabase-js";

export async function createClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function createServiceClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
