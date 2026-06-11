/**
 * NRS (Nigeria Revenue Service) tax model — Nigeria Tax Act 2025, effective 1 Jan 2026.
 *
 * All money is in MINOR units (kobo) to stay integer-exact, same as the ledger.
 * These are the headline rules a small artisan business needs; they are a
 * planning estimate, not tax advice. Confirm exempt/zero-rated items and any
 * reliefs with the NRS or an accountant before filing.
 *
 * Sources (June 2026):
 *   - VAT 7.5%, filed monthly by the 21st of the following month.
 *   - VAT registration threshold: ₦50m annual turnover (below it you need not charge VAT).
 *   - Small-company income-tax exemption threshold: ₦100m annual turnover.
 *   - Personal income tax bands below.
 */
import type { LedgerEntry } from '~/types/ledger'

/** Standard VAT rate. */
export const VAT_RATE = 0.075

/** Turnover at/under which a business need not register for VAT (₦50m, in kobo). */
export const VAT_REGISTRATION_THRESHOLD_MINOR = 50_000_000 * 100

/** Turnover at/under which a small company is exempt from income tax (₦100m, in kobo). */
export const SMALL_BUSINESS_INCOME_TAX_THRESHOLD_MINOR = 100_000_000 * 100

/**
 * Personal income tax bands (annual taxable income, in kobo). Progressive:
 * each slice of income is taxed at its band's rate.
 *   0 – 800k        0%
 *   800k – 3m       15%
 *   3m – 12m        18%
 *   12m – 25m       21%
 *   25m – 50m       23%
 *   above 50m       25%
 */
export const PIT_BANDS: { upToMinor: number; rate: number }[] = [
  { upToMinor: 800_000 * 100, rate: 0 },
  { upToMinor: 3_000_000 * 100, rate: 0.15 },
  { upToMinor: 12_000_000 * 100, rate: 0.18 },
  { upToMinor: 25_000_000 * 100, rate: 0.21 },
  { upToMinor: 50_000_000 * 100, rate: 0.23 },
  { upToMinor: Number.POSITIVE_INFINITY, rate: 0.25 }
]

/** Month names already live in utils/money.ts (MONTH_NAMES). */

/** VAT contained in a single gross amount, given how prices are recorded. */
export function vatOf(amountMinor: number, inclusive: boolean): number {
  const vat = inclusive
    ? (amountMinor * VAT_RATE) / (1 + VAT_RATE) // strip VAT out of a gross price
    : amountMinor * VAT_RATE // add VAT on top of a net price
  return Math.round(vat)
}

/** The net (ex-VAT) value of a gross amount. */
export function netOf(amountMinor: number, inclusive: boolean): number {
  return amountMinor - (inclusive ? vatOf(amountMinor, inclusive) : 0)
}

/** Filing due date for a month's VAT: the 21st of the following month, ISO yyyy-mm-dd. */
export function vatDueDate(year: number, month: number): string {
  // month is 1–12; due the 21st of the next month
  const dueYear = month === 12 ? year + 1 : year
  const dueMonth = month === 12 ? 1 : month + 1
  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-21`
}

export interface VatLine {
  category: string
  grossMinor: number
  vatMinor: number
}

export interface VatReturn {
  year: number
  month: number
  vatRegistered: boolean
  inclusive: boolean
  /** Gross sales (money in) for the month. */
  salesGrossMinor: number
  /** Output VAT — VAT on your sales, owed to NRS. */
  outputVatMinor: number
  /** Gross purchases (money out) for the month. */
  purchasesGrossMinor: number
  /** Input VAT — VAT on your purchases, reclaimable against output VAT. */
  inputVatMinor: number
  /** Net VAT payable to NRS (output − input). Negative = credit carried forward. */
  netVatMinor: number
  /** Per-category breakdown for the statement. */
  outputLines: VatLine[]
  inputLines: VatLine[]
  dueDate: string
}

/** Build a month's VAT return from the ledger entries of one book. */
export function computeVatReturn(
  entries: LedgerEntry[],
  opts: { year: number; month: number; vatRegistered: boolean; inclusive: boolean }
): VatReturn {
  const { year, month, vatRegistered, inclusive } = opts
  const inMonth = (e: LedgerEntry) =>
    yearOf(e.date) === year && parseInt(e.date.slice(5, 7), 10) === month

  const outMap = new Map<string, VatLine>()
  const inMap = new Map<string, VatLine>()
  let salesGross = 0
  let purchasesGross = 0
  let outputVat = 0
  let inputVat = 0

  for (const e of entries) {
    if (!inMonth(e)) continue
    // When registered, output VAT is charged on sales; input VAT reclaimed on purchases.
    const vat = vatRegistered ? vatOf(e.amountMinor, inclusive) : 0
    const map = e.type === 'income' ? outMap : inMap
    const line = map.get(e.category) ?? { category: e.category, grossMinor: 0, vatMinor: 0 }
    line.grossMinor += e.amountMinor
    line.vatMinor += vat
    map.set(e.category, line)

    if (e.type === 'income') {
      salesGross += e.amountMinor
      outputVat += vat
    } else {
      purchasesGross += e.amountMinor
      inputVat += vat
    }
  }

  const byGrossDesc = (a: VatLine, b: VatLine) => b.grossMinor - a.grossMinor
  return {
    year,
    month,
    vatRegistered,
    inclusive,
    salesGrossMinor: salesGross,
    outputVatMinor: outputVat,
    purchasesGrossMinor: purchasesGross,
    inputVatMinor: inputVat,
    netVatMinor: outputVat - inputVat,
    outputLines: [...outMap.values()].sort(byGrossDesc),
    inputLines: [...inMap.values()].sort(byGrossDesc),
    dueDate: vatDueDate(year, month)
  }
}

/** Progressive personal income tax on an annual taxable income (kobo → kobo). */
export function personalIncomeTax(taxableAnnualMinor: number): number {
  if (taxableAnnualMinor <= 0) return 0
  let tax = 0
  let prev = 0
  for (const band of PIT_BANDS) {
    const slice = Math.min(taxableAnnualMinor, band.upToMinor) - prev
    if (slice > 0) tax += slice * band.rate
    prev = band.upToMinor
    if (taxableAnnualMinor <= band.upToMinor) break
  }
  return Math.round(tax)
}

export interface IncomeTaxEstimate {
  year: number
  /** Income and expenses for the year so far, net (ex-VAT if registered). */
  incomeNetMinor: number
  expensesNetMinor: number
  /** Taxable profit (income − expenses), floored at 0. */
  taxableProfitMinor: number
  /** Estimated annual personal income tax on that profit. */
  annualTaxMinor: number
  /** Effective rate (annualTax / taxableProfit). */
  effectiveRate: number
  /** A flat 1/12 of the annual estimate — what to set aside each month. */
  monthlySetAsideMinor: number
  /** True if turnover is under the small-business income-tax exemption. */
  belowIncomeTaxThreshold: boolean
}

/**
 * Year-to-date income-tax estimate for a sole trader: tax on profit using the
 * 2026 bands. VAT is stripped out first when the book is VAT-registered, since
 * VAT is the customer's money, not income. Reliefs (pension, rent) are not
 * auto-applied — they would only reduce this further.
 */
export function estimateIncomeTax(
  entries: LedgerEntry[],
  opts: { year: number; vatRegistered: boolean; inclusive: boolean }
): IncomeTaxEstimate {
  const { year, vatRegistered, inclusive } = opts
  const stripVat = vatRegistered && inclusive
  let incomeNet = 0
  let expensesNet = 0
  let incomeGross = 0

  for (const e of entries) {
    if (yearOf(e.date) !== year) continue
    const net = stripVat ? netOf(e.amountMinor, true) : e.amountMinor
    if (e.type === 'income') {
      incomeNet += net
      incomeGross += e.amountMinor
    } else {
      expensesNet += net
    }
  }

  const taxableProfit = Math.max(0, incomeNet - expensesNet)
  const annualTax = personalIncomeTax(taxableProfit)
  return {
    year,
    incomeNetMinor: incomeNet,
    expensesNetMinor: expensesNet,
    taxableProfitMinor: taxableProfit,
    annualTaxMinor: annualTax,
    effectiveRate: taxableProfit > 0 ? annualTax / taxableProfit : 0,
    monthlySetAsideMinor: Math.round(annualTax / 12),
    belowIncomeTaxThreshold: incomeGross <= SMALL_BUSINESS_INCOME_TAX_THRESHOLD_MINOR
  }
}
