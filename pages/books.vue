<script setup lang="ts">
import type { LedgerEntry, EntryType } from '~/types/ledger'

const { entries, settings, removeEntry } = useLedger()

const now = new Date()
const monthFilter = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const allMonths = ref(false)
const typeFilter = ref<'all' | EntryType>('all')
const search = ref('')

const showForm = ref(false)
const editing = ref<LedgerEntry | null>(null)
const deleteError = ref('')

async function handleRemove(id: string) {
  deleteError.value = ''
  const result = await removeEntry(id)
  if (!result.ok) deleteError.value = result.error
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return [...entries.value]
    .filter(e => allMonths.value || monthKey(e.date) === monthFilter.value)
    .filter(e => typeFilter.value === 'all' || e.type === typeFilter.value)
    .filter(e => !q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
})

function startEdit(e: LedgerEntry) {
  editing.value = e
  showForm.value = true
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
function closeForm() {
  showForm.value = false
  editing.value = null
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="min-w-0">
        <h1 class="page-title">The books</h1>
        <p class="mt-1 text-sm text-faint">Every sale and every expense, one line at a time.</p>
      </div>
      <div class="page-actions">
        <button class="btn-primary w-full sm:w-auto" @click="editing = null; showForm = !showForm">
          {{ showForm && !editing ? 'Close form' : '+ Record an entry' }}
        </button>
      </div>
    </div>

    <EntryForm
      v-if="showForm" :key="editing?.id ?? 'new'" :editing="editing"
      class="mt-5" @saved="closeForm" @cancelled="closeForm"
    />

    <div class="filter-bar mt-6">
      <input v-model="monthFilter" type="month" class="field" :disabled="allMonths" />
      <label class="flex items-center gap-2 text-sm text-faint">
        <input v-model="allMonths" type="checkbox" class="accent-indigo" /> All months
      </label>
      <select v-model="typeFilter" class="field">
        <option value="all">In and out</option>
        <option value="income">Money in only</option>
        <option value="expense">Money out only</option>
      </select>
      <input v-model="search" type="search" class="field sm:min-w-[160px] sm:flex-1" placeholder="Search descriptions…" />
    </div>

    <p v-if="deleteError" class="mt-4 rounded-md bg-clay-soft px-3 py-2 text-sm text-clay">{{ deleteError }}</p>

    <LedgerTable
      v-if="filtered.length"
      class="mt-4" :entries="filtered" :currency="settings.currency" show-totals
      @edit="startEdit" @remove="handleRemove"
    />
    <div v-else class="mt-4 rounded-lg border border-dashed border-rule bg-card p-6 text-center text-sm text-faint sm:p-10">
      No entries match this view. Change the month or filters, or record a new entry.
    </div>
  </div>
</template>
