// PIN hashing + trusted-device helpers. Trust is a single timestamp in
// localStorage; once a device unlocks correctly we extend trust for
// TRUST_DAYS so the user isn't prompted again until expiry.

export const TRUST_DAYS = 30;
export const TRUST_KEY = "st-trust-until";

export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isDeviceTrusted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(TRUST_KEY);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function trustDevice(days = TRUST_DAYS): void {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + days * 86_400_000;
    window.localStorage.setItem(TRUST_KEY, String(until));
  } catch {
    /* localStorage blocked — fine, will just re-prompt next load */
  }
}

export function untrustDevice(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TRUST_KEY);
  } catch {
    /* ignore */
  }
}
