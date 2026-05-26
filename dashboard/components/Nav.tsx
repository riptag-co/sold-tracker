"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/stores", label: "Stores" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="px-4 pt-5 pb-3 max-w-3xl mx-auto">
      <Link href="/" className="text-[10px] font-semibold tracking-[0.3em] uppercase text-text-2">
        SOLD<span className="inline-block w-1 h-1 rounded-full bg-white mx-2 align-middle" />TRACKER
      </Link>
      <nav className="mt-4 flex gap-1 text-[11px] uppercase tracking-[0.16em]">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-full transition-colors ${
                active
                  ? "bg-white text-black font-semibold"
                  : "text-text-2 border border-line-strong hover:text-white"
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
