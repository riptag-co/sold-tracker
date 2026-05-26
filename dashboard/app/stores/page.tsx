import Link from "next/link";
import StoresEditor from "./StoresEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, username, display_name, avg_price_minor, currency, color, avatar_url")
    .is("deleted_at", null)
    .order("username");

  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mt-1 sm:mt-4 mb-3 sm:mb-4 tracking-tight">Stores</h1>
      <StoresEditor initial={stores ?? []} />

      {/* Settings — lives at the bottom of Stores instead of in the top tab bar */}
      <Link
        href="/settings"
        className="glass mt-5 px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.36.6.96.98 1.55 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.55 1z" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight">Settings</span>
        </div>
        <span className="text-text-3 text-[20px] leading-none">›</span>
      </Link>
    </main>
  );
}
