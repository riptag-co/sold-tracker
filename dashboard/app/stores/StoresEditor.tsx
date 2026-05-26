"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STORE_PALETTE, colorForStore } from "@/lib/colors";
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
      .select("id, username, display_name, avg_price_minor, currency, color");
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
      console.error("Store update failed", patch, error);
      setError(`${error.message} — did you run migration 0004?`);
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
  const [price, setPrice] = useState(
    store.avg_price_minor != null ? (store.avg_price_minor / 100).toString() : "",
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const currentColor = colorForStore(store);

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  async function commitPrice() {
    const n = parseFloat(price);
    const minor =
      Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
    if (minor !== store.avg_price_minor) {
      try {
        await onUpdate({ avg_price_minor: minor });
        flashSaved();
      } catch { /* error shown at top */ }
    }
  }

  async function setColor(color: string | null) {
    if (color === (store.color ?? null)) return;
    try {
      await onUpdate({ color });
      flashSaved();
    } catch { /* error shown at top */ }
  }

  return (
    <div className="glass p-5 relative overflow-hidden">
      {/* Subtle accent stripe on the left edge using the store color */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: currentColor }}
      />

      <div className="flex items-start justify-between gap-3 mb-4 pl-2">
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

      <div className="pl-2 space-y-4">
        {/* Color picker */}
        <div>
          <div className="text-[11px] text-text-3 font-medium mb-2">
            Color
          </div>
          <div className="flex flex-wrap gap-2">
            <SwatchAuto
              selected={store.color == null}
              autoColor={currentColor}
              onClick={() => setColor(null)}
            />
            {STORE_PALETTE.map((c) => (
              <Swatch
                key={c}
                color={c}
                selected={store.color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Avg price */}
        <label className="block">
          <span className="text-[11px] text-text-3 font-medium block mb-2">
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

function Swatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick color ${color}`}
      className={`w-7 h-7 rounded-full transition-all duration-200 ease-ios-spring relative active:scale-90 ${
        selected
          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0B]"
          : "hover:scale-110"
      }`}
      style={{
        background: color,
        boxShadow: selected ? `0 0 14px ${color}88` : `0 0 0 rgba(0,0,0,0)`,
      }}
    />
  );
}

function SwatchAuto({
  selected,
  autoColor,
  onClick,
}: {
  selected: boolean;
  autoColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Auto color"
      className={`w-7 h-7 rounded-full transition-all duration-200 ease-ios-spring relative flex items-center justify-center text-[9px] font-bold tracking-wider active:scale-90 ${
        selected
          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0B]"
          : "hover:scale-110"
      }`}
      style={{
        background: `conic-gradient(from 0deg, hsl(0,70%,60%), hsl(60,70%,60%), hsl(120,70%,60%), hsl(180,70%,60%), hsl(240,70%,60%), hsl(300,70%,60%), hsl(0,70%,60%))`,
      }}
    >
      <span
        className="bg-[#0A0A0B] rounded-full w-4 h-4 flex items-center justify-center text-white"
        style={{ fontSize: "8px" }}
      >
        A
      </span>
    </button>
  );
}
