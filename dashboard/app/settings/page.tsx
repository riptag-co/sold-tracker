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
      <main className="px-4 pb-10 max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold mb-1">Settings</h1>

        <section className="glass p-5">
          <h2 className="text-sm font-semibold mb-1">Pair extension</h2>
          <p className="text-sm text-text-2 mb-4">
            Open the extension&apos;s settings page in Chrome, paste the
            URL and code below.
          </p>
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-3 font-semibold mb-1">
              Dashboard URL
            </div>
            <code className="block bg-white/[0.04] border border-line rounded-lg px-3 py-2 text-sm font-mono break-all">
              {supabaseUrl}
            </code>
          </div>
          <PairPanel />
        </section>

        <section className="glass p-5">
          <h2 className="text-sm font-semibold mb-3">Paired devices</h2>
          <DevicesPanel initial={tokens ?? []} />
        </section>
      </main>
    </>
  );
}
