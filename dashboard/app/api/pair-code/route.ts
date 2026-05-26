// POST /api/pair-code
//
// Authenticated route: the logged-in user requests a 6-digit code,
// which we insert into pair_codes with a 10-minute expiry. The
// extension later calls the Supabase /pair edge function with this
// code and exchanges it for a device token.

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const TTL_MINUTES = 10;

function sixDigit() {
  // Use crypto.getRandomValues for unbiased 6-digit selection.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();

  // Burn any of this user's stale codes first so they only ever see one.
  await admin.from("pair_codes").delete().eq("user_id", user.id);

  // Retry on the (very unlikely) PK collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = sixDigit();
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();
    const { error } = await admin.from("pair_codes").insert({
      code,
      user_id: user.id,
      expires_at: expiresAt,
    });
    if (!error) {
      return NextResponse.json({ code, expires_at: expiresAt });
    }
    if (!error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "could not allocate code" }, { status: 500 });
}
