-- Per-store color override (NULL means "use the hashed default").
alter table public.stores add column if not exists color text;

-- Goals: explicit single-user mode. Supabase tooling sometimes flips
-- RLS on without policies, which blocks all writes — this guarantees
-- the goals table follows the same pattern as the rest of the schema.
alter table public.goals disable row level security;
