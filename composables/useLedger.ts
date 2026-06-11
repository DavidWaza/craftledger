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

/**
 * The ledger lines for whichever book is currently open. Everything here is
 * scoped to `activeBook` from useBooks(); switching books reloads the entries.
 * Loading is orchestrated once in plugins/ledger.client.ts.
 */
export type LedgerMutationResult = { ok: true } | { ok: false; error: string }

export function useLedger() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { activeBook, activeBookId, ensureLoaded } = useBooks()

  const entries = useState<LedgerEntry[]>('cl-entries', () => [])

  // False until the active book's entries have been fetched at least once this
  // page-life. Drives skeleton loaders so a fresh load (or post-switch reload)
  // shows placeholders instead of a stale or misleadingly-empty screen.
  const entriesLoaded = useState('cl-entries-loaded', () => false)

  /** Per-book "profile": its name and currency. Derived, read-only — edit the
   *  book itself via useBooks().updateBook (the Settings page does this). */
  const settings = computed<Settings>(() => ({
    businessName: activeBook.value?.name ?? '',
    currency: activeBook.value?.currency ?? 'NGN'
  }))

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

  /* ---------- load / reset (called by the orchestration plugin) ---------- */

  async function reload() {
    const bookId = activeBookId.value
    if (!bookId) {
      entries.value = []
      entriesLoaded.value = true
      return
    }
    const { data, error } = await supabase
      .from('entries')
      .select('id, type, entry_date, description, category, amount_minor')
      .eq('book_id', bookId)
      .order('entry_date', { ascending: false })
    // The open book (or account) may have changed while the query was in
    // flight — discard this result rather than painting it over newer data.
    if (activeBookId.value !== bookId) return
    if (error) {
      console.error('[useLedger] reload', error)
      entriesLoaded.value = true // don't trap the UI on a skeleton forever
      return
    }
    if (data) entries.value = (data as EntryRow[]).map(rowToEntry)
    entriesLoaded.value = true
  }

  function reset() {
    entries.value = []
    entriesLoaded.value = false
  }

  /* ---------- mutations (each writes to Supabase, then updates locally) ---------- */

  async function addEntry(entry: Omit<LedgerEntry, 'id'>): Promise<LedgerMutationResult> {
    await ensureLoaded()
    const uid = authUserId(user.value)
    const bookId = activeBook.value?.id ?? activeBookId.value
    if (!uid) return { ok: false, error: 'You are not signed in.' }
    if (!bookId) return { ok: false, error: 'No book is open yet — wait a moment and try again.' }

    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: uid,
        book_id: bookId,
        type: entry.type,
        entry_date: entry.date,
        description: entry.description,
        category: entry.category,
        amount_minor: entry.amountMinor
      })
      .select('id')
      .single()
    if (error) {
      console.error('[useLedger] addEntry', error)
      return { ok: false, error: supabaseErrorMessage(error) }
    }
    if (data) entries.value.unshift({ ...entry, id: data.id })
    return { ok: true }
  }

  async function updateEntry(id: string, patch: Omit<LedgerEntry, 'id'>): Promise<LedgerMutationResult> {
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
    if (error) {
      console.error('[useLedger] updateEntry', error)
      return { ok: false, error: supabaseErrorMessage(error) }
    }
    const i = entries.value.findIndex(e => e.id === id)
    if (i !== -1) entries.value[i] = { id, ...patch }
    return { ok: true }
  }

  async function removeEntry(id: string): Promise<LedgerMutationResult> {
    const { data, error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) {
      console.error('[useLedger] removeEntry', error)
      return { ok: false, error: supabaseErrorMessage(error) }
    }
    if (!data?.length) {
      return { ok: false, error: 'Could not delete that entry — it may already be gone, or you may not have permission.' }
    }
    entries.value = entries.value.filter(e => e.id !== id)
    return { ok: true }
  }

  /** Clear every entry in the *current* book (other books are untouched). */
  async function clearAll() {
    if (!activeBookId.value) return
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('book_id', activeBookId.value)
    if (!error) entries.value = []
  }

  /** One-time migration: pull anything left in this browser into the current book. */
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
    entries, entriesLoaded, settings,
    reload, reset,
    addEntry, updateEntry, removeEntry, clearAll, importLocal,
    totalFor, monthlyNet, categoryTotals, yearsOnRecord
  }
}
