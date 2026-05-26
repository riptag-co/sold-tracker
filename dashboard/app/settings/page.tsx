import PairPanel from "./PairPanel";
import DevicesPanel from "./DevicesPanel";
import PinPanel from "./PinPanel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    { data: tokens },
    { data: errors },
    { data: stores },
    { data: control },
  ] = await Promise.all([
    supabase
      .from("device_tokens")
      .select("id, label, created_at, last_used_at, revoked_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("fetch_errors")
      .select("store_id, message, occurred_at")
      .order("occurred_at", { ascending: false }),
    supabase.from("stores").select("id, username"),
    supabase.from("control").select("pin_hash").eq("id", 1).maybeSingle(),
  ]);

  const hasPin = !!control?.pin_hash;

  const storesById = new Map((stores ?? []).map((s) => [s.id, s.username as string]));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="px-5 sm:px-4 pb-20 max-w-2xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold mt-1 sm:mt-4 mb-1 tracking-tight">Settings</h1>

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

      <section
        className="glass p-6 animate-fade-up"
        style={{ animationDelay: "90ms" }}
      >
        <h2 className="text-[16px] font-semibold mb-1 tracking-tight">
          Passcode
        </h2>
        <PinPanel hasPin={hasPin} />
      </section>

      {/* Issues — live errors from the extension's last poll */}
      <section
        className="glass p-6 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-[16px] font-semibold mb-1 tracking-tight">Issues</h2>
        {(errors ?? []).length === 0 ? (
          <p className="text-[13px] text-text-3">
            All stores are responding normally.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(errors ?? []).map((e) => (
              <li
                key={e.store_id}
                className="flex items-start gap-2 text-[13px] leading-relaxed"
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    background: "#F87171",
                    boxShadow: "0 0 8px rgba(248,113,113,0.7)",
                  }}
                />
                <div className="min-w-0">
                  <div className="font-semibold" style={{ color: "#F87171" }}>
                    @{storesById.get(e.store_id) ?? "?"}
                  </div>
                  <div className="text-text-2 mt-0.5">{e.message}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
