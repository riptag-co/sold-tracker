"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DeviceToken = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function DevicesPanel({ initial }: { initial: DeviceToken[] }) {
  const [tokens, setTokens] = useState(initial);
  const router = useRouter();

  async function revoke(id: string) {
    const supabase = createClient();
    const prev = tokens;
    setTokens(tokens.filter((t) => t.id !== id));
    const { error } = await supabase.from("device_tokens").delete().eq("id", id);
    if (error) {
      setTokens(prev);
      alert(error.message);
      return;
    }
    router.refresh();
  }

  if (tokens.length === 0) {
    return (
      <div className="text-sm text-text-2">
        No paired devices yet. Generate a code above and enter it in the
        extension&apos;s settings page.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {tokens.map((t) => (
        <li key={t.id} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {t.label || "Unlabeled device"}
            </div>
            <div className="text-[11px] text-text-3 mt-0.5">
              Paired {new Date(t.created_at).toLocaleDateString()}
              {t.last_used_at &&
                ` · last used ${relTime(t.last_used_at)}`}
            </div>
          </div>
          <button className="ghost" onClick={() => revoke(t.id)}>Revoke</button>
        </li>
      ))}
    </ul>
  );
}

function relTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
