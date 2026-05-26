import Nav from "@/components/Nav";
import StoresEditor from "./StoresEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, username, display_name, avg_price_minor, currency")
    .order("username");

  return (
    <>
      <Nav />
      <main className="px-4 pb-20 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mt-4 mb-1 tracking-tight">Stores</h1>
        <p className="text-[14px] text-text-2 mb-6 leading-relaxed">
          Add the Depop usernames you want to track. Average price drives the
          revenue estimate (sales × avg).
        </p>
        <StoresEditor initial={stores ?? []} />
      </main>
    </>
  );
}
