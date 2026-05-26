"use client";
import { createClient as createBaseClient } from "@supabase/supabase-js";

export function createClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
