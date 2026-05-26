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
      window.setTimeout(() => {
        router.refresh();
        setState("done");
        window.setTimeout(() => setState("idle"), 1500);
      }, 25_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
      window.setTimeout(() => setState("idle"), 2500);
    }
  }

  const busy = state === "sending" || state === "waiting";

  let color = "rgba(255,255,255,0.55)";
  if (state === "done") color = "#34D399";
  else if (state === "error") color = "#F87171";
  else if (busy) color = "rgba(255,255,255,0.7)";

  return (
    <button
      onClick={ping}
      disabled={busy}
      title={
        state === "error"
          ? error ?? "Failed"
          : busy
            ? "Waiting for extension…"
            : "Refresh"
      }
      className={`inline-flex items-center justify-center rounded-full w-9 h-9 transition-all active:scale-90 ${className}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        color,
        cursor: busy ? "wait" : "pointer",
      }}
    >
      <svg
        width="15"
        height="15"
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
    </button>
  );
}
