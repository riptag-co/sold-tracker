"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/stats", label: "Stats" },
  { href: "/stores", label: "Stores" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="px-4 pt-7 pb-4 max-w-2xl mx-auto animate-fade-in">
      {/* Centered, distinctive wordmark */}
      <div className="flex justify-center mb-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 select-none"
        >
          <span
            className="font-rounded text-[13px] font-bold tracking-[0.32em] text-white/95"
          >
            SOLD
          </span>
          <span
            className="font-display italic text-[15px] font-light text-white/50 -mx-0.5 -mt-0.5"
          >
            ·
          </span>
          <span
            className="font-rounded text-[13px] font-bold tracking-[0.32em] text-white/95"
          >
            TRACKER
          </span>
          <span className="live-dot ml-1.5" aria-hidden />
        </Link>
      </div>

      {/* iOS segmented control */}
      <nav className="flex gap-0.5 p-1 rounded-full bg-white/[0.04] border border-line text-[13px] backdrop-blur-md">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 text-center px-3 py-2 rounded-full font-semibold transition-all duration-300 ease-ios-spring ${
                active
                  ? "bg-white text-[#0A0A0B] shadow-[0_2px_10px_-2px_rgba(255,255,255,0.28)]"
                  : "text-text-2 hover:text-white active:scale-95"
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
