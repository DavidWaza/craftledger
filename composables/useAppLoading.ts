/**
 * One readiness signal for the whole app, so pages can show skeleton loaders
 * instead of a stale or empty screen while the active account's books and the
 * open book's entries are still being fetched (on first load, and after the
 * hard reload that follows a book switch).
 */
export function useAppLoading() {
  const { booksLoaded } = useBooks()
  const { entriesLoaded } = useLedger()

  /** True once books are known AND the open book's entries have loaded once. */
  const ready = computed(() => booksLoaded.value && entriesLoaded.value)
  /** Convenience inverse for `v-if="loading"` branches. */
  const loading = computed(() => !ready.value)

  return { ready, loading }
}
