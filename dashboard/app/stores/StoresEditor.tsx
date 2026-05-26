"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STORE_PALETTE, colorForStore } from "@/lib/colors";
import { formatMoneyMinor, type Store } from "@/lib/stats";
import Avatar from "@/components/Avatar";

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
    const candidates = [...new Set(normalize(adding))];
    if (candidates.length === 0) return;

    // Find any existing rows (including soft-deleted) so we don't
    // violate the unique-username constraint and so we restore data
    // when the same username is re-added.
    const { data: existing, error: lookupErr } = await supabase
      .from("stores")
      .select("id, username, deleted_at")
      .in("username", candidates);

    if (lookupErr) {
      setError(lookupErr.message);
      return;
    }

    const existingByName = new Map(
      (existing ?? []).map((e) => [e.username, e]),
    );
    const toReactivate = (existing ?? [])
      .filter((e) => e.deleted_at != null)
      .map((e) => e.id);
    const toInsert = candidates.filter((u) => !existingByName.has(u));

    if (toReactivate.length > 0) {
      const { error: e } = await supabase
        .from("stores")
        .update({ deleted_at: null })
        .in("id", toReactivate);
      if (e) {
        setError(e.message);
        return;
      }
    }
    if (toInsert.length > 0) {
      const { error: e } = await supabase
        .from("stores")
        .insert(toInsert.map((username) => ({ username })));
      if (e) {
        setError(e.message);
        return;
      }
    }

    // Re-pull the active list so local state reflects reality.
    const { data: fresh } = await supabase
      .from("stores")
      .select("id, username, display_name, avg_price_minor, currency, color, avatar_url")
      .is("deleted_at", null)
      .order("username");
    if (fresh) setStores(fresh as Store[]);
    setAdding("");
    startTransition(() => router.refresh());
  }

  async function softRemoveStore(id: string) {
    setError(null);
    const prev = stores;
    setStores(prev.filter((s) => s.id !== id));
    const { error } = await supabase
      .from("stores")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
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
      {stores.length === 0 ? (
        <div className="glass p-7 text-center text-text-2 text-[14px] mb-4">
          No shops added yet.
        </div>
      ) : (
        <div className="grid gap-2 mb-4">
          {stores.map((s, i) => (
            <div
              key={s.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <StoreRow
                store={s}
                onRemove={() => softRemoveStore(s.id)}
                onUpdate={(patch) => updateField(s.id, patch)}
              />
            </div>
          ))}
        </div>
      )}

      <section className="glass p-6 animate-fade-up">
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
    </>
  );
}

type Expanded = "color" | "price" | "avatar" | null;

function StoreRow({
  store,
  onRemove,
  onUpdate,
}: {
  store: Store;
  onRemove: () => void;
  onUpdate: (patch: Partial<Store>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [price, setPrice] = useState(
    store.avg_price_minor != null
      ? (store.avg_price_minor / 100).toString()
      : "",
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Two-tap remove confirm.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | null>(null);
  function handleRemove() {
    if (armed) {
      if (armTimer.current) window.clearTimeout(armTimer.current);
      setArmed(false);
      onRemove();
      return;
    }
    setArmed(true);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmed(false), 3000);
  }

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

  async function uploadAvatar(file: File) {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Pick a JPEG or PNG image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("Image is too large (8 MB max).");
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 192, 0.8);
      await onUpdate({ avatar_url: dataUrl });
      flashSaved();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : String(e));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarError(null);
    try {
      await onUpdate({ avatar_url: null });
      flashSaved();
    } catch { /* shown at top */ }
  }

  const priceDisplay =
    store.avg_price_minor != null
      ? formatMoneyMinor(store.avg_price_minor, store.currency)
      : "Set";

  return (
    <div className="glass p-4">
      {/* Header: avatar + username + remove */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            url={store.avatar_url}
            username={store.username}
            color={currentColor}
            size={40}
          />
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
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-[11px] text-emerald-300 transition-opacity duration-300 ${
              savedFlash ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
          <button
            onClick={handleRemove}
            className="rounded-full text-[11.5px] font-semibold transition-all active:scale-95"
            style={{
              padding: "6px 12px",
              background: armed ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.05)",
              border: armed
                ? "1px solid rgba(248,113,113,0.55)"
                : "1px solid rgba(255,255,255,0.16)",
              color: armed ? "#FCA5A5" : "rgba(255,255,255,0.75)",
            }}
          >
            {armed ? "Confirm" : "Remove"}
          </button>
        </div>
      </div>

      {/* Compact edit buttons */}
      <div className="flex gap-2 flex-wrap">
        <CompactButton
          active={expanded === "color"}
          onClick={() => setExpanded(expanded === "color" ? null : "color")}
          leading={
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: currentColor }}
            />
          }
          label="Color"
        />
        <CompactButton
          active={expanded === "price"}
          onClick={() => setExpanded(expanded === "price" ? null : "price")}
          label={priceDisplay ?? "Set"}
          mono
        />
        <CompactButton
          active={expanded === "avatar"}
          onClick={() => setExpanded(expanded === "avatar" ? null : "avatar")}
          leading={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          }
          label="Avatar"
        />
      </div>

      {/* Expanded editors */}
      {expanded === "color" && (
        <div className="mt-4 animate-fade-up">
          <div className="text-[11px] text-text-3 font-medium mb-2">Color</div>
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
      )}

      {expanded === "price" && (
        <div className="mt-4 animate-fade-up">
          <div className="text-[11px] text-text-3 font-medium mb-2">
            Avg price ({store.currency})
          </div>
          <input
            className="field text-[14px] num-tight"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 28.50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={commitPrice}
            autoFocus
          />
        </div>
      )}

      {expanded === "avatar" && (
        <div className="mt-4 animate-fade-up">
          <div className="text-[11px] text-text-3 font-medium mb-2">
            Avatar image
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label
              className="inline-flex items-center gap-2 rounded-full cursor-pointer transition-all active:scale-95"
              style={{
                padding: "8px 14px",
                background: avatarBusy
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={avatarBusy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await uploadAvatar(f);
                  e.target.value = "";
                }}
              />
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {avatarBusy ? "Uploading…" : store.avatar_url ? "Replace image" : "Upload image"}
            </label>
            {store.avatar_url && (
              <button
                type="button"
                onClick={removeAvatar}
                className="text-[12px] text-text-3 hover:text-red-300 transition-colors px-2 py-1"
              >
                Remove
              </button>
            )}
          </div>
          {avatarError && (
            <div className="text-[12px] text-red-300/90 mt-2">{avatarError}</div>
          )}
          <div className="text-[11px] text-text-3 mt-2 leading-relaxed">
            JPEG, PNG, or WebP. Resized to 192×192 and saved with this shop.
          </div>
        </div>
      )}
    </div>
  );
}

function CompactButton({
  active,
  onClick,
  leading,
  label,
  mono = false,
}: {
  active: boolean;
  onClick: () => void;
  leading?: React.ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full transition-all active:scale-95"
      style={{
        padding: "6px 12px",
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: mono
          ? '"SF Mono", ui-monospace, Menlo, monospace'
          : undefined,
      }}
    >
      {leading && <span className="inline-flex">{leading}</span>}
      <span>{label}</span>
    </button>
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

// Load an image file, fit it into a maxSize×maxSize box (preserving
// aspect ratio), and return a JPEG data URL. ~10-15 KB at 192/q0.8 —
// fine to stash in the avatar_url text column directly.
async function resizeImageToDataUrl(
  file: File,
  maxSize: number,
  quality: number,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("could not read file"));
    r.readAsDataURL(file);
  });
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("could not decode image"));
    img.src = dataUrl;
  });
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
