# Sold Tracker — Chrome Extension

Tracks daily, weekly, and monthly sold counts across multiple Depop
shops, polling in the background from inside your logged-in browser
session. No server, no `.bat`, no JSON files. Works while shops are
closed in tabs or not even open.

## Install (one time, ~30 seconds)

1. Open Chrome and go to <chrome://extensions>.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Pick this folder: `depop-sold-extension`.
5. The extension icon (puzzle piece) appears in the toolbar. Click the
   pin icon next to it to keep it visible.

## First-time setup

1. Click the extension icon → it'll say "No shops yet" → click **Add
   shops**.
2. Paste your Depop usernames, one per line:
   ```
   beverlyclub
   myothershop
   anotherone
   ```
3. Click **Save**.
4. Re-open the popup. First snapshot lands within a few seconds. Daily
   numbers start counting from now.

## How it works

- A service worker fires every 5 minutes (configurable in settings)
  and fetches each shop's public profile page from inside your logged-in
  browser. Cloudflare lets it through because your session cookies are
  attached automatically.
- Each fetch records a snapshot of the shop's lifetime sold count.
  Daily / weekly / monthly are computed as `MAX − MIN` of snapshots in
  that window — exact, not estimated.
- Data lives in `chrome.storage.local`, so it survives closing tabs,
  quitting Chrome, and restarting your PC. (Uninstalling the extension
  clears it.)

## If Cloudflare ever blocks a fetch

A red-ish dot on a shop card with `blocked (HTTP …)` means your session
needs a refresh. Just open <https://www.depop.com> in any tab and click
around once — Cloudflare will re-issue your clearance cookie and the
next poll will succeed.

## Settings

Click the gear icon in the popup to:
- Add or remove shops
- Change the refresh interval (minimum 1 minute)
