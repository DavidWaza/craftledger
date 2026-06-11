<script setup lang="ts">
import { CURRENCIES, BOOK_COLORS, bookColorHex } from '~/types/ledger'

const { entries, clearAll, addEntry, importLocal } = useLedger()
const { books, activeBook, setActiveBook, createBook, updateBook, removeBook } = useBooks()

/* ---------- editing the open book ---------- */
const bookName = ref(activeBook.value?.name ?? '')
watch(activeBook, b => { bookName.value = b?.name ?? '' })

function saveName() {
  const name = bookName.value.trim()
  if (activeBook.value && name && name !== activeBook.value.name) {
    updateBook(activeBook.value.id, { name })
  } else if (activeBook.value) {
    bookName.value = activeBook.value.name // ignore empty
  }
}
function saveColor(color: string) {
  if (activeBook.value) updateBook(activeBook.value.id, { color })
}
function saveCurrency(e: Event) {
  if (activeBook.value) updateBook(activeBook.value.id, { currency: (e.target as HTMLSelectElement).value })
}

/* ---------- NRS tax settings ---------- */
function setVatRegistered(e: Event) {
  if (activeBook.value) updateBook(activeBook.value.id, { vatRegistered: (e.target as HTMLInputElement).checked })
}
function setPriceBasis(e: Event) {
  if (activeBook.value) updateBook(activeBook.value.id, { pricesVatInclusive: (e.target as HTMLSelectElement).value === 'inclusive' })
}

/* ---------- the book list ---------- */
const confirmingDelete = ref<string | null>(null)
async function askDelete(id: string) {
  if (confirmingDelete.value === id) {
    await removeBook(id)
    confirmingDelete.value = null
  } else {
    confirmingDelete.value = id
    setTimeout(() => { if (confirmingDelete.value === id) confirmingDelete.value = null }, 4000)
  }
}
async function addBook() {
  const color = BOOK_COLORS[books.value.length % BOOK_COLORS.length].key
  await createBook({ name: 'New book', color, currency: activeBook.value?.currency ?? 'NGN' })
  bookName.value = 'New book'
}

/* ---------- records (scoped to the open book) ---------- */
const confirmingClear = ref(false)
const importMsg = ref('')

function askClear() {
  if (confirmingClear.value) {
    clearAll()
    confirmingClear.value = false
  } else {
    confirmingClear.value = true
    setTimeout(() => (confirmingClear.value = false), 4000)
  }
}

async function runImport() {
  importMsg.value = ''
  const n = await importLocal()
  importMsg.value = n
    ? `Imported ${n} ${n === 1 ? 'entry' : 'entries'} from this browser into “${activeBook.value?.name}”.`
    : 'Nothing to import — this browser has no saved entries.'
}

function exportCsv() {
  const rows = [
    ['date', 'type', 'category', 'description', 'amount'],
    ...entries.value.map(e => [
      e.date, e.type, e.category,
      `"${e.description.replace(/"/g, '""')}"`,
      (e.amountMinor / 100).toFixed(2)
    ])
  ]
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(activeBook.value?.name ?? 'craftledger').replace(/\s+/g, '-').toLowerCase()}-export.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function loadSample() {
  for (const e of sampleEntries()) addEntry(e)
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="font-display text-3xl font-bold tracking-tight">Settings</h1>

    <!-- The open book -->
    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <div class="flex items-center gap-2">
        <span class="h-4 w-4 rounded-full" :style="{ backgroundColor: bookColorHex(activeBook?.color ?? 'indigo') }" />
        <h2 class="font-display text-lg font-semibold">This book</h2>
      </div>

      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Book name</span>
        <input
          v-model="bookName" type="text" class="field" placeholder="e.g. Personal, Work, Ada's school fund"
          @change="saveName" @blur="saveName"
        />
      </label>

      <div class="mt-4">
        <span class="mb-1 block text-xs font-medium text-faint">Colour</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in BOOK_COLORS" :key="c.key" type="button"
            class="h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition"
            :class="activeBook?.color === c.key ? 'ring-2 ring-ink' : ''"
            :style="{ backgroundColor: c.hex }"
            :title="c.label"
            @click="saveColor(c.key)"
          />
        </div>
      </div>

      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Currency</span>
        <select :value="activeBook?.currency" class="field" @change="saveCurrency">
          <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </label>
      <p class="mt-3 text-xs text-faint">Changes save automatically and apply across this book only.</p>
    </section>

    <!-- Tax (NRS) -->
    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <h2 class="font-display text-lg font-semibold">Tax (NRS)</h2>
      <p class="mt-1 text-sm text-faint">
        How this book is treated on the
        <NuxtLink to="/tax" class="font-medium text-indigo hover:underline">Tax</NuxtLink> page.
      </p>

      <label class="mt-4 flex items-start gap-3">
        <input
          type="checkbox" class="mt-1 accent-indigo"
          :checked="activeBook?.vatRegistered" @change="setVatRegistered"
        />
        <span>
          <span class="block text-sm font-medium">VAT-registered</span>
          <span class="block text-xs text-faint">
            Tick if this business charges 7.5% VAT (turnover over ₦50m). Untick and no VAT is computed.
          </span>
        </span>
      </label>

      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">How sale amounts are recorded</span>
        <select
          class="field"
          :value="activeBook?.pricesVatInclusive ? 'inclusive' : 'exclusive'"
          :disabled="!activeBook?.vatRegistered"
          @change="setPriceBasis"
        >
          <option value="inclusive">VAT-inclusive — the price already contains the 7.5%</option>
          <option value="exclusive">VAT-exclusive — 7.5% is added on top</option>
        </select>
      </label>
    </section>

    <!-- All books -->
    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-semibold">Your books</h2>
        <button class="btn-ghost !py-1.5 text-sm" @click="addBook">+ New book</button>
      </div>
      <p class="mt-1 text-sm text-faint">
        Keep separate books for different parts of life — personal, work, a child's savings — each private and colour-tagged.
      </p>
      <ul class="mt-4 divide-y divide-rule">
        <li v-for="b in books" :key="b.id" class="flex items-center gap-3 py-2.5">
          <span class="h-3.5 w-3.5 shrink-0 rounded-full" :style="{ backgroundColor: bookColorHex(b.color) }" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ b.name }}</p>
            <p class="text-xs text-faint">{{ b.currency }}</p>
          </div>
          <span v-if="b.id === activeBook?.id" class="rounded-md bg-indigo-wash px-2 py-0.5 text-xs font-medium text-indigo">Open</span>
          <button v-else class="btn-ghost !py-1 text-xs" @click="setActiveBook(b.id)">Open</button>
          <button
            class="btn-ghost !py-1 text-xs"
            :class="confirmingDelete === b.id ? '!border-clay !text-clay' : ''"
            :disabled="books.length <= 1"
            :title="books.length <= 1 ? 'Keep at least one book' : 'Delete this book and all its entries'"
            @click="askDelete(b.id)"
          >
            {{ confirmingDelete === b.id ? 'Confirm delete' : 'Delete' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Records in the open book -->
    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <h2 class="font-display text-lg font-semibold">Records in “{{ activeBook?.name }}”</h2>
      <p class="mt-1 text-sm text-faint">
        {{ entries.length }} entries in this book, kept privately in your cloud ledger and reachable from any device.
        Export a CSV any time to keep a copy or hand to an accountant.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn-ghost" @click="exportCsv" :disabled="!entries.length">Export CSV</button>
        <button class="btn-ghost" @click="loadSample">Load sample entries</button>
        <button class="btn-ghost" @click="runImport">Import from this browser</button>
        <button
          class="btn-ghost"
          :class="confirmingClear ? '!border-clay !text-clay' : ''"
          @click="askClear"
        >
          {{ confirmingClear ? 'Click again to erase this book' : 'Clear this book' }}
        </button>
      </div>
      <p v-if="importMsg" class="mt-3 rounded-md bg-moss-soft px-3 py-2 text-sm text-moss">{{ importMsg }}</p>
    </section>
  </div>
</template>
