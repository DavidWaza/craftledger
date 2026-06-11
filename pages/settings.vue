<script setup lang="ts">
import { CURRENCIES } from '~/types/ledger'

const { settings, entries, clearAll, addEntry, importLocal } = useLedger()
const confirmingClear = ref(false)
const importMsg = ref('')

async function runImport() {
  importMsg.value = ''
  const n = await importLocal()
  importMsg.value = n
    ? `Imported ${n} ${n === 1 ? 'entry' : 'entries'} from this browser into your cloud books.`
    : 'Nothing to import — this browser has no saved entries.'
}

function askClear() {
  if (confirmingClear.value) {
    clearAll()
    confirmingClear.value = false
  } else {
    confirmingClear.value = true
    setTimeout(() => (confirmingClear.value = false), 4000)
  }
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
  a.download = 'craftledger-export.csv'
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

    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <h2 class="font-display text-lg font-semibold">Your workshop</h2>
      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Business name</span>
        <input v-model="settings.businessName" type="text" class="field" placeholder="e.g. Ada's Pottery" />
      </label>
      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Currency</span>
        <select v-model="settings.currency" class="field">
          <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </label>
      <p class="mt-3 text-xs text-faint">Changes save automatically and apply everywhere.</p>
    </section>

    <section class="mt-6 rounded-lg border border-rule bg-card p-5 shadow-lift">
      <h2 class="font-display text-lg font-semibold">Your records</h2>
      <p class="mt-1 text-sm text-faint">
        {{ entries.length }} entries on file, kept privately in your cloud ledger and
        reachable from any device. Export a CSV any time to keep a copy or hand to an accountant.
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
          {{ confirmingClear ? 'Click again to erase everything' : 'Clear all entries' }}
        </button>
      </div>
      <p v-if="importMsg" class="mt-3 rounded-md bg-moss-soft px-3 py-2 text-sm text-moss">{{ importMsg }}</p>
    </section>
  </div>
</template>
