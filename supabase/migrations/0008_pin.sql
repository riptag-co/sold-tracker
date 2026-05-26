-- Optional 4-digit PIN guarding the dashboard UI. The PIN itself is
-- never stored — only its SHA-256 hash. Treat this as casual privacy
-- (keeps phone snoopers out), not real security: the underlying
-- Supabase data is still served via the anon API.

alter table public.control add column if not exists pin_hash text;

-- Belt-and-braces: re-disable RLS in case Supabase's UI flipped it
-- back on when we added new columns. Single-user mode = no policies.
alter table public.control disable row level security;
