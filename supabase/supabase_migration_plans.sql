-- ─── VisionStream — plan/quota migration (Phase B) ───────────────────────────
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Adds a per-key plan so the API can enforce the Free/Pro/Team monthly quotas.
-- (Plan is per-key for now; per-user billing arrives with Stripe in Phase C.)

alter table public.api_keys
  add column if not exists plan text not null default 'free';

-- Optional: helps the monthly usage count stay fast as the requests table grows.
create index if not exists requests_key_created_idx
  on public.requests (api_key_id, created_at);

-- To test the Pro tier on one of your keys, find its id in the dashboard/table
-- and run (replace the prefix):
--   update public.api_keys set plan = 'pro' where key_prefix = 'vs_live_abcd';
