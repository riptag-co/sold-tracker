// Per-shop color. If the user picked one explicitly we use it. Otherwise
// we derive a stable hue from the username, avoiding the money-green
// band (130–175°) so the per-store dot doesn't clash with the $ accent.

const SKIP_LO = 130;
const SKIP_HI = 175;

export function hueFromUsername(username: string): number {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (h * 31 + username.charCodeAt(i)) >>> 0;
  }
  let hue = h % 360;
  if (hue >= SKIP_LO && hue <= SKIP_HI) {
    hue = (hue + 60) % 360;
  }
  return hue;
}

export function colorForUsername(username: string, alpha = 1): string {
  const hue = hueFromUsername(username);
  return alpha < 1
    ? `hsla(${hue}, 72%, 64%, ${alpha})`
    : `hsl(${hue}, 72%, 64%)`;
}

export function colorForStore(
  store: { username: string; color?: string | null },
): string {
  return store.color || colorForUsername(store.username);
}

// Curated palette for the color picker — vibrant on dark, none near
// money-green so the per-store tint stays distinct from the $ accent.
export const STORE_PALETTE = [
  "#FF6B6B", // red
  "#FF9F43", // orange
  "#FFC93C", // amber
  "#5B8DEF", // blue
  "#26C6DA", // teal
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#FF8AA1", // rose
  "#A78BFA", // lavender
  "#9CA3AF", // gray
  "#F4F4F5", // white
];
