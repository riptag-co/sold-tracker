// POST /api/pair-code
//
// Single-user mode: no auth. Anyone with the dashboard URL can generate
// a pair code, but since the dashboard is private (just you) this is
// fine. The code is short-lived (10 min) and one-shot so a leaked code
// is low risk.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const TTL_MINUTES = 10;

function sixDigit() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

export async function POST() {
  const admin = createServiceClient();

  // Burn any stale codes first so only the latest is valid.
  await admin
    .from("pair_codes")
    .delete()
    .lt("expires_at", new Date(Date.now() - 60_000).toISOString());

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = sixDigit();
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();
    const { error } = await admin.from("pair_codes").insert({
      code,
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
