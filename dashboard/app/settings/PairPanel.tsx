"use client";

import { useState } from "react";

export default function PairPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pair-code", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setCode(body.code);
      setExpiresAt(Date.parse(body.expires_at));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const ttl =
    expiresAt && code
      ? Math.max(0, Math.floor((expiresAt - Date.now()) / 60_000))
      : 0;

  return (
    <div>
      {code ? (
        <div className="text-center animate-scale-in">
          <div className="text-[11px] text-text-3 mb-3 font-medium">
            Expires in {ttl}m
          </div>
          <div className="num text-[44px] sm:text-[52px] tracking-[0.18em] font-bold py-2 select-all">
            {code}
          </div>
          <button className="ghost mt-4" onClick={generate} disabled={loading}>
            Generate new code
          </button>
        </div>
      ) : (
        <button className="pill" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate pairing code"}
        </button>
      )}
      {error && <div className="text-[13px] text-red-300/90 mt-3">{error}</div>}
    </div>
  );
}
