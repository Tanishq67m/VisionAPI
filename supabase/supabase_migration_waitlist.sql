-- ─── VisionStream — waitlist (lean launch) ───────────────────────────────────
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Captures early-access emails from the landing page. Anyone can insert; nobody
-- can read the list except you (via the service role / dashboard).

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz default now()
);

create unique index if not exists waitlist_email_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Allow anonymous + signed-in visitors to submit their email (insert only).
drop policy if exists waitlist_insert_public on public.waitlist;
create policy waitlist_insert_public on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- No select policy → the list is private (read it in the Supabase table editor).
