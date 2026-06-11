import type { Book, LedgerEntry } from '~/types/ledger'

/**
 * Single place that drives loading, so the composables stay free of lifecycle
 * watchers (which would otherwise duplicate per-component and die on unmount).
 *
 *  - sign in  → load the user's books, then the active book's entries
 *  - switch book → reload that book's entries
 *  - switch account / sign out → wipe live state immediately, then load the
 *    new account (in-memory snapshots make switching back instant)
 */
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const books = useBooks()
  const ledger = useLedger()
  const profile = useProfile()

  /** Account we last finished wiring up. `null` = nobody loaded this page-life yet. */
  let loadedUserId: string | null = null
  /** Bumps on every account switch so in-flight loads can bail out. */
  let loadGen = 0

  const snapshots = new Map<string, { books: Book[]; entries: LedgerEntry[] }>()

  function wipeLiveState() {
    books.reset()
    ledger.reset()
    profile.reset()
  }

  async function activate(uid: string, gen: number) {
    const snap = snapshots.get(uid)
    if (snap) {
      books.books.value = [...snap.books]
      ledger.entries.value = [...snap.entries]
      books.booksLoaded.value = true
      await books.loadBooks()
    } else {
      await books.ensureLoaded()
    }

    if (gen !== loadGen || authUserId(user.value) !== uid) return

    await ledger.reload()

    // Account profile (display name + email) — independent of books, but loaded
    // here so it's wiped and refreshed on the same account-switch boundary.
    if (!profile.profileLoaded.value) await profile.loadProfile()

    if (gen !== loadGen || authUserId(user.value) !== uid) return

    snapshots.set(uid, {
      books: [...books.books.value],
      entries: [...ledger.entries.value]
    })
  }

  async function onAccountChange(uid: string | null) {
    if (uid === loadedUserId) return

    const prev = loadedUserId
    if (prev !== null && uid !== prev) {
      snapshots.set(prev, {
        books: [...books.books.value],
        entries: [...ledger.entries.value]
      })
    }

    // Always wipe when leaving an account (sign-out or A → B), before any await.
    if (prev !== null && uid !== prev) wipeLiveState()

    loadedUserId = uid
    if (!uid) return

    const gen = ++loadGen
    await activate(uid, gen)
  }

  // Primary source of truth — fires as soon as the Supabase session changes,
  // before `useSupabaseUser()` sometimes catches up after sign-in.
  supabase.auth.onAuthStateChange((_event, session) => {
    void onAccountChange(session?.user?.id ?? null)
  })

  // Fallback if the module updates the JWT ref without a matching event.
  watch(
    () => authUserId(user.value),
    uid => { void onAccountChange(uid) },
    { immediate: true }
  )

  // Reload entries when the open book changes — only for the signed-in account.
  watch(
    () => [authUserId(user.value), books.activeBookId.value, books.booksLoaded.value] as const,
    async ([uid, bookId, ready]) => {
      if (!uid || !bookId || !ready) return
      if (uid !== loadedUserId) return
      await ledger.reload()
    }
  )
})
