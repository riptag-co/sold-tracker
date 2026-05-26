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
    <header className="px-4 pt-6 pb-2 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-tight">
            Sold Tracker
          </span>
          <span className="live-dot" aria-hidden />
        </Link>
      </div>

      <nav className="mt-5 flex gap-1 p-1 rounded-full bg-white/[0.04] border border-line text-[13px] backdrop-blur-md">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 text-center px-3 py-2 rounded-full font-medium transition-all duration-200 ease-ios-spring ${
                active
                  ? "bg-white text-[#0A0A0B] shadow-[0_2px_8px_-2px_rgba(255,255,255,0.25)]"
                  : "text-text-2 hover:text-white"
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
