"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type DropdownOption<T extends string> = { value: T; label: string };

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  function recomputePosition() {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    setPos({
      top: r.bottom + 8 + window.scrollY,
      left: r.left + window.scrollX,
      minWidth: Math.max(200, r.width),
    });
  }

  function toggle() {
    if (!open) {
      recomputePosition();
    }
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
    function onScrollOrResize() {
      recomputePosition();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        style={{
          background: open ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
        className="rounded-full pl-4 pr-3 py-2 text-[13px] font-semibold text-white inline-flex items-center gap-2 transition-colors active:scale-[0.97]"
      >
        <span className="truncate max-w-[160px]">{current?.label ?? "Select"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          className={`opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="animate-dropdown-in origin-top-left"
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#1B1B22",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 16,
                padding: "4px 0",
                maxHeight: 260,
                overflowY: "auto",
                boxShadow:
                  "0 24px 60px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#ffffff",
                      background: selected ? "rgba(255,255,255,0.08)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: 8,
                      }}
                    >
                      {o.label}
                    </span>
                    {selected && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ color: "#34D399", flexShrink: 0 }}
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
