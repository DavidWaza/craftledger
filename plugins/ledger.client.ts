/**
 * Single place that drives loading, so the composables stay free of lifecycle
 * watchers (which would otherwise duplicate per-component and die on unmount).
 *
 *  - sign in  → load the user's books, then the active book's entries
 *  - switch book → reload that book's entries
 *  - sign out → wipe local state so the next account starts clean
 */
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const books = useBooks()
  const ledger = useLedger()

  watch(
    user,
    async u => {
      if (u) {
        await books.ensureLoaded()
        await ledger.reload()
      } else {
        books.reset()
        ledger.reset()
      }
    },
    { immediate: true }
  )

  // Reload entries whenever the open book changes.
  watch(
    () => books.activeBookId.value,
    async () => {
      if (user.value) await ledger.reload()
    }
  )
})
