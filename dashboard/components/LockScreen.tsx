"use client";

import { useEffect, useState } from "react";
import { sha256Hex } from "@/lib/lock";

const PIN_LENGTH = 4;

export default function LockScreen({
  pinHash,
  title = "Enter Passcode",
  onSuccess,
  // Used by the "Set PIN" flow — no hash to compare, just collect digits.
  collectMode = false,
  onCollect,
}: {
  pinHash?: string;
  title?: string;
  onSuccess?: () => void;
  collectMode?: boolean;
  onCollect?: (pin: string) => void;
}) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (entered.length !== PIN_LENGTH) return;
    if (collectMode) {
      const pin = entered;
      // small delay so the 4th dot fills visibly before we hand off
      const t = window.setTimeout(() => {
        onCollect?.(pin);
        setEntered("");
      }, 120);
      return () => window.clearTimeout(t);
    }
    if (!pinHash) return;
    let cancelled = false;
    (async () => {
      const hash = await sha256Hex(entered);
      if (cancelled) return;
      if (hash === pinHash) {
        if ("vibrate" in navigator) navigator.vibrate(8);
        onSuccess?.();
      } else {
        if ("vibrate" in navigator) navigator.vibrate([15, 30, 15]);
        setError(true);
        window.setTimeout(() => {
          setEntered("");
          setError(false);
        }, 500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entered, pinHash, collectMode, onCollect, onSuccess]);

  function press(d: string) {
    if (entered.length >= PIN_LENGTH) return;
    setEntered((s) => s + d);
  }
  function backspace() {
    setEntered((s) => s.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 z-[100] bg-ink flex flex-col items-center justify-center px-6 select-none">
      {/* Wordmark */}
      <div className="mb-12 flex items-center gap-2.5 animate-fade-in">
        <span className="font-rounded text-[11px] font-bold tracking-[0.32em] text-white/85">
          SOLD
        </span>
        <span className="font-display italic text-[13px] font-light text-white/45 -mx-0.5 -mt-0.5">
          ·
        </span>
        <span className="font-rounded text-[11px] font-bold tracking-[0.32em] text-white/85">
          TRACKER
        </span>
      </div>

      <div className="text-[15px] text-text-2 mb-8 font-medium">{title}</div>

      <div className={`flex gap-5 mb-14 ${error ? "animate-shake" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < entered.length;
          return (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full transition-all duration-150"
              style={{
                background: filled
                  ? error
                    ? "#F87171"
                    : "#ffffff"
                  : "transparent",
                border: filled
                  ? "2px solid transparent"
                  : "2px solid rgba(255,255,255,0.45)",
                transform: filled ? "scale(1.05)" : "scale(1)",
              }}
            />
          );
        })}
      </div>

      {/* iOS-style number pad */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PadKey key={d} onClick={() => press(d)}>
            {d}
          </PadKey>
        ))}
        <div />
        <PadKey onClick={() => press("0")}>0</PadKey>
        <button
          onClick={backspace}
          disabled={entered.length === 0}
          aria-label="Delete"
          className="w-[72px] h-[72px] inline-flex items-center justify-center text-white/80 active:text-white transition-colors disabled:opacity-30"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 5H8l-7 7 7 7h13a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PadKey({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-[72px] h-[72px] rounded-full text-[32px] font-light text-white transition-all active:scale-95"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onPointerDown={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.16)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
    >
      {children}
    </button>
  );
}
