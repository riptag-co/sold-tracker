// iOS lock-screen widget for Sold Tracker, via the free Scriptable app.
//
// Setup:
//   1. Install "Scriptable" from the App Store.
//   2. Open Scriptable → tap + → paste this entire file.
//   3. Change DASHBOARD_URL below to your Railway URL.
//   4. Save (top-right). Optionally rename the script to "Sold Tracker".
//   5. Add a Scriptable widget to your lock screen or home screen
//      (long-press → edit → add widget → Scriptable → pick this script).
//   6. The widget refreshes every 5–10 minutes automatically.

const DASHBOARD_URL = "https://sold-tracker-production.up.railway.app";

const widget = await buildWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();

async function buildWidget() {
  let data;
  try {
    const req = new Request(`${DASHBOARD_URL}/api/widget`);
    data = await req.loadJSON();
  } catch (e) {
    return errorWidget(`couldn't reach dashboard`);
  }

  const w = new ListWidget();
  w.backgroundColor = new Color("#000000");
  w.setPadding(14, 16, 14, 16);

  // Header line
  const header = w.addStack();
  const title = header.addText("SOLD TRACKER");
  title.font = Font.semiboldSystemFont(9);
  title.textColor = new Color("#ffffff", 0.5);
  header.addSpacer();
  const stamp = header.addText(timeAgo(data.updated_at));
  stamp.font = Font.regularSystemFont(9);
  stamp.textColor = new Color("#ffffff", 0.4);

  w.addSpacer(6);

  // Huge today count
  const count = w.addText(String(data.today_sold ?? 0));
  count.font = Font.boldRoundedSystemFont(36);
  count.textColor = new Color("#ffffff");

  const label = w.addText("sold today");
  label.font = Font.regularSystemFont(11);
  label.textColor = new Color("#ffffff", 0.55);

  w.addSpacer(4);

  // Revenue + pace
  const sub = w.addStack();
  const rev = sub.addText(formatMoney(data.today_revenue_minor, data.currency));
  rev.font = Font.semiboldSystemFont(13);
  rev.textColor = new Color("#ffffff", 0.85);
  sub.addSpacer();
  if (data.pace_projected != null && data.pace_projected > (data.today_sold ?? 0)) {
    const pace = sub.addText(`→ ${data.pace_projected}`);
    pace.font = Font.regularSystemFont(11);
    pace.textColor = new Color("#ffffff", 0.55);
  }

  w.addSpacer();

  // Top 3 stores
  const top = (data.stores ?? []).slice(0, 3);
  for (const s of top) {
    const row = w.addStack();
    row.layoutHorizontally();
    const name = row.addText(s.display_name || s.username);
    name.font = Font.regularSystemFont(10);
    name.textColor = new Color("#ffffff", 0.65);
    name.lineLimit = 1;
    row.addSpacer();
    const n = row.addText(String(s.today));
    n.font = Font.semiboldSystemFont(10);
    n.textColor = new Color("#ffffff", 0.9);
    w.addSpacer(2);
  }

  w.refreshAfterDate = new Date(Date.now() + 5 * 60_000);
  return w;
}

function formatMoney(minor, currency) {
  if (minor == null || minor === 0) return "$0";
  const c = currency || "USD";
  const sym = c === "USD" ? "$" : c === "GBP" ? "£" : c === "EUR" ? "€" : "";
  const major = minor / 100;
  if (major >= 1000) {
    return `${sym}${(major / 1000).toFixed(1)}k`;
  }
  return `${sym}${major.toFixed(major % 1 === 0 ? 0 : 2)}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000");
  const t = w.addText("Sold Tracker");
  t.font = Font.semiboldSystemFont(11);
  t.textColor = new Color("#ffffff", 0.5);
  w.addSpacer(4);
  const m = w.addText(msg);
  m.font = Font.regularSystemFont(12);
  m.textColor = new Color("#ff8080");
  return w;
}
