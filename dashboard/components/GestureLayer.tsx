"use client";

// Adds two gestures globally:
//  - Pull-to-refresh: drag down from the top of the page → router.refresh()
//  - Horizontal swipe: left/right swipe → navigate between tabs
//
// Both are touch-only — no effect on mouse/trackpad. The component is
// invisible; it just attaches passive listeners to the document and
// renders a small refresh hint at the top when the user is pulling.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const TABS = ["/", "/stats", "/stores", "/goals", "/settings"];

const PULL_TRIGGER = 80;   // px pulled before refresh fires
const PULL_MAX = 140;      // visual cap
const SWIPE_MIN = 70;      // px horizontal threshold
const SWIPE_MAX_VERT = 50; // px vertical max to be a horizontal swipe

export default function GestureLayer() {
  const router = useRouter();
  const path = usePathname();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const draggingPullRef = useRef(false);
  const draggingSwipeRef = useRef(false);

  useEffect(() => {
    function targetIsInteractive(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      return !!target.closest(
        'input, textarea, select, button, a, label, [role="button"], [role="listbox"], [role="option"], [data-no-gesture]',
      );
    }

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      // Don't capture gestures that start on interactive controls —
      // tapping a dropdown shouldn't trigger swipe-navigation.
      if (targetIsInteractive(e.target)) {
        startRef.current = null;
        return;
      }
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      draggingPullRef.current = false;
      draggingSwipeRef.current = false;
    }

    function onMove(e: TouchEvent) {
      if (!startRef.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;

      // Pull-to-refresh: only when scroll is at the top.
      if (
        !draggingSwipeRef.current &&
        dy > 0 &&
        Math.abs(dy) > Math.abs(dx) &&
        window.scrollY <= 0
      ) {
        draggingPullRef.current = true;
        const eased = Math.min(PULL_MAX, dy * 0.55);
        setPull(eased);
        // Don't preventDefault — passive listener anyway.
      } else if (
        !draggingPullRef.current &&
        Math.abs(dx) > Math.abs(dy) &&
        Math.abs(dx) > 12
      ) {
        draggingSwipeRef.current = true;
      }
    }

    function onEnd(e: TouchEvent) {
      const start = startRef.current;
      startRef.current = null;
      const t = e.changedTouches[0];
      if (!t || !start) {
        setPull(0);
        draggingPullRef.current = false;
        draggingSwipeRef.current = false;
        return;
      }
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;

      // Pull
      if (draggingPullRef.current) {
        if (pull >= PULL_TRIGGER) {
          setRefreshing(true);
          router.refresh();
          setTimeout(() => {
            setPull(0);
            setRefreshing(false);
          }, 700);
        } else {
          setPull(0);
        }
      }

      // Swipe
      if (
        draggingSwipeRef.current &&
        Math.abs(dx) >= SWIPE_MIN &&
        Math.abs(dy) <= SWIPE_MAX_VERT
      ) {
        const idx = TABS.indexOf(path);
        if (idx >= 0) {
          if (dx < 0 && idx < TABS.length - 1) router.push(TABS[idx + 1]);
          if (dx > 0 && idx > 0) router.push(TABS[idx - 1]);
        }
      }

      draggingPullRef.current = false;
      draggingSwipeRef.current = false;
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [path, pull, router]);

  const triggered = pull >= PULL_TRIGGER;

  return (
    <div
      className="fixed top-0 inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pull, PULL_MAX) - 30}px)`,
        opacity: pull > 4 ? 1 : 0,
        transition: pull === 0 ? "transform 0.3s ease, opacity 0.3s ease" : "none",
      }}
    >
      <div
        className="mt-3 px-4 py-2 rounded-full glass !rounded-full text-[12px] font-semibold flex items-center gap-2"
        style={{
          color: triggered || refreshing ? "#34D399" : "rgba(255,255,255,0.6)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={refreshing ? "animate-spin" : ""}
          style={{
            transform: refreshing
              ? undefined
              : `rotate(${Math.min(180, (pull / PULL_TRIGGER) * 180)}deg)`,
            transition: "transform 0.15s",
          }}
        >
          <path
            d="M2 7a5 5 0 1 1 1.5 3.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M2 11V8h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
        {refreshing ? "Refreshing" : triggered ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
