// Deterministic per-shop color. Same username always gets the same hue,
// so the dot/tint stays stable across the dashboard.
//
// Avoids hues that clash with the money-green accent (140–170) by
// rotating around them.

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

export function softTintForUsername(username: string): string {
  return colorForUsername(username, 0.16);
}

export function rgbaFromHueComponents(hue: number, alpha = 1): string {
  return `hsla(${hue}, 72%, 64%, ${alpha})`;
}
