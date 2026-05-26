import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import GestureLayer from "@/components/GestureLayer";
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
  // Latest snapshot across all stores determines extension liveness.
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("snapshots")
    .select("taken_at")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestT = latest?.taken_at ? Date.parse(latest.taken_at) : null;

  return (
    <html lang="en" className="antialiased">
      <body>
        <div className="ambient" />
        <Nav latestSnapshotT={latestT} />
        <GestureLayer />
        {children}
      </body>
    </html>
  );
}
