export type EntryType = 'income' | 'expense'

export interface LedgerEntry {
  id: string
  type: EntryType
  /** ISO date, YYYY-MM-DD */
  date: string
  description: string
  category: string
  /** Amount in minor units (e.g. kobo, cents) to avoid float errors */
  amountMinor: number
}

export interface Settings {
  businessName: string
  currency: string
}

/** A ledger book — a user can keep several, each with its own name, colour and currency. */
export interface Book {
  id: string
  name: string
  /** A key from BOOK_COLORS. */
  color: string
  currency: string
  /** Is this book's business registered to charge/remit VAT (turnover over the ₦50m threshold)? */
  vatRegistered: boolean
  /** Are recorded sale amounts VAT-inclusive (the price already contains the 7.5%)? */
  pricesVatInclusive: boolean
}

/** The palette a book can be tagged with. Hex is used directly so Tailwind purge can't strip it. */
export const BOOK_COLORS = [
  { key: 'indigo', label: 'Indigo', hex: '#2E3A66' },
  { key: 'moss',   label: 'Moss',   hex: '#2F7A4D' },
  { key: 'clay',   label: 'Clay',   hex: '#AE4438' },
  { key: 'brass',  label: 'Brass',  hex: '#9C7A2E' },
  { key: 'teal',   label: 'Teal',   hex: '#2B7A78' },
  { key: 'plum',   label: 'Plum',   hex: '#6D3B6B' },
  { key: 'slate',  label: 'Slate',  hex: '#445063' },
  { key: 'rose',   label: 'Rose',   hex: '#B14A6B' }
] as const

export type BookColorKey = (typeof BOOK_COLORS)[number]['key']

/** Resolve a colour key to its hex, falling back to the first colour. */
export function bookColorHex(key: string): string {
  return BOOK_COLORS.find(c => c.key === key)?.hex ?? BOOK_COLORS[0].hex
}

export const INCOME_CATEGORIES = [
  'Product sales',
  'Custom commissions',
  'Workshops & classes',
  'Market & fair sales',
  'Other income'
] as const

export const EXPENSE_CATEGORIES = [
  'Raw materials',
  'Tools & equipment',
  'Studio rent',
  'Utilities',
  'Packaging & shipping',
  'Market & stall fees',
  'Marketing',
  'Transport',
  'Other expenses'
] as const

export const CURRENCIES = [
  { code: 'NGN', label: 'Nigerian naira (₦)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'GBP', label: 'British pound (£)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GHS', label: 'Ghanaian cedi (₵)' },
  { code: 'KES', label: 'Kenyan shilling (KSh)' },
  { code: 'ZAR', label: 'South African rand (R)' },
  { code: 'CAD', label: 'Canadian dollar (C$)' },
  { code: 'AUD', label: 'Australian dollar (A$)' }
] as const
