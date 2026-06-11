-- CraftLedger — Supabase schema (v2, multi-book)
-- Run the WHOLE file once in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent.
--
-- ⚠️  Already running the v1 schema (with a `profiles` table)?  Do NOT run this
--     file — run `supabase-migration-books.sql` instead, which upgrades v1 to v2
--     without losing the entries you already have.
--
-- Model:
--   books    — a user can keep several ledger books (Personal, Work, Kid…),
--              each with its own name, colour and currency.
--   entries  — the ledger lines; every entry belongs to one book (and one user).
--   trigger  — gives each new user a starter book so they're never bookless.
--   RLS      — the wall between one person's books and everyone else's.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. books
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.books (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users (id) on delete cascade,
  name                  text        not null default 'My ledger' check (char_length(name) between 1 and 80),
  color                 text        not null default 'indigo',
  currency              text        not null default 'NGN',
  -- NRS tax settings (see utils/tax.ts)
  vat_registered        boolean     not null default true,
  prices_vat_inclusive  boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists books_user_idx on public.books (user_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. entries
--    Amounts are integers in minor units (kobo, cents) — no floats.
--    book_id ties every line to exactly one book; deleting a book takes its
--    entries with it (on delete cascade).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.entries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  book_id      uuid        not null references public.books (id) on delete cascade,
  type         text        not null check (type in ('income', 'expense')),
  entry_date   date        not null,
  description  text        not null check (char_length(description) between 1 and 500),
  category     text        not null check (char_length(category) between 1 and 100),
  amount_minor bigint      not null check (amount_minor > 0),
  created_at   timestamptz not null default now()
);

create index if not exists entries_book_date_idx on public.entries (book_id, entry_date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. triggers
--    a) Every new user gets one starter book.
--    b) Keep books.updated_at honest.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.books (user_id, name)
  values (new.id, 'My ledger');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security  —  the part that matters most.
--    Every query is rewritten server-side to "...and this row is mine".
-- ─────────────────────────────────────────────────────────────────────────
alter table public.books   enable row level security;
alter table public.entries enable row level security;

-- books: a user sees and changes only their own books
drop policy if exists "books select own" on public.books;
drop policy if exists "books insert own" on public.books;
drop policy if exists "books update own" on public.books;
drop policy if exists "books delete own" on public.books;

create policy "books select own" on public.books for select using (auth.uid() = user_id);
create policy "books insert own" on public.books for insert with check (auth.uid() = user_id);
create policy "books update own" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books delete own" on public.books for delete using (auth.uid() = user_id);

-- entries: only your own lines, and only filed under a book that is also yours
drop policy if exists "entries select own" on public.entries;
drop policy if exists "entries insert own" on public.entries;
drop policy if exists "entries update own" on public.entries;
drop policy if exists "entries delete own" on public.entries;

create policy "entries select own"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "entries insert own"
  on public.entries for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.books b where b.id = book_id and b.user_id = auth.uid())
  );

create policy "entries update own"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.books b where b.id = book_id and b.user_id = auth.uid())
  );

create policy "entries delete own"
  on public.entries for delete
  using (auth.uid() = user_id);
