import type { LedgerEntry, Settings, EntryType } from '~/types/ledger'
import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'

const ENTRIES_KEY = 'entries'
const SETTINGS_KEY = 'settings'

function clientStorage() {
  return createStorage({
    driver: localStorageDriver({ base: 'craftledger:' })
  })
}

export function useLedger() {
  const entries = useState<LedgerEntry[]>('cl-entries', () => [])
  const settings = useState<Settings>('cl-settings', () => ({
    businessName: '',
    currency: 'NGN'
  }))
  const loaded = useState('cl-loaded', () => false)

  if (import.meta.client) {
    onMounted(async () => {
      if (loaded.value) return
      const storage = clientStorage()
      try {
        const e = await storage.getItem<LedgerEntry[]>(ENTRIES_KEY)
        if (e) entries.value = e
        const s = await storage.getItem<Settings>(SETTINGS_KEY)
        if (s) settings.value = { ...settings.value, ...s }
      } catch {
        /* corrupted storage — start clean */
      }
      loaded.value = true
      watch(entries, v => { void storage.setItem(ENTRIES_KEY, v) }, { deep: true })
      watch(settings, v => { void storage.setItem(SETTINGS_KEY, v) }, { deep: true })
    })
  }

  function addEntry(entry: Omit<LedgerEntry, 'id'>) {
    entries.value.unshift({ ...entry, id: crypto.randomUUID() })
  }

  function updateEntry(id: string, patch: Omit<LedgerEntry, 'id'>) {
    const i = entries.value.findIndex(e => e.id === id)
    if (i !== -1) entries.value[i] = { id, ...patch }
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  function clearAll() {
    entries.value = []
  }

  /* ---------- accounting helpers (cash basis) ---------- */

  function totalFor(opts: { year?: number; month?: number; type?: EntryType }): number {
    return entries.value.reduce((sum, e) => {
      if (opts.type && e.type !== opts.type) return sum
      if (opts.year !== undefined && yearOf(e.date) !== opts.year) return sum
      if (opts.month !== undefined && parseInt(e.date.slice(5, 7), 10) !== opts.month) return sum
      return sum + e.amountMinor
    }, 0)
  }

  /** Net result for each month of a year: income − expenses, in minor units. */
  function monthlyNet(year: number): number[] {
    const net = Array(12).fill(0)
    for (const e of entries.value) {
      if (yearOf(e.date) !== year) continue
      const m = parseInt(e.date.slice(5, 7), 10) - 1
      net[m] += e.type === 'income' ? e.amountMinor : -e.amountMinor
    }
    return net
  }

  /** Category → total, for one month of one year. */
  function categoryTotals(year: number, month: number, type: EntryType): Map<string, number> {
    const map = new Map<string, number>()
    for (const e of entries.value) {
      if (e.type !== type) continue
      if (yearOf(e.date) !== year) continue
      if (parseInt(e.date.slice(5, 7), 10) !== month) continue
      map.set(e.category, (map.get(e.category) ?? 0) + e.amountMinor)
    }
    return map
  }

  const yearsOnRecord = computed<number[]>(() => {
    const years = new Set(entries.value.map(e => yearOf(e.date)))
    years.add(new Date().getFullYear())
    return [...years].sort((a, b) => b - a)
  })

  return {
    entries, settings,
    addEntry, updateEntry, removeEntry, clearAll,
    totalFor, monthlyNet, categoryTotals, yearsOnRecord
  }
}
