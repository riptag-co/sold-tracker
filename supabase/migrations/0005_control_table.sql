-- Singleton table for cross-device control signals between the
-- dashboard and the extension. Right now it just carries the timestamp
-- of the most recent manual-refresh request. The extension polls this
-- table every ~30s and triggers an immediate Depop poll whenever it
-- sees a newer timestamp than what it last acted on.

create table if not exists public.control (
  id int primary key default 1,
  manual_refresh_at timestamptz,
  constraint control_singleton check (id = 1)
);

-- Seed the singleton row.
insert into public.control (id) values (1) on conflict (id) do nothing;

-- Same single-user mode as the rest of the schema — RLS off.
alter table public.control disable row level security;
