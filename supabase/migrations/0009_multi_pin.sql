-- Multi-PIN support: store an array of valid SHA-256 hashes so the
-- dashboard can accept multiple unlock codes (useful when sharing a
-- shop with someone or having a "guest" PIN). Existing single-hash
-- value is migrated into the new array column.

alter table public.control add column if not exists pin_hashes text[];

update public.control
set pin_hashes = array[pin_hash]
where pin_hash is not null
  and (pin_hashes is null or array_length(pin_hashes, 1) is null);
