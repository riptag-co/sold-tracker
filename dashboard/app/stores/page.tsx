import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StoresEditor from "./StoresEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, username, display_name, avg_price_minor, currency")
    .order("username");

  return (
    <>
      <Nav email={user.email ?? null} />
      <main className="px-4 pb-10 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-1">Stores</h1>
        <p className="text-sm text-text-2 mb-5">
          Add the Depop usernames you want to track. The optional
          average price is used to estimate revenue (count × avg).
        </p>
        <StoresEditor initial={stores ?? []} />
      </main>
    </>
  );
}
