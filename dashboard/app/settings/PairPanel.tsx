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
        <div className="text-center py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-3 mb-2">
            Pairing code — expires in {ttl}m
          </div>
          <div className="text-4xl font-mono tracking-[0.3em] font-semibold py-2">
            {code}
          </div>
          <button className="ghost mt-3" onClick={generate} disabled={loading}>
            Generate new code
          </button>
        </div>
      ) : (
        <button className="pill" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate pairing code"}
        </button>
      )}
      {error && <div className="text-sm text-red-300 mt-3">{error}</div>}
    </div>
  );
}
