"use client";

import { useEffect, useState } from "react";
import LockScreen from "./LockScreen";
import { isDeviceTrusted, trustDevice } from "@/lib/lock";

// Wraps the app. If any PIN is set on the server and this device
// isn't in its 30-day trust window, render the lock screen. Otherwise
// pass children through. Note: this is a UI gate, not real security.

type State = "checking" | "locked" | "unlocked";

export default function LockGate({
  pinHashes,
  children,
}: {
  pinHashes: string[] | null;
  children: React.ReactNode;
}) {
  const hasPin = !!(pinHashes && pinHashes.length > 0);
  const [state, setState] = useState<State>(hasPin ? "checking" : "unlocked");

  useEffect(() => {
    if (!hasPin) {
      setState("unlocked");
      return;
    }
    setState(isDeviceTrusted() ? "unlocked" : "locked");
  }, [hasPin]);

  if (state === "checking") {
    return <div className="fixed inset-0 bg-ink z-[99]" />;
  }

  if (state === "locked" && pinHashes) {
    return (
      <LockScreen
        pinHashes={pinHashes}
        onSuccess={() => {
          trustDevice();
          setState("unlocked");
        }}
      />
    );
  }

  return <>{children}</>;
}
