import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import GestureLayer from "@/components/GestureLayer";
import LockGate from "@/components/LockGate";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sold Tracker",
  description: "Live Depop sold-count dashboard across all your shops.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [{ data: latest }, { data: control }] = await Promise.all([
    supabase
      .from("snapshots")
      .select("taken_at")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("control").select("pin_hash").eq("id", 1).maybeSingle(),
  ]);
  const latestT = latest?.taken_at ? Date.parse(latest.taken_at) : null;
  const pinHash = (control?.pin_hash as string | null) ?? null;

  return (
    <html lang="en" className="antialiased">
      <body>
        <div className="ambient" />
        <LockGate pinHash={pinHash}>
          <Nav latestSnapshotT={latestT} />
          <GestureLayer />
          {children}
        </LockGate>
      </body>
    </html>
  );
}
