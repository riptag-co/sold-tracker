"use client";

// No route-change animation. Per-section animate-fade-up on each page
// provides the motion. Anything wrapped here would add perceived lag.
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
