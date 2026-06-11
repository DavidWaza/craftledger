-- CraftLedger — migration: add per-book NRS tax settings
-- Run ONCE in the SQL Editor, after supabase-migration-books.sql.
-- Safe to re-run.
--
-- Adds two flags to each book, used by the Tax (NRS) report:
--   vat_registered        — is this book's business registered to charge VAT?
--                           (turnover over the ₦50m threshold). Default true.
--   prices_vat_inclusive  — are recorded sale amounts VAT-inclusive (the price
--                           already contains the 7.5%)? Default true.

alter table public.books
  add column if not exists vat_registered       boolean not null default true,
  add column if not exists prices_vat_inclusive boolean not null default true;
