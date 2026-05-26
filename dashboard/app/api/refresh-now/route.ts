// POST /api/refresh-now
//
// Updates control.manual_refresh_at to now(). The extension polls this
// every ~30 seconds and triggers an immediate Depop fetch when it
// sees a newer timestamp than its last acted-upon value.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const admin = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("control")
    .update({ manual_refresh_at: now })
    .eq("id", 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: now });
}
