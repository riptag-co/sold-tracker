import Nav from "@/components/Nav";
import PairPanel from "./PairPanel";
import DevicesPanel from "./DevicesPanel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("id, label, created_at, last_used_at, revoked_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <>
      <Nav />
      <main className="px-4 pb-20 max-w-2xl mx-auto space-y-3">
        <h1 className="text-2xl font-bold mt-4 mb-1 tracking-tight">Settings</h1>

        <section className="glass p-6 animate-fade-up">
          <h2 className="text-[16px] font-semibold mb-1 tracking-tight">
            Pair extension
          </h2>
          <p className="text-[13px] text-text-2 mb-5 leading-relaxed">
            Open the Sold Tracker extension in Chrome, paste the URL and code below.
          </p>
          <div className="mb-5">
            <div className="text-[11px] text-text-3 font-medium mb-1.5">
              Dashboard URL
            </div>
            <code className="block bg-white/[0.04] border border-line rounded-xl px-4 py-3 text-[13px] font-mono break-all">
              {supabaseUrl}
            </code>
          </div>
          <PairPanel />
        </section>

        <section className="glass p-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-[16px] font-semibold mb-3 tracking-tight">
            Paired devices
          </h2>
          <DevicesPanel initial={tokens ?? []} />
        </section>
      </main>
    </>
  );
}
