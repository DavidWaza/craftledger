<script setup lang="ts">
const { entries, settings, totalFor, monthlyNet, addEntry, removeEntry } = useLedger()

const deleteError = ref('')

async function handleRemove(id: string) {
  deleteError.value = ''
  const result = await removeEntry(id)
  if (!result.ok) deleteError.value = result.error
}

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1

const currency = computed(() => settings.value.currency)
const monthIn = computed(() => totalFor({ year, month, type: 'income' }))
const monthOut = computed(() => totalFor({ year, month, type: 'expense' }))
const monthNet = computed(() => monthIn.value - monthOut.value)
const yearGross = computed(() => totalFor({ year, type: 'income' }))
const series = computed(() => monthlyNet(year))
const recent = computed(() => [...entries.value].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6))

const showForm = ref(false)

function loadSample() {
  for (const e of sampleEntries()) addEntry(e)
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-wider text-faint">{{ MONTH_NAMES[month - 1] }} {{ year }}</p>
        <h1 class="page-title">
          {{ settings.businessName || 'Your workshop' }}, at a glance
        </h1>
      </div>
      <div class="page-actions">
        <button class="btn-primary w-full sm:w-auto" @click="showForm = !showForm">
          {{ showForm ? 'Close form' : '+ Record an entry' }}
        </button>
      </div>
    </div>

    <EntryForm v-if="showForm" class="mt-5" @saved="showForm = false" @cancelled="showForm = false" />

    <template v-if="entries.length">
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Money in this month" :value="formatMoney(monthIn, currency)" />
        <StatCard label="Money out this month" :value="formatMoney(monthOut, currency)" />
        <StatCard
          :label="monthNet >= 0 ? 'Profit this month' : 'Loss this month'"
          :value="formatMoney(Math.abs(monthNet), currency)"
          :tone="monthNet >= 0 ? 'profit' : 'loss'"
          hint="income minus expenses"
        />
        <StatCard
          :label="`Gross revenue, ${year}`"
          :value="formatMoneyShort(yearGross, currency)"
          hint="all sales before any expenses"
        />
      </div>

      <section class="mt-8 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-5">
        <h2 class="font-display text-lg font-semibold">How {{ year }} is going</h2>
        <p class="mb-4 text-sm text-faint">Net result for each month — bars above the line are profit.</p>
        <NetBarChart :series="series" :currency="currency" />
      </section>

      <section class="mt-8">
        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="font-display text-lg font-semibold">Latest entries</h2>
          <NuxtLink to="/books" class="text-sm font-medium text-indigo hover:underline">Open the books →</NuxtLink>
        </div>
        <p v-if="deleteError" class="mb-3 rounded-md bg-clay-soft px-3 py-2 text-sm text-clay">{{ deleteError }}</p>
        <LedgerTable :entries="recent" :currency="currency" @edit="navigateTo('/books')" @remove="handleRemove" />
      </section>
    </template>

    <section v-else-if="!showForm" class="mt-8 rounded-lg border border-dashed border-rule bg-card p-6 text-center sm:mt-12 sm:p-10">
      <h2 class="font-display text-xl font-semibold">Your ledger is empty</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-faint">
        Record your first sale or expense to start the books. If you'd rather look around first,
        load a year of sample entries — you can clear them any time in Settings.
      </p>
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button class="btn-primary w-full sm:w-auto" @click="showForm = true">Record first entry</button>
        <button class="btn-ghost w-full sm:w-auto" @click="loadSample">Load sample entries</button>
      </div>
    </section>
  </div>
</template>
