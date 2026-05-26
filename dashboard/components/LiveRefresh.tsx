"use client";

// Subscribes to Supabase realtime on the snapshots table. When the
// extension pushes a new row, we just call router.refresh() — the
// server component re-renders with the latest data, no client-side
// state to manage.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("snapshots")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "snapshots" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fetch_errors" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
