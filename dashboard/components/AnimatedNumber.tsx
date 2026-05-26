"use client";

import { useEffect, useRef, useState } from "react";

// Eases a number toward its target over ~700ms with an iOS-style
// cubic-out curve. On first mount we snap to the value (no jarring
// count-up from 0 on page load). On subsequent changes we animate.
export default function AnimatedNumber({
  value,
  format,
  className,
  prefix = "",
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
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
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
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

  const rendered = format
    ? format(display)
    : Math.round(display).toLocaleString("en-US");

  return <span className={className}>{prefix}{rendered}</span>;
}
