-- CraftLedger — migration: add a per-user `profiles` table
-- Run ONCE in the SQL Editor (Dashboard → SQL Editor → New query → Run),
-- after the books schema/migration. Safe to re-run — every statement is
-- idempotent.
--
-- Why:
--   auth.users is owned by Supabase and you can't attach app columns to it or
--   read it from the client. The standard pattern is a public `profiles` table,
--   keyed 1:1 to auth.users, that the app can read and edit. A row is created
--   automatically for every new user by the sign-up trigger, and one is
--   back-filled for every existing user at the bottom of this file.

begin;

-- 1. profiles table -------------------------------------------------------
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text        not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- An older (v1) profiles table may already exist with different columns, so
-- `create table if not exists` above would have been a no-op. Add the columns
-- this app needs, idempotently, so the table ends up the right shape either way.
alter table public.profiles
  add column if not exists email      text,
  add column if not exists full_name  text        not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2. RLS — a user sees and edits only their own profile -------------------
alter table public.profiles enable row level security;
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3. keep updated_at honest (reuses the shared touch function) ------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 4. sign-up handler now creates BOTH a profile and a starter book --------
--    (security definer so it can write past RLS during the auth insert)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;

  insert into public.books (user_id, name)
  values (new.id, 'My ledger');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. back-fill a profile for every existing user --------------------------
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do nothing;

commit;
