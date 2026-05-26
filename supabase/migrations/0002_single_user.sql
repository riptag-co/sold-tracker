-- Single-user mode: rip out RLS, auth.users FKs, and per-user
-- partitioning. There's exactly one user (the dashboard owner). The
-- user_id columns stick around but auto-fill to a constant so existing
-- edge-function code that selects/joins on user_id keeps working
-- unchanged.

-- Disable RLS everywhere.
alter table public.stores         disable row level security;
alter table public.snapshots      disable row level security;
alter table public.fetch_errors   disable row level security;
alter table public.device_tokens  disable row level security;
alter table public.pair_codes     disable row level security;

-- Drop owner policies (no longer needed).
drop policy if exists "stores: owner read"   on public.stores;
drop policy if exists "stores: owner insert" on public.stores;
drop policy if exists "stores: owner update" on public.stores;
drop policy if exists "stores: owner delete" on public.stores;
drop policy if exists "snapshots: owner read" on public.snapshots;
drop policy if exists "errors: owner read"   on public.fetch_errors;
drop policy if exists "tokens: owner read"   on public.device_tokens;
drop policy if exists "tokens: owner delete" on public.device_tokens;
drop policy if exists "pair: owner read"   on public.pair_codes;
drop policy if exists "pair: owner insert" on public.pair_codes;
drop policy if exists "pair: owner delete" on public.pair_codes;

-- Drop FKs to auth.users — the constant default below isn't a real user.
alter table public.stores        drop constraint if exists stores_user_id_fkey;
alter table public.device_tokens drop constraint if exists device_tokens_user_id_fkey;
alter table public.pair_codes    drop constraint if exists pair_codes_user_id_fkey;

-- Drop the per-user uniqueness; replace with global username uniqueness.
alter table public.stores drop constraint if exists stores_user_id_username_key;
alter table public.stores add constraint  stores_username_key unique (username);

-- Default user_id to a single sentinel UUID so inserts without auth.uid() work.
alter table public.stores        alter column user_id set default '00000000-0000-0000-0000-000000000001';
alter table public.device_tokens alter column user_id set default '00000000-0000-0000-0000-000000000001';
alter table public.pair_codes    alter column user_id set default '00000000-0000-0000-0000-000000000001';

-- Backfill any rows that snuck in pre-migration.
update public.stores        set user_id = '00000000-0000-0000-0000-000000000001' where user_id is null;
update public.device_tokens set user_id = '00000000-0000-0000-0000-000000000001' where user_id is null;
update public.pair_codes    set user_id = '00000000-0000-0000-0000-000000000001' where user_id is null;
