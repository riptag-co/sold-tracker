"use client";

import { useEffect, useRef, useState } from "react";

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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`bg-white/[0.04] border border-line-strong rounded-full pl-4 pr-3 py-2 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:bg-white/[0.07] transition-colors active:scale-[0.97] ${
          open ? "bg-white/[0.07]" : ""
        }`}
      >
        <span className="truncate max-w-[180px]">{current?.label ?? "Select"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          className={`opacity-70 transition-transform duration-300 ease-ios-spring ${open ? "rotate-180" : ""}`}
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

      {open && (
        <div
          className="absolute top-full left-0 mt-2 min-w-[180px] glass !rounded-2xl py-1.5 z-50 animate-scale-in origin-top-left overflow-hidden"
          role="listbox"
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
                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  selected
                    ? "text-white bg-white/[0.06]"
                    : "text-text-2 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-money flex-shrink-0 ml-2">
                    <path
                      d="M2.5 6.5L5 9L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
