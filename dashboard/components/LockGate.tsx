"use client";

import { useEffect, useState } from "react";
import LockScreen from "./LockScreen";
import { isDeviceTrusted, trustDevice } from "@/lib/lock";

// Wraps the app. If a PIN is set on the server and this device isn't
// in its 30-day trust window, render the lock screen. Otherwise pass
// children through. Note: this is a UI gate, not real security — the
// Supabase anon API still serves data to anyone with the key.

type State = "checking" | "locked" | "unlocked";

export default function LockGate({
  pinHash,
  children,
}: {
  pinHash: string | null;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>(pinHash ? "checking" : "unlocked");

  useEffect(() => {
    if (!pinHash) {
      setState("unlocked");
      return;
    }
    setState(isDeviceTrusted() ? "unlocked" : "locked");
  }, [pinHash]);

  if (state === "checking") {
    // Brief blank to avoid flashing the dashboard before the trust
    // check resolves on the client.
    return <div className="fixed inset-0 bg-ink z-[99]" />;
  }

  if (state === "locked" && pinHash) {
    return (
      <LockScreen
        pinHash={pinHash}
        onSuccess={() => {
          trustDevice();
          setState("unlocked");
        }}
      />
    );
  }

  return <>{children}</>;
}
