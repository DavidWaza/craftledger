import type { LedgerEntry } from '~/types/ledger'

/** Deterministic-ish sample year of entries so a new user can look around. */
export function sampleEntries(): Omit<LedgerEntry, 'id'>[] {
  const year = new Date().getFullYear()
  const thisMonth = new Date().getMonth() + 1
  const out: Omit<LedgerEntry, 'id'>[] = []
  const pad = (n: number) => String(n).padStart(2, '0')

  for (let m = 1; m <= thisMonth; m++) {
    out.push(
      { type: 'income', date: `${year}-${pad(m)}-05`, description: 'Weekend market stall', category: 'Market & fair sales', amountMinor: (38000 + m * 1500) * 100 },
      { type: 'income', date: `${year}-${pad(m)}-12`, description: 'Online shop orders', category: 'Product sales', amountMinor: (52000 + m * 2200) * 100 },
      { type: 'income', date: `${year}-${pad(m)}-21`, description: 'Commissioned piece — client deposit', category: 'Custom commissions', amountMinor: 30000 * 100 },
      { type: 'expense', date: `${year}-${pad(m)}-03`, description: 'Leather, thread and dye restock', category: 'Raw materials & supplies', amountMinor: (21000 + m * 800) * 100 },
      { type: 'expense', date: `${year}-${pad(m)}-08`, description: 'Stall fee — artisan market', category: 'Market & stall fees', amountMinor: 6500 * 100 },
      { type: 'expense', date: `${year}-${pad(m)}-15`, description: 'Courier and packaging boxes', category: 'Packaging & shipping', amountMinor: 9200 * 100 },
      { type: 'expense', date: `${year}-${pad(m)}-28`, description: 'Workshop rent', category: 'Studio & workshop rent', amountMinor: 25000 * 100 }
    )
    if (m % 3 === 0) {
      out.push(
        { type: 'income', date: `${year}-${pad(m)}-26`, description: 'Beginner craft class (6 seats)', category: 'Workshops & classes', amountMinor: 48000 * 100 },
        { type: 'expense', date: `${year}-${pad(m)}-18`, description: 'New stitching tools', category: 'Tools & equipment', amountMinor: 17500 * 100 }
      )
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}
