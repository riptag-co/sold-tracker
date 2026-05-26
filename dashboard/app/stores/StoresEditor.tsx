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
    const usernames = [...new Set(normalize(adding))].filter(
      (u) => !stores.some((s) => s.username === u),
    );
    if (usernames.length === 0) return;

    const { data, error } = await supabase
      .from("stores")
      .insert(usernames.map((username) => ({ username })))
      .select("id, username, display_name, avg_price_minor, currency");
    if (error) {
      setError(error.message);
      return;
    }
    setStores((prev) =>
      [...prev, ...(data ?? [])].sort((a, b) =>
        a.username.localeCompare(b.username),
      ),
    );
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

  async function updateField(id: string, patch: Partial<Store>) {
    setError(null);
    const prev = stores;
    setStores((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("stores").update(patch).eq("id", id);
    if (error) {
      setError(error.message);
      setStores(prev);
      throw error;
    }
  }

  return (
    <>
      <section className="glass p-6 mb-4 animate-fade-up">
        <label className="block text-[14px] font-semibold mb-1.5 tracking-tight">
          Add shops
        </label>
        <div className="text-[12.5px] text-text-3 mb-3 leading-relaxed">
          One Depop username per line, or comma-separated.
        </div>
        <textarea
          rows={3}
          className="field font-mono text-[14px]"
          placeholder="beverlyclub&#10;myothershop"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
        />
        <div className="flex justify-between items-center mt-4">
          <span className="text-[12px] text-red-300/90">{error ?? ""}</span>
          <button
            className="pill"
            onClick={addStores}
            disabled={pending || !adding.trim()}
          >
            Add
          </button>
        </div>
      </section>

      {stores.length === 0 ? (
        <div className="glass p-7 text-center text-text-2 text-[14px]">
          No shops added yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {stores.map((s, i) => (
            <div
              key={s.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <StoreRow
                store={s}
                onRemove={() => removeStore(s.id)}
                onUpdate={(patch) => updateField(s.id, patch)}
              />
            </div>
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
  onUpdate: (patch: Partial<Store>) => Promise<void>;
}) {
  const [name, setName] = useState(store.display_name ?? "");
  const [price, setPrice] = useState(
    store.avg_price_minor != null ? (store.avg_price_minor / 100).toString() : "",
  );
  const [savedFlash, setSavedFlash] = useState(false);

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  async function commitName() {
    const v = name.trim() || null;
    if (v !== (store.display_name ?? null)) {
      try {
        await onUpdate({ display_name: v });
        flashSaved();
      } catch { /* error shown at top of editor */ }
    }
  }

  async function commitPrice() {
    const n = parseFloat(price);
    const minor =
      Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
    if (minor !== store.avg_price_minor) {
      try {
        await onUpdate({ avg_price_minor: minor });
        flashSaved();
      } catch { /* error shown at top of editor */ }
    }
  }

  return (
    <div className="glass p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="font-semibold truncate text-[16px] tracking-tight">
            {store.username}
          </div>
          <a
            href={`https://www.depop.com/${encodeURIComponent(store.username)}/`}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-text-3 hover:text-white transition-colors"
          >
            depop.com/{store.username}
          </a>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[11px] text-emerald-300 transition-opacity duration-300 ${
              savedFlash ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
          <button className="ghost" onClick={onRemove}>Remove</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] text-text-3 font-medium block mb-1.5">
            Display name
          </span>
          <input
            className="field text-[14px]"
            type="text"
            placeholder="optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-text-3 font-medium block mb-1.5">
            Avg price ({store.currency})
          </span>
          <input
            className="field text-[14px] num-tight"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 28.50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={commitPrice}
          />
        </label>
      </div>
    </div>
  );
}
