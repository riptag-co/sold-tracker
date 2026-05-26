-- Sold Tracker schema.
--
-- Users come from Supabase Auth (auth.users). Each user owns a set of
-- stores (Depop usernames they're tracking). The extension paired to
-- their account pushes monotonic lifetime sold-count snapshots; the
-- dashboard reads those snapshots and computes today/week/month as
-- MAX(c) - MIN(c) within each window. Revenue is estimated as
-- sale_count * avg_price.

create extension if not exists pgcrypto;

-- ============================================================
-- stores: a Depop username a user is tracking
-- ============================================================
create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  -- Defaults to the calling user so the dashboard can `insert {username}`
  -- without redundantly sending user_id. RLS still enforces the match.
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  username      text not null,
  display_name  text,
  -- Average sale price in minor units (cents). Used to estimate revenue
  -- as (sales in window) * avg_price_minor. NULL means "don't show $".
  avg_price_minor int,
  currency      text not null default 'USD',
  created_at    timestamptz not null default now(),
  unique (user_id, username)
);

create index stores_user_idx on public.stores (user_id);

-- ============================================================
-- snapshots: one row per poll, per store
-- ============================================================
create table public.snapshots (
  id          bigserial primary key,
  store_id    uuid not null references public.stores(id) on delete cascade,
  taken_at    timestamptz not null default now(),
  sold_count  int not null check (sold_count >= 0)
);

create index snapshots_store_time_idx
  on public.snapshots (store_id, taken_at desc);

-- ============================================================
-- fetch_errors: last error per store (overwritten on each failure)
-- ============================================================
create table public.fetch_errors (
  store_id    uuid primary key references public.stores(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  message     text not null
);

-- ============================================================
-- device_tokens: long-lived bearer tokens the extension uses to push.
-- ============================================================
-- We store only a SHA-256 hash of the token, never the raw value, so a
-- DB leak doesn't expose live credentials. The raw token is shown to
-- the user exactly once during pairing.
create table public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,
  label       text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz
);

create index device_tokens_user_idx on public.device_tokens (user_id);

-- ============================================================
-- pair_codes: short-lived 6-digit codes for the pairing handshake.
-- ============================================================
-- Dashboard creates a row, shows the code to the user, user types it
-- into the extension. The /pair edge function validates, mints a token,
-- and deletes the code. Codes expire after 10 minutes.
create table public.pair_codes (
  code        text primary key,        -- 6 digits, e.g. "428193"
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index pair_codes_user_idx on public.pair_codes (user_id);

-- ============================================================
-- Row-Level Security
-- ============================================================
-- Authenticated users (dashboard) can only read/write their own rows.
-- The extension does NOT use these policies; it goes through edge
-- functions that authenticate via device_tokens and use the service
-- role to insert on the user's behalf.

alter table public.stores         enable row level security;
alter table public.snapshots      enable row level security;
alter table public.fetch_errors   enable row level security;
alter table public.device_tokens  enable row level security;
alter table public.pair_codes     enable row level security;

-- stores: full CRUD for owner
create policy "stores: owner read"   on public.stores
  for select using (auth.uid() = user_id);
create policy "stores: owner insert" on public.stores
  for insert with check (auth.uid() = user_id);
create policy "stores: owner update" on public.stores
  for update using (auth.uid() = user_id);
create policy "stores: owner delete" on public.stores
  for delete using (auth.uid() = user_id);

-- snapshots: read-only for the owning user (extension writes via service role)
create policy "snapshots: owner read" on public.snapshots
  for select using (
    exists (
      select 1 from public.stores s
      where s.id = snapshots.store_id and s.user_id = auth.uid()
    )
  );

-- fetch_errors: read-only for the owning user
create policy "errors: owner read" on public.fetch_errors
  for select using (
    exists (
      select 1 from public.stores s
      where s.id = fetch_errors.store_id and s.user_id = auth.uid()
    )
  );

-- device_tokens: owner can list and revoke their own tokens. They
-- cannot read token_hash directly via PostgREST because we'll never
-- expose that column to the dashboard (handled in views).
create policy "tokens: owner read"   on public.device_tokens
  for select using (auth.uid() = user_id);
create policy "tokens: owner delete" on public.device_tokens
  for delete using (auth.uid() = user_id);

-- pair_codes: owner can create + view their own codes. The /pair edge
-- function uses service role to look up codes regardless of auth.uid().
create policy "pair: owner read"   on public.pair_codes
  for select using (auth.uid() = user_id);
create policy "pair: owner insert" on public.pair_codes
  for insert with check (auth.uid() = user_id);
create policy "pair: owner delete" on public.pair_codes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Helper: prune snapshots older than 95 days (cron'd separately)
-- ============================================================
create or replace function public.prune_old_snapshots()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.snapshots
  where taken_at < now() - interval '95 days';
$$;
