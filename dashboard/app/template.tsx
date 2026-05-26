"use client";

// Re-renders on every route change so each page gets a fresh slide-in
// animation. Cheaper than framer-motion for this one effect.
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
