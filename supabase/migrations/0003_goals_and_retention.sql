-- Goals table + bump snapshot retention from 95 days to 2 years so
-- long-term trends stay intact.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default '00000000-0000-0000-0000-000000000001',
  -- Optional store scope. NULL means "across all stores".
  store_id uuid references public.stores(id) on delete cascade,
  -- 'day' | 'week' | 'month'
  period text not null check (period in ('day', 'week', 'month')),
  -- 'sales' (count) | 'revenue' (cents, computed via store avg_price)
  metric text not null check (metric in ('sales', 'revenue')),
  -- Sales count or revenue in cents (matches metric).
  target int not null check (target > 0),
  label text,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id);

-- Bump retention. 2 years of snapshots at 5-minute polling for 10
-- shops is still under ~600k rows — well within free-tier comfort.
create or replace function public.prune_old_snapshots()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.snapshots
  where taken_at < now() - interval '730 days';
$$;
