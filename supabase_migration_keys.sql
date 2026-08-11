-- ─── VisionStream — API key hashing migration (Phase A) ──────────────────────
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Moves api_keys from storing the raw key to storing only a SHA-256 hash plus a
-- short display prefix. Existing keys are backfilled so they keep working.

create extension if not exists pgcrypto;

-- 1. Add the new columns.
alter table public.api_keys add column if not exists key_hash   text;
alter table public.api_keys add column if not exists key_prefix text;

-- 1b. The old plaintext column must no longer be required — new keys don't set it.
alter table public.api_keys alter column key_value drop not null;

-- 2. Backfill existing plaintext keys → hash + prefix (so current keys still auth).
update public.api_keys
   set key_hash   = encode(digest(key_value, 'sha256'), 'hex'),
       key_prefix = left(key_value, 12)
 where key_hash is null
   and key_value is not null;

-- 3. Enforce uniqueness on the hash.
create unique index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

-- 4. Remove the shared demo key — it must not exist in production.
delete from public.api_keys where name = 'Test Key';

-- 5. (Optional, do AFTER you've confirmed key generation + auth work.)
--    Drop the plaintext column entirely:
-- alter table public.api_keys drop column key_value;
