import { clearPairing, getPairing, pair } from "./lib/api.js";

const urlEl = document.getElementById("supabase-url");
const codeEl = document.getElementById("pair-code");
const pairMsg = document.getElementById("pair-msg");
const pairBtn = document.getElementById("pair-btn");
const pairPanel = document.getElementById("pair-panel");
const pairedPanel = document.getElementById("paired-panel");
const pairedInfo = document.getElementById("paired-info");
const unpairBtn = document.getElementById("unpair-btn");

const refreshEl = document.getElementById("refresh");
const savedMsg = document.getElementById("saved-msg");
const saveBtn = document.getElementById("save-refresh");

function setMsg(el, text, kind = "") {
  el.textContent = text;
  el.classList.remove("error", "ok");
  if (kind) el.classList.add(kind);
}

async function renderPairingState() {
  const { supabaseUrl, deviceToken, userId } = await getPairing();
  if (supabaseUrl && deviceToken) {
    pairPanel.classList.add("hidden");
    pairedPanel.classList.remove("hidden");
    pairedInfo.textContent = `${supabaseUrl}\nUser: ${userId ?? "—"}`;
  } else {
    pairPanel.classList.remove("hidden");
    pairedPanel.classList.add("hidden");
  }
}

async function loadRefresh() {
  const { refreshMinutes = 5 } = await chrome.storage.local.get("refreshMinutes");
  refreshEl.value = refreshMinutes;
}

pairBtn.addEventListener("click", async () => {
  const url = urlEl.value.trim();
  const code = codeEl.value.trim();
  setMsg(pairMsg, "");

  if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(url)) {
    setMsg(pairMsg, "Enter your Supabase project URL.", "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    setMsg(pairMsg, "Pairing code must be 6 digits.", "error");
    return;
  }

  pairBtn.disabled = true;
  setMsg(pairMsg, "Pairing…");
  try {
    await pair(url, code, navigator.userAgent.slice(0, 80));
    setMsg(pairMsg, "Paired", "ok");
    urlEl.value = "";
    codeEl.value = "";
    await renderPairingState();
  } catch (e) {
    setMsg(pairMsg, e.message || String(e), "error");
  } finally {
    pairBtn.disabled = false;
  }
});

unpairBtn.addEventListener("click", async () => {
  await clearPairing();
  await renderPairingState();
});

saveBtn.addEventListener("click", async () => {
  let n = parseInt(refreshEl.value, 10);
  if (!Number.isFinite(n) || n < 1) n = 5;
  if (n > 120) n = 120;
  refreshEl.value = n;
  await chrome.storage.local.set({ refreshMinutes: n });
  setMsg(savedMsg, "Saved", "ok");
  setTimeout(() => setMsg(savedMsg, ""), 1400);
});

// Re-render if pairing state changes from elsewhere (e.g. background
// clears the token after a 401).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.deviceToken || changes.supabaseUrl)) {
    renderPairingState();
  }
});

renderPairingState();
loadRefresh();
