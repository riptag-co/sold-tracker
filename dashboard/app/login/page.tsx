"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass p-7 w-full max-w-sm animate-rise">
        <div
          className="text-[10px] font-semibold tracking-[0.3em] uppercase text-text-2 mb-5"
        >
          SOLD<span className="inline-block w-1 h-1 rounded-full bg-white mx-2 align-middle" />TRACKER
        </div>
        <h1 className="text-xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-text-2 mb-6">
          We&apos;ll email you a magic link. No password.
        </p>

        {sent ? (
          <div className="text-sm text-text-2">
            Check <span className="text-white">{email}</span> for a sign-in
            link. You can close this tab.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              className="field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div className="text-sm text-red-300">{error}</div>}
            <button type="submit" className="pill w-full" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
