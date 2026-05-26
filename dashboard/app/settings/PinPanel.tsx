"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LockScreen from "@/components/LockScreen";
import { sha256Hex, untrustDevice } from "@/lib/lock";

export default function PinPanel({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  type Flow =
    | null
    | { step: "enter"; pending?: string }
    | { step: "confirm"; pending: string };
  const [flow, setFlow] = useState<Flow>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function savePin(pin: string) {
    setBusy(true);
    setError(null);
    const hash = await sha256Hex(pin);
    // Keep both columns in sync so older deploys / migration 0009 not
    // yet run both work.
    const { data, error } = await supabase
      .from("control")
      .upsert({ id: 1, pin_hash: hash, pin_hashes: [hash] })
      .select("pin_hashes, pin_hash")
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    const stored: string[] = (data?.pin_hashes as string[] | null) ?? (data?.pin_hash ? [data.pin_hash] : []);
    if (!stored.includes(hash)) {
      setError("Save didn't persist. Verify migrations 0008/0009 ran.");
      return;
    }
    setFlow(null);
    router.refresh();
  }

  async function removePin() {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("control")
      .upsert({ id: 1, pin_hash: null, pin_hashes: null })
      .select("pin_hash, pin_hashes")
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    untrustDevice();
    router.refresh();
  }

  return (
    <>
      <div className="text-[13px] text-text-2 mb-4 leading-relaxed">
        {hasPin
          ? "A 4-digit PIN is set. Devices stay trusted for 30 days after unlocking."
          : "Set a 4-digit PIN to gate the dashboard behind a lock screen."}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="pill"
          onClick={() => {
            setError(null);
            setFlow({ step: "enter" });
          }}
          disabled={busy}
        >
          {hasPin ? "Change PIN" : "Set PIN"}
        </button>
        {hasPin && (
          <button className="ghost" onClick={removePin} disabled={busy}>
            Remove PIN
          </button>
        )}
      </div>

      {error && (
        <div className="text-[12.5px] text-red-300/90 mt-3">{error}</div>
      )}

      {flow?.step === "enter" && (
        <LockScreen
          title="Choose a new PIN"
          collectMode
          onCollect={(pin) => setFlow({ step: "confirm", pending: pin })}
        />
      )}
      {flow?.step === "confirm" && (
        <LockScreen
          title="Confirm the PIN"
          collectMode
          onCollect={(pin) => {
            if (pin === flow.pending) {
              savePin(pin);
            } else {
              setError("PINs didn't match. Try again.");
              setFlow({ step: "enter" });
            }
          }}
        />
      )}
    </>
  );
}
