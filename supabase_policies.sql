-- ─── VisionStream — Row Level Security policies ───────────────────────────────
-- Run this once in your Supabase project:  SQL Editor → New query → paste → Run.
--
-- Why: the schema enabled RLS on api_keys and requests but never added policies,
-- so the browser (anon key + your login) is blocked from reading or creating
-- keys. These policies let a signed-in user manage ONLY their own rows.
-- The API server uses the service-role key, which bypasses RLS, so metering and
-- key validation keep working unchanged.

alter table public.api_keys  enable row level security;
alter table public.requests  enable row level security;

-- ── api_keys: a user can see and manage only their own keys ──────────────────
drop policy if exists "api_keys_select_own" on public.api_keys;
drop policy if exists "api_keys_insert_own" on public.api_keys;
drop policy if exists "api_keys_update_own" on public.api_keys;
drop policy if exists "api_keys_delete_own" on public.api_keys;

create policy "api_keys_select_own" on public.api_keys
  for select using (auth.uid() = user_id);

create policy "api_keys_insert_own" on public.api_keys
  for insert with check (auth.uid() = user_id);

create policy "api_keys_update_own" on public.api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "api_keys_delete_own" on public.api_keys
  for delete using (auth.uid() = user_id);

-- ── requests: a user can read usage rows tied to their own keys ──────────────
drop policy if exists "requests_select_own" on public.requests;

create policy "requests_select_own" on public.requests
  for select using (
    exists (
      select 1 from public.api_keys k
      where k.id = requests.api_key_id
        and k.user_id = auth.uid()
    )
  );
