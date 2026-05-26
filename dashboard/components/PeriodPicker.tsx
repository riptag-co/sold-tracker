"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Period = "day" | "week" | "month";

const ORDER: Period[] = ["day", "week", "month"];
const LETTER: Record<Period, string> = { day: "D", week: "W", month: "M" };
const LABEL: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
};

// Small circular picker. Optionally draws a progress ring around it
// showing the "main goal" completion (independent of the picked period).
export default function PeriodPicker({
  value,
  onChange,
  progress,
  progressColor = "#34D399",
}: {
  value: Period;
  onChange: (p: Period) => void;
  progress?: number | null; // 0..1+
  progressColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function recompute() {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    setPos({
      top: r.bottom + 8 + window.scrollY,
      left: r.left + window.scrollX,
    });
  }

  function toggle() {
    if (!open) recompute();
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = triggerRef.current;
      const p = panelRef.current;
      if (
        t && !t.contains(e.target as Node) &&
        p && !p.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open]);

  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress ?? 0));
  const showRing = progress != null && progress > 0;

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-label={`Period: ${LABEL[value]}`}
        title={LABEL[value]}
        className="relative inline-flex items-center justify-center active:scale-95 transition-transform"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          {showRing && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={progressColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ - circ * p}
              style={{
                filter: `drop-shadow(0 0 6px ${progressColor}55)`,
                transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          )}
        </svg>
        <span
          className="inline-flex items-center justify-center rounded-full text-[12px] font-bold tracking-wider"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.92)",
            width: size - 12,
            height: size - 12,
          }}
        >
          {LETTER[value]}
        </span>
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#1B1B22",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 16,
                padding: "4px 0",
                minWidth: 140,
                boxShadow:
                  "0 24px 60px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              {ORDER.map((opt) => {
                const selected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#fff",
                      background: selected
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{LABEL[opt]}</span>
                    {selected && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ color: "#34D399" }}
                      >
                        <path
                          d="M2.5 6.5L5 9L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
