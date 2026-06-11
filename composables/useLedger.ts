import type { LedgerEntry, Settings, EntryType } from '~/types/ledger'

/** Shape of a row as it lives in the `entries` table (snake_case columns). */
interface EntryRow {
  id: string
  type: EntryType
  entry_date: string
  description: string
  category: string
  amount_minor: number
}

/** Old localStorage key, used once during one-time migration. */
const LEGACY_ENTRIES_KEY = 'craftledger:entries'

export function useLedger() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const entries = useState<LedgerEntry[]>('cl-entries', () => [])
  const settings = useState<Settings>('cl-settings', () => ({
    businessName: '',
    currency: 'NGN'
  }))
  const loaded = useState('cl-loaded', () => false)
  const hydrating = useState('cl-hydrating', () => false)

  /* ---------- column ⇄ app-field mapping ---------- */

  function rowToEntry(r: EntryRow): LedgerEntry {
    return {
      id: r.id,
      type: r.type,
      date: r.entry_date,
      description: r.description,
      category: r.category,
      amountMinor: Number(r.amount_minor)
    }
  }

  /* ---------- load (replaces the localStorage read) ---------- */

  async function loadEntries() {
    // No `.eq('user_id', …)` here on purpose — RLS filters server-side.
    const { data, error } = await supabase
      .from('entries')
      .select('id, type, entry_date, description, category, amount_minor')
      .order('entry_date', { ascending: false })
    if (!error && data) entries.value = (data as EntryRow[]).map(rowToEntry)
  }

  async function loadSettings() {
    const { data, error } = await supabase
      .from('profiles')
      .select('business_name, currency')
      .single()
    if (!error && data) {
      settings.value = {
        businessName: data.business_name ?? '',
        currency: data.currency ?? 'NGN'
      }
    }
  }

  async function ensureLoaded() {
    if (loaded.value) return
    loaded.value = true // set synchronously so concurrent callers don't double-load
    hydrating.value = true
    await Promise.all([loadEntries(), loadSettings()])
    // Let the settings watcher flush (it runs async) while still hydrating, so
    // the just-loaded values aren't echoed straight back as a redundant write.
    await nextTick()
    hydrating.value = false
  }

  if (import.meta.client) {
    // Load when a user is present; wipe local state on sign-out so the next
    // account never sees the previous one's figures.
    watch(
      user,
      u => {
        if (u) {
          void ensureLoaded()
        } else {
          entries.value = []
          settings.value = { businessName: '', currency: 'NGN' }
          loaded.value = false
        }
      },
      { immediate: true }
    )

    // Settings save themselves. The hydrating guard stops the initial load
    // from echoing straight back as a write.
    watch(
      settings,
      s => {
        if (hydrating.value || !loaded.value || !user.value) return
        void supabase
          .from('profiles')
          .update({ business_name: s.businessName, currency: s.currency })
          .eq('id', user.value.id)
      },
      { deep: true }
    )
  }

  /* ---------- mutations (each writes to Supabase, then updates locally) ---------- */

  async function addEntry(entry: Omit<LedgerEntry, 'id'>) {
    if (!user.value) return
    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.value.id,
        type: entry.type,
        entry_date: entry.date,
        description: entry.description,
        category: entry.category,
        amount_minor: entry.amountMinor
      })
      .select('id')
      .single()
    if (!error && data) entries.value.unshift({ ...entry, id: data.id })
  }

  async function updateEntry(id: string, patch: Omit<LedgerEntry, 'id'>) {
    const { error } = await supabase
      .from('entries')
      .update({
        type: patch.type,
        entry_date: patch.date,
        description: patch.description,
        category: patch.category,
        amount_minor: patch.amountMinor
      })
      .eq('id', id)
    if (!error) {
      const i = entries.value.findIndex(e => e.id === id)
      if (i !== -1) entries.value[i] = { id, ...patch }
    }
  }

  async function removeEntry(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error) entries.value = entries.value.filter(e => e.id !== id)
  }

  async function clearAll() {
    if (!user.value) return
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('user_id', user.value.id)
    if (!error) entries.value = []
  }

  /** One-time migration: pull anything left in this browser into the cloud. */
  async function importLocal(): Promise<number> {
    if (!import.meta.client) return 0
    const raw = localStorage.getItem(LEGACY_ENTRIES_KEY)
    if (!raw) return 0
    let old: LedgerEntry[]
    try {
      old = JSON.parse(raw) as LedgerEntry[]
    } catch {
      return 0
    }
    for (const e of old) {
      await addEntry({
        type: e.type,
        date: e.date,
        description: e.description,
        category: e.category,
        amountMinor: e.amountMinor
      })
    }
    localStorage.removeItem(LEGACY_ENTRIES_KEY)
    return old.length
  }

  /* ---------- accounting helpers (cash basis) — unchanged ---------- */

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
    addEntry, updateEntry, removeEntry, clearAll, importLocal,
    totalFor, monthlyNet, categoryTotals, yearsOnRecord
  }
}
