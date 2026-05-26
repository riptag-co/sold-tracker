-- Avatar URL (manual paste for now; extension can populate later by
-- scraping the profile page) and soft-delete via deleted_at.
--
-- Soft delete preserves snapshot history — removing a store from the
-- UI just hides it; re-adding the same username restores the row with
-- all its data intact.

alter table public.stores add column if not exists avatar_url text;
alter table public.stores add column if not exists deleted_at timestamptz;

-- Index helps the very common "active stores" lookup.
create index if not exists stores_active_idx
  on public.stores (deleted_at)
  where deleted_at is null;
