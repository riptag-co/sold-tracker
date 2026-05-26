"use client";

// Quick fade between routes. The per-section fade-up animations on
// each page provide the bulk of the motion; this just smooths the
// route swap without delaying interaction.
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-route-fade">
      {children}
    </div>
  );
}
