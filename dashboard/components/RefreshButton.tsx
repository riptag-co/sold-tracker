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
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={busy ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <polyline points="21 3 21 8 16 8" />
      </svg>
    </button>
  );
}
