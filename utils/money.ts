/**
 * All amounts are stored as integers in minor units (kobo, cents).
 * Formatting and parsing live here so rounding rules exist in one place.
 */

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountMinor / 100)
}

export function formatMoneyShort(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amountMinor / 100))
}

/** Parse "12,500.50" → 1250050. Returns null if not a valid positive amount. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  const minor = parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, '0') || '0', 10)
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null
}

export function monthKey(date: string): string {
  return date.slice(0, 7) // YYYY-MM
}

export function yearOf(date: string): number {
  return parseInt(date.slice(0, 4), 10)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`
}
