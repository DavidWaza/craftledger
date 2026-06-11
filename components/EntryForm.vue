<script setup lang="ts">
import type { LedgerEntry, EntryType } from '~/types/ledger'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '~/types/ledger'

const props = defineProps<{ editing?: LedgerEntry | null }>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()

const { addEntry, updateEntry, settings } = useLedger()

const type = ref<EntryType>(props.editing?.type ?? 'income')
const date = ref(props.editing?.date ?? todayISO())
const description = ref(props.editing?.description ?? '')
const category = ref(props.editing?.category ?? '')
const amount = ref(props.editing ? (props.editing.amountMinor / 100).toFixed(2) : '')
const error = ref('')
const busy = ref(false)

const categories = computed(() =>
  type.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
)

watch(type, () => { category.value = '' })

const preview = computed(() => {
  const minor = parseMoney(amount.value)
  return minor ? formatMoney(minor, settings.value.currency) : ''
})

async function save() {
  error.value = ''
  const minor = parseMoney(amount.value)
  if (!date.value) return (error.value = 'Pick a date for this entry.')
  if (!description.value.trim()) return (error.value = 'Describe the entry — e.g. “Saturday market sales”.')
  if (!category.value) return (error.value = 'Choose a category so reports stay tidy.')
  if (!minor) return (error.value = 'Enter an amount like 12500 or 12,500.50.')

  const payload = {
    type: type.value,
    date: date.value,
    description: description.value.trim(),
    category: category.value,
    amountMinor: minor
  }

  busy.value = true
  try {
    const result = props.editing
      ? await updateEntry(props.editing.id, payload)
      : await addEntry(payload)
    if (!result.ok) {
      error.value = result.error
      return
    }
    emit('saved')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-5" @submit.prevent="save">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-display text-lg font-semibold">
        {{ editing ? 'Edit entry' : 'Record an entry' }}
      </h2>
      <div class="flex rounded-md border border-rule p-0.5" role="radiogroup" aria-label="Entry type">
        <button
          type="button"
          class="rounded px-3 py-1 text-sm font-medium transition-colors"
          :class="type === 'income' ? 'bg-moss text-paper' : 'text-faint hover:text-ink'"
          @click="type = 'income'"
        >Money in</button>
        <button
          type="button"
          class="rounded px-3 py-1 text-sm font-medium transition-colors"
          :class="type === 'expense' ? 'bg-clay text-paper' : 'text-faint hover:text-ink'"
          @click="type = 'expense'"
        >Money out</button>
      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-faint">Date</span>
        <input v-model="date" type="date" class="field" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-faint">Category</span>
        <select v-model="category" class="field">
          <option value="" disabled>Choose…</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1 block text-xs font-medium text-faint">Description</span>
        <input
          v-model="description" type="text" class="field"
          :placeholder="type === 'income' ? 'e.g. Two ceramic bowls — Saturday market' : 'e.g. Clay and glaze restock'"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-faint">Amount</span>
        <input v-model="amount" type="text" inputmode="decimal" class="field figure" placeholder="0.00" />
      </label>
      <div class="flex items-end pb-2 text-sm text-faint">
        <span v-if="preview" class="figure">= {{ preview }}</span>
      </div>
    </div>

    <p v-if="error" class="mt-3 rounded-md bg-clay-soft px-3 py-2 text-sm text-clay">{{ error }}</p>

    <div class="mt-4 flex gap-2">
      <button type="submit" class="btn-primary" :disabled="busy">
        {{ busy ? 'Saving…' : editing ? 'Save changes' : 'Add to the books' }}
      </button>
      <button type="button" class="btn-ghost" @click="emit('cancelled')">Cancel</button>
    </div>
  </form>
</template>
