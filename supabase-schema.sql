-- CraftLedger — Supabase schema
-- Run the WHOLE file once in: Supabase Dashboard → SQL Editor → New query → Run.
-- It is safe to re-run: every statement is idempotent.
--
-- Sections:
--   1. profiles   — one row per user, holds their workshop settings
--   2. entries    — the ledger lines (sales and expenses)
--   3. trigger    — auto-creates a profile row the moment a user signs up
--   4. indexes    — keep reads fast as the books grow
--   5. RLS        — the wall between one artisan's books and another's

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  business_name text        not null default '',
  currency      text        not null default 'NGN',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. entries
--    Amounts are stored as integers in minor units (kobo, cents) — no floats.
--    The constraints below are the database refusing to record nonsense:
--    amounts must be positive, the type must be one of the two we know.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.entries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  type         text        not null check (type in ('income', 'expense')),
  entry_date   date        not null,
  description  text        not null check (char_length(description) between 1 and 500),
  category     text        not null check (char_length(category) between 1 and 100),
  amount_minor bigint      not null check (amount_minor > 0),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. trigger — create a profile automatically on sign-up
--    security definer lets the trigger insert into profiles even though the
--    new user has no rights yet; search_path is pinned to public for safety.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest on every profile write.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. indexes — the books page reads "my entries, newest first"
-- ─────────────────────────────────────────────────────────────────────────
create index if not exists entries_user_date_idx
  on public.entries (user_id, entry_date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security  —  this is the part that matters most.
--    With RLS on, every query is rewritten server-side to "...and the row
--    belongs to the caller". One artisan physically cannot read or change
--    another's books, even if the frontend forgot to filter.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- profiles: a user sees and edits only their own row
drop policy if exists "profiles select own"  on public.profiles;
drop policy if exists "profiles insert own"  on public.profiles;
drop policy if exists "profiles update own"  on public.profiles;

create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- entries: a user reads, adds, edits and deletes only their own lines
drop policy if exists "entries select own" on public.entries;
drop policy if exists "entries insert own" on public.entries;
drop policy if exists "entries update own" on public.entries;
drop policy if exists "entries delete own" on public.entries;

create policy "entries select own"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "entries insert own"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "entries update own"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "entries delete own"
  on public.entries for delete
  using (auth.uid() = user_id);
