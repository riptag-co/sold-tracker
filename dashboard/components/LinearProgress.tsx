"use client";

import { useEffect, useState } from "react";

export default function LinearProgress({
  percent,
  color = "#34D399",
  height = 10,
  className = "",
}: {
  percent: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const from = 0;
    const to = Math.min(percent, 1);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setP(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-white/[0.06] ${className}`}
      style={{ height }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-none"
        style={{
          width: `${p * 100}%`,
          background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
          boxShadow: `0 0 10px ${color}66`,
        }}
      />
    </div>
  );
}
