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
