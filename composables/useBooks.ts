import type { Book } from '~/types/ledger'

/** Shape of a row in the `books` table. */
interface BookRow {
  id: string
  name: string
  color: string
  currency: string
  vat_registered: boolean
  prices_vat_inclusive: boolean
}

const BOOK_COLUMNS = 'id, name, color, currency, vat_registered, prices_vat_inclusive'

/**
 * Manages the user's set of ledger books and which one is currently open.
 * The active book id is kept in a cookie so it survives reloads and is shared
 * across every component that calls this composable.
 */
export function useBooks() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const books = useState<Book[]>('cl-books', () => [])
  const activeBookId = useCookie<string | null>('cl-active-book', {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
  const booksLoaded = useState('cl-books-loaded', () => false)

  const activeBook = computed<Book | null>(
    () => books.value.find(b => b.id === activeBookId.value) ?? books.value[0] ?? null
  )

  function rowToBook(r: BookRow): Book {
    return {
      id: r.id,
      name: r.name,
      color: r.color,
      currency: r.currency,
      vatRegistered: r.vat_registered,
      pricesVatInclusive: r.prices_vat_inclusive
    }
  }

  async function loadBooks() {
    const { data, error } = await supabase
      .from('books')
      .select(BOOK_COLUMNS)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useBooks] loadBooks', error)
      return
    }
    if (data) {
      books.value = (data as BookRow[]).map(rowToBook)
      // Make sure something sensible is selected.
      if (!books.value.some(b => b.id === activeBookId.value)) {
        activeBookId.value = books.value[0]?.id ?? null
      }
    }
  }

  /** Load once; if the user somehow has no book yet, create a starter one. */
  async function ensureLoaded() {
    if (booksLoaded.value) return
    await loadBooks()
    if (!books.value.length) {
      await createBook({ name: 'My ledger', color: 'indigo', currency: 'NGN' })
    }
    booksLoaded.value = true
  }

  function reset() {
    books.value = []
    booksLoaded.value = false
    activeBookId.value = null
  }

  async function createBook(input: { name: string; color: string; currency: string }): Promise<Book | null> {
    const uid = authUserId(user.value)
    if (!uid) return null
    const { data, error } = await supabase
      .from('books')
      .insert({
        user_id: uid,
        name: input.name,
        color: input.color,
        currency: input.currency
      })
      .select(BOOK_COLUMNS)
      .single()
    if (error) {
      console.error('[useBooks] createBook', error)
      return null
    }
    if (data) {
      const book = rowToBook(data as BookRow)
      books.value.push(book)
      activeBookId.value = book.id // open the new book straight away
      return book
    }
    return null
  }

  async function updateBook(
    id: string,
    patch: Partial<Pick<Book, 'name' | 'color' | 'currency' | 'vatRegistered' | 'pricesVatInclusive'>>
  ) {
    // Translate camelCase app fields → snake_case columns.
    const dbPatch: {
      name?: string
      color?: string
      currency?: string
      vat_registered?: boolean
      prices_vat_inclusive?: boolean
    } = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.color !== undefined) dbPatch.color = patch.color
    if (patch.currency !== undefined) dbPatch.currency = patch.currency
    if (patch.vatRegistered !== undefined) dbPatch.vat_registered = patch.vatRegistered
    if (patch.pricesVatInclusive !== undefined) dbPatch.prices_vat_inclusive = patch.pricesVatInclusive

    const { error } = await supabase.from('books').update(dbPatch).eq('id', id)
    if (!error) {
      const i = books.value.findIndex(b => b.id === id)
      if (i !== -1) books.value[i] = { ...books.value[i], ...patch }
    }
  }

  /** Delete a book (and, via cascade, its entries). Refuses to remove the last one. */
  async function removeBook(id: string): Promise<boolean> {
    if (books.value.length <= 1) return false
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) return false
    books.value = books.value.filter(b => b.id !== id)
    if (activeBookId.value === id) activeBookId.value = books.value[0]?.id ?? null
    return true
  }

  function setActiveBook(id: string) {
    if (books.value.some(b => b.id === id)) activeBookId.value = id
  }

  return {
    books,
    activeBook,
    activeBookId,
    booksLoaded,
    ensureLoaded,
    reset,
    loadBooks,
    createBook,
    updateBook,
    removeBook,
    setActiveBook
  }
}
