# Sold Tracker — Setup

Three pieces:

```
depop-sold-extension/   Chrome extension (the data collector)
dashboard/              Next.js web app (the phone-friendly UI)
supabase/               Database schema + serverless functions
```

Top to bottom, expect **30–45 minutes** the first time.

---

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> (free tier is plenty).
2. **New project** → pick any name + region. Save the database password
   somewhere; you won't need it day-to-day but Supabase will ask if
   you ever reset things.
3. Once the project is provisioned, go to **Project Settings → API**
   and grab these three values — you'll paste them into the dashboard
   and the Supabase CLI later:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key
   - **service_role secret** key (NEVER ship this to the browser; it's
     server-only)

### Run the schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Click **Run**. You should see "Success. No rows returned."

### Enable realtime on snapshots

So the dashboard updates the moment the extension pushes:

1. **Database → Replication** in the Supabase sidebar.
2. Find the `supabase_realtime` publication.
3. Toggle on `snapshots` and `fetch_errors`. Save.

### Deploy the edge functions

Install the Supabase CLI once:

```sh
npm i -g supabase
```

Then from the repo root:

```sh
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>     # the bit before .supabase.co
supabase functions deploy pair --no-verify-jwt
supabase functions deploy ingest --no-verify-jwt
supabase functions deploy dashboard-data --no-verify-jwt
```

The functions read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
the Supabase project's secret store. Those are populated automatically
— no extra config.

---

## 2. Deploy the dashboard to Vercel

1. Push this repo to GitHub.
2. <https://vercel.com/new> → import the repo.
3. **Root Directory**: `dashboard`
4. **Framework**: Next.js (auto-detected)
5. **Environment Variables** — add all three from `dashboard/.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
   SUPABASE_SERVICE_ROLE_KEY       = eyJ...
   ```
6. **Deploy**.

After it builds, open the Vercel URL on your phone, tap the share
sheet, **Add to Home Screen** — looks like a native app.

### Configure the auth redirect

Magic-link logins need to come back to your Vercel URL.

1. In Supabase: **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g. `https://sold-tracker.vercel.app`).
3. Under **Redirect URLs** add: `https://YOUR-VERCEL-URL/auth/callback`.

### Local dev

```sh
cd dashboard
cp .env.example .env.local      # fill in the three values
npm install
npm run dev
```

---

## 3. Update the Chrome extension

1. Open <chrome://extensions> and remove the old "Sold Tracker"
   extension if it's loaded.
2. Click **Load unpacked** and pick the `depop-sold-extension` folder
   in this repo.
3. Pin the puzzle-piece icon to the toolbar.

---

## 4. Pair the extension to your account

1. Open your dashboard URL (Vercel) and sign in with your email
   (magic-link arrives in ~10s).
2. Go to **Stores** → add the Depop usernames you want to track.
   Optionally set a display name and an average sale price per store
   (used to estimate revenue as `count × avg_price`).
3. Go to **Settings → Pair extension** → click **Generate pairing
   code**. You get a 6-digit code valid for 10 minutes.
4. Click the extension icon in Chrome → gear icon → paste:
   - Your Supabase project URL (also shown on the Settings page).
   - The 6-digit code.
   - Hit **Pair**.
5. Within ~5s the first snapshot lands. Open the dashboard on your
   phone — totals appear and update live.

---

## Day-to-day

- The extension polls every 5 minutes (configurable in its options).
- Daily/weekly/monthly numbers are computed as `MAX − MIN` of the
  snapshot history in each window — exact, not estimated.
- If Cloudflare ever blocks a fetch you'll see a red dot on the
  store's card. Open <https://www.depop.com> in any tab, click around
  once, the next poll succeeds.
- Revoke a paired extension any time under **Settings → Paired devices**.

## What's free

- Supabase free tier: 500 MB database, 50k auth users, 2 GB egress.
  At a 5-minute poll across 10 stores you'll generate ~3k snapshot
  rows/day — call it ~1 MB/month. The 95-day prune cron keeps it
  bounded.
- Vercel hobby tier: unlimited bandwidth for personal use, plenty of
  build minutes.

## Optional: schedule the snapshot prune

The schema includes `prune_old_snapshots()`. Run it weekly via
Supabase's **Database → Cron** (pg_cron):

```sql
select cron.schedule('prune-old-snapshots', '0 4 * * 0',
  $$ select public.prune_old_snapshots(); $$);
```

(Sunday 4am UTC — adjust as you like.)
