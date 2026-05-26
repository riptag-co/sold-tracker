"use client";

import { useEffect, useState } from "react";

// Animated ring like Apple's Activity rings. The ring animates from
// empty to its target percentage on mount.

export default function CircularProgress({
  percent,
  size = 160,
  stroke = 14,
  color = "#34D399",
  trackColor = "rgba(255,255,255,0.07)",
  children,
}: {
  percent: number; // 0..1+
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const [animatedP, setAnimatedP] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 1100;
    const from = 0;
    const to = Math.min(percent, 1.25);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedP(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - circ * Math.min(animatedP, 1);
  // Overflow handling: if percent > 1, draw a second tighter ring overlay.
  const overflow = Math.max(0, animatedP - 1);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 12px ${color}55)` }}
        />
        {overflow > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r - stroke - 4}
            stroke={color}
            strokeWidth={Math.max(4, stroke - 4)}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (r - stroke - 4)}
            strokeDashoffset={
              2 * Math.PI * (r - stroke - 4) - 2 * Math.PI * (r - stroke - 4) * Math.min(overflow, 1)
            }
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
