"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/stats", label: "Stats" },
  { href: "/stores", label: "Stores" },
  { href: "/goals", label: "Goals" },
  { href: "/settings", label: "Settings" },
];

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type LiveStatus = "live" | "stale" | "offline" | "none";

function liveStatusFromTimestamp(t: number | null): LiveStatus {
  if (t == null) return "none";
  const age = Date.now() - t;
  if (age < 10 * 60_000) return "live";
  if (age < 30 * 60_000) return "stale";
  return "offline";
}

function statusLabel(s: LiveStatus): string {
  switch (s) {
    case "live": return "Live";
    case "stale": return "Catching up";
    case "offline": return "Offline";
    case "none": return "Not paired";
  }
}

const DOT_BY_STATUS: Record<LiveStatus, string> = {
  live: "bg-money shadow-[0_0_12px_rgba(52,211,153,0.7)] animate-live-pulse",
  stale: "bg-amber-300/90",
  offline: "bg-red-400/80",
  none: "bg-white/15",
};

export default function Nav({
  latestSnapshotT,
}: {
  latestSnapshotT: number | null;
}) {
  const path = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [status, setStatus] = useState<LiveStatus>(liveStatusFromTimestamp(latestSnapshotT));

  // Optimistic active tab — set the moment a tab is tapped, before the
  // route actually changes. Cleared once the real pathname catches up.
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const realIdx = Math.max(0, links.findIndex((l) => l.href === path));
  const displayedIdx = pendingIdx ?? realIdx;

  useEffect(() => {
    if (pendingIdx !== null && realIdx === pendingIdx) {
      setPendingIdx(null);
    }
  }, [realIdx, pendingIdx]);

  useEffect(() => {
    setStatus(liveStatusFromTimestamp(latestSnapshotT));
    const id = setInterval(() => {
      setStatus(liveStatusFromTimestamp(latestSnapshotT));
    }, 30_000);
    return () => clearInterval(id);
  }, [latestSnapshotT]);

  useIsoLayoutEffect(() => {
    function measure() {
      const el = tabRefs.current[displayedIdx];
      const container = containerRef.current;
      if (!el || !container) return;
      const c = container.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      setIndicator({ left: e.left - c.left, width: e.width });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [displayedIdx]);

  return (
    <header className="px-4 pt-7 pb-4 max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-center mb-6">
        <Link href="/" className="group inline-flex items-center gap-2.5 select-none">
          <span className="font-rounded text-[13px] font-bold tracking-[0.32em] text-white/95">
            SOLD
          </span>
          <span className="font-display italic text-[15px] font-light text-white/50 -mx-0.5 -mt-0.5">·</span>
          <span className="font-rounded text-[13px] font-bold tracking-[0.32em] text-white/95">
            TRACKER
          </span>
          <span
            className={`ml-2 w-2 h-2 rounded-full ${DOT_BY_STATUS[status]}`}
            aria-label={statusLabel(status)}
            title={statusLabel(status)}
          />
        </Link>
      </div>

      <nav
        ref={containerRef}
        className="relative flex p-1 rounded-full bg-white/[0.04] border border-line text-[12.5px] backdrop-blur-md"
      >
        {indicator && (
          <span
            className="absolute top-1 bottom-1 bg-white rounded-full shadow-[0_2px_10px_-2px_rgba(255,255,255,0.32)] transition-all duration-[220ms] ease-ios-sharp"
            style={{ left: indicator.left, width: indicator.width }}
            aria-hidden
          />
        )}
        {links.map((l, i) => {
          const active = i === displayedIdx;
          return (
            <Link
              key={l.href}
              href={l.href}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => setPendingIdx(i)}
              className={`relative z-10 flex-1 text-center px-2 py-2 rounded-full font-semibold transition-colors duration-150 active:scale-[0.96] ${
                active ? "text-[#0A0A0B]" : "text-text-2 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
