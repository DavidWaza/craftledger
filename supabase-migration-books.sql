-- CraftLedger — migration: v1 (single ledger) → v2 (multi-book)
-- Run this ONCE in the SQL Editor if you already ran the original
-- `supabase-schema.sql` (the one that created a `profiles` table).
-- It is safe to re-run. It does not delete any entries.
--
-- What it does:
--   1. creates the `books` table (+ index, RLS, updated_at trigger)
--   2. gives every existing user a book, seeded from their old profile
--   3. adds `entries.book_id` and files existing entries under that book
--   4. locks `entries.book_id` to NOT NULL once back-filled
--   5. switches the sign-up trigger to create a starter book
--   6. tightens the entries RLS policies to be book-aware
-- The old `profiles` table is left in place but unused; drop it at the end if
-- you like (commented out below).

begin;

-- 1. books table ----------------------------------------------------------
create table if not exists public.books (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null default 'My ledger' check (char_length(name) between 1 and 80),
  color      text        not null default 'indigo',
  currency   text        not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_user_idx on public.books (user_id, created_at);

alter table public.books enable row level security;
drop policy if exists "books select own" on public.books;
drop policy if exists "books insert own" on public.books;
drop policy if exists "books update own" on public.books;
drop policy if exists "books delete own" on public.books;
create policy "books select own" on public.books for select using (auth.uid() = user_id);
create policy "books insert own" on public.books for insert with check (auth.uid() = user_id);
create policy "books update own" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books delete own" on public.books for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.touch_updated_at();

-- 2. one starter book per existing user, seeded from their old profile -----
--    (profiles may not exist on every install; the left join tolerates that)
insert into public.books (user_id, name, currency, color)
select u.id,
       coalesce(nullif(p.business_name, ''), 'My ledger'),
       coalesce(p.currency, 'NGN'),
       'indigo'
from auth.users u
left join public.profiles p on p.id = u.id
where not exists (select 1 from public.books b where b.user_id = u.id);

-- 3. add book_id and back-fill existing entries ---------------------------
alter table public.entries add column if not exists book_id uuid references public.books (id) on delete cascade;

update public.entries e
set book_id = b.id
from public.books b
where b.user_id = e.user_id
  and e.book_id is null;

create index if not exists entries_book_date_idx on public.entries (book_id, entry_date desc);

-- 4. lock it down (only succeeds once every row has a book) ----------------
alter table public.entries alter column book_id set not null;

-- 5. new sign-up trigger: create a starter book instead of just a profile --
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

-- 6. book-aware entries policies ------------------------------------------
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

commit;

-- Optional cleanup once you've confirmed everything works:
--   drop table public.profiles cascade;
