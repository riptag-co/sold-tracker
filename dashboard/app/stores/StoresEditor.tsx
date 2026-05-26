"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/lib/stats";

export default function StoresEditor({ initial }: { initial: Store[] }) {
  const [stores, setStores] = useState(initial);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  function normalize(input: string) {
    return input
      .split(/[\n,]/)
      .map((s) => s.trim().replace(/^@/, "").replace(/\s/g, "").toLowerCase())
      .filter(Boolean);
  }

  async function addStores() {
    setError(null);
    const usernames = [
      ...new Set(normalize(adding)),
    ].filter((u) => !stores.some((s) => s.username === u));
    if (usernames.length === 0) return;

    const { data, error } = await supabase
      .from("stores")
      .insert(usernames.map((username) => ({ username })))
      .select("id, username, display_name, avg_price_minor, currency");
    if (error) {
      setError(error.message);
      return;
    }
    setStores((prev) => [...prev, ...(data ?? [])].sort((a, b) =>
      a.username.localeCompare(b.username),
    ));
    setAdding("");
    startTransition(() => router.refresh());
  }

  async function removeStore(id: string) {
    setError(null);
    const prev = stores;
    setStores(prev.filter((s) => s.id !== id));
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setStores(prev);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function updateField(
    id: string,
    patch: Partial<Store>,
  ) {
    setError(null);
    const prev = stores;
    setStores((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("stores").update(patch).eq("id", id);
    if (error) {
      setError(error.message);
      setStores(prev);
    }
  }

  return (
    <>
      <section className="glass p-5 mb-4">
        <label className="block text-[10px] uppercase tracking-[0.18em] text-text-3 font-semibold mb-2">
          Add shops
          <span className="block normal-case tracking-normal font-normal text-[11px] text-text-3 mt-1">
            One Depop username per line, or comma-separated.
          </span>
        </label>
        <textarea
          rows={3}
          className="field font-mono"
          placeholder="beverlyclub&#10;myothershop"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-red-300">{error ?? ""}</span>
          <button className="pill" onClick={addStores} disabled={pending || !adding.trim()}>
            Add
          </button>
        </div>
      </section>

      {stores.length === 0 ? (
        <div className="glass p-5 text-center text-text-2 text-sm">No shops added yet.</div>
      ) : (
        <div className="grid gap-2">
          {stores.map((s) => (
            <StoreRow
              key={s.id}
              store={s}
              onRemove={() => removeStore(s.id)}
              onUpdate={(patch) => updateField(s.id, patch)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function StoreRow({
  store,
  onRemove,
  onUpdate,
}: {
  store: Store;
  onRemove: () => void;
  onUpdate: (patch: Partial<Store>) => void;
}) {
  const [name, setName] = useState(store.display_name ?? "");
  const [price, setPrice] = useState(
    store.avg_price_minor != null ? (store.avg_price_minor / 100).toString() : "",
  );

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{store.username}</div>
          <a
            href={`https://www.depop.com/${encodeURIComponent(store.username)}/`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-text-3 hover:text-white"
          >
            depop.com/{store.username}
          </a>
        </div>
        <button className="ghost" onClick={onRemove}>Remove</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[10px] uppercase tracking-[0.16em] text-text-3 font-semibold">
          Display name
          <input
            className="field mt-1 text-sm font-normal normal-case tracking-normal"
            type="text"
            placeholder="optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const v = name.trim() || null;
              if (v !== (store.display_name ?? null)) {
                onUpdate({ display_name: v });
              }
            }}
          />
        </label>
        <label className="text-[10px] uppercase tracking-[0.16em] text-text-3 font-semibold">
          Avg price ({store.currency})
          <input
            className="field mt-1 text-sm font-normal normal-case tracking-normal"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 28.50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => {
              const n = parseFloat(price);
              const minor = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
              if (minor !== store.avg_price_minor) {
                onUpdate({ avg_price_minor: minor });
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
