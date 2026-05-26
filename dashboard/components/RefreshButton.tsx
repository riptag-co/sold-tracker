"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "waiting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function ping() {
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/refresh-now", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("waiting");
      // Refresh dashboard data after the extension has had time to poll.
      // We can't know the exact moment it pushes back, so we re-pull
      // after ~25s as a sane default — the LiveRefresh subscription
      // will also catch any earlier inserts.
      window.setTimeout(() => {
        router.refresh();
        setState("done");
        window.setTimeout(() => setState("idle"), 2000);
      }, 25_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
      window.setTimeout(() => setState("idle"), 3000);
    }
  }

  const busy = state === "sending" || state === "waiting";

  return (
    <button
      onClick={ping}
      disabled={busy}
      className={`inline-flex items-center gap-2 ghost ${className}`}
      style={busy ? { opacity: 0.7, cursor: "wait" } : undefined}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        className={busy ? "animate-spin" : ""}
      >
        <path
          d="M2 7a5 5 0 1 1 1.5 3.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M2 11V8h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {state === "idle" && "Refresh"}
      {state === "sending" && "Pinging…"}
      {state === "waiting" && "Waiting for extension…"}
      {state === "done" && "Refreshed"}
      {state === "error" && (error ?? "Failed")}
    </button>
  );
}
