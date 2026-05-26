# Sold Tracker

Track sold counts across multiple Depop shops, on a phone-friendly
dashboard you can pin to your home screen.

```
┌─ Chrome extension ─────┐    ┌─ Supabase ────┐    ┌─ Dashboard ─┐
│ Polls depop.com from   │ →  │ Postgres +    │ →  │ Next.js on  │
│ inside your logged-in  │    │ Edge Functions│    │ Vercel      │
│ browser every 5 min    │    │ + Realtime    │    │ (phone PWA) │
└────────────────────────┘    └───────────────┘    └─────────────┘
```

The extension is the only piece that talks to Depop — it sits inside
your logged-in browser, so Cloudflare lets every fetch through. Stats
are computed as `MAX(sold_count) − MIN(sold_count)` over each time
window (today / week / month) because Depop's lifetime counter only
goes up.

Revenue is estimated as `sale_count × avg_price_per_store`, set per
shop on the **Stores** page.

## Repo layout

| Folder | What |
| --- | --- |
| `depop-sold-extension/` | The Chrome extension (data collector + popup). |
| `dashboard/` | Next.js 15 + Tailwind, deployed to Vercel. |
| `supabase/` | SQL migration + three Edge Functions (`pair`, `ingest`, `dashboard-data`). |

## First-time setup

See [SETUP.md](SETUP.md) — copy/paste step-by-step (~30 min).

## Multi-user

The schema uses Row-Level Security. Each Supabase Auth user only ever
sees their own stores, snapshots, and tokens. Hand a friend the
dashboard URL, they sign up with their email, pair their own
extension instance — done.
