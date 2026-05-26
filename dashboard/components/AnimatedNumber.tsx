"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoneyMinor } from "@/lib/stats";

// Eases a number toward its target over ~700ms with an iOS-style
// cubic-out curve. On first mount we snap to the value (no jarring
// count-up from 0 on page load). On subsequent changes we animate.
//
// Format mode is a string instead of a callback so Server Components
// can pass it across the RSC boundary — functions can't cross.
export default function AnimatedNumber({
  value,
  className,
  format = "count",
  currency = "USD",
  prefix = "",
}: {
  value: number;
  className?: string;
  format?: "count" | "money";
  currency?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const firstMount = useRef(true);

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 700;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const rounded = Math.round(display);
  const rendered =
    format === "money"
      ? formatMoneyMinor(rounded, currency) ?? "$0"
      : rounded.toLocaleString("en-US");

  return (
    <span className={className}>
      {prefix}
      {rendered}
    </span>
  );
}
