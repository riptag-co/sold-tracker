// Thin wrapper around the three Supabase edge functions the extension
// calls: /pair, /ingest, /dashboard-data. Pairing config lives in
// chrome.storage.local under three keys:
//   supabaseUrl  - e.g. https://abcde.supabase.co
//   deviceToken  - long-lived bearer the extension sends with every push
//   userId       - informational; shown in the options page

export async function getPairing() {
  const { supabaseUrl, deviceToken, userId } =
    await chrome.storage.local.get(["supabaseUrl", "deviceToken", "userId"]);
  return { supabaseUrl, deviceToken, userId };
}

export async function isPaired() {
  const { supabaseUrl, deviceToken } = await getPairing();
  return Boolean(supabaseUrl && deviceToken);
}

export async function clearPairing() {
  await chrome.storage.local.remove(["supabaseUrl", "deviceToken", "userId"]);
}

function fnUrl(base, name) {
  return `${base.replace(/\/$/, "")}/functions/v1/${name}`;
}

// POST /pair — swap a 6-digit code for a long-lived token. Requires
// the caller to know which Supabase project URL to talk to up front,
// which is why the options page asks for it alongside the code.
export async function pair(supabaseUrl, code, label) {
  const res = await fetch(fnUrl(supabaseUrl, "pair"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, label }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `pair failed (HTTP ${res.status})`);
  await chrome.storage.local.set({
    supabaseUrl,
    deviceToken: body.token,
    userId: body.user_id,
  });
  return body;
}

// POST /ingest — push a batch of poll results.
export async function ingest(results) {
  const { supabaseUrl, deviceToken } = await getPairing();
  if (!supabaseUrl || !deviceToken) throw new Error("not paired");
  const res = await fetch(fnUrl(supabaseUrl, "ingest"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${deviceToken}`,
    },
    body: JSON.stringify({ results }),
  });
  if (res.status === 401) {
    // Token was revoked — drop it so the user re-pairs.
    await clearPairing();
    throw new Error("device token rejected — re-pair in settings");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `ingest failed (HTTP ${res.status})`);
  return body;
}

// GET /dashboard-data — read the same blob the dashboard reads.
export async function fetchDashboardData() {
  const { supabaseUrl, deviceToken } = await getPairing();
  if (!supabaseUrl || !deviceToken) throw new Error("not paired");
  const res = await fetch(fnUrl(supabaseUrl, "dashboard-data"), {
    headers: { authorization: `Bearer ${deviceToken}` },
  });
  if (res.status === 401) {
    await clearPairing();
    throw new Error("device token rejected — re-pair in settings");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `read failed (HTTP ${res.status})`);
  return body;
}
