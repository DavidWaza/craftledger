<script setup lang="ts">
const { settings, totalFor, monthlyNet, categoryTotals, yearsOnRecord } = useLedger()
const { loading } = useAppLoading()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const currency = computed(() => settings.value.currency)

const incomeLines = computed(() => [...categoryTotals(year.value, month.value, 'income')])
const expenseLines = computed(() => [...categoryTotals(year.value, month.value, 'expense')])
const totalIncome = computed(() => incomeLines.value.reduce((s, [, v]) => s + v, 0))
const totalExpenses = computed(() => expenseLines.value.reduce((s, [, v]) => s + v, 0))
const netResult = computed(() => totalIncome.value - totalExpenses.value)

const yearGross = computed(() => totalFor({ year: year.value, type: 'income' }))
const yearExpenses = computed(() => totalFor({ year: year.value, type: 'expense' }))
const yearNet = computed(() => yearGross.value - yearExpenses.value)
const series = computed(() => monthlyNet(year.value))

function money(v: number) { return formatMoney(v, currency.value) }
function paren(v: number) { return v < 0 ? `(${money(-v)})` : money(v) }
</script>

<template>
  <div>
    <div class="page-header">
      <div class="min-w-0">
        <h1 class="page-title">Reports</h1>
        <p class="mt-1 text-sm text-faint">Your profit &amp; loss by month, and the year's gross.</p>
      </div>
      <div class="page-actions">
        <select v-model.number="month" class="field w-full sm:!w-auto" aria-label="Month">
          <option v-for="(m, i) in MONTH_NAMES" :key="m" :value="i + 1">{{ m }}</option>
        </select>
        <select v-model.number="year" class="field w-full sm:!w-auto" aria-label="Year">
          <option v-for="y in yearsOnRecord" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Loading: skeletons instead of the previous book's statement -->
    <template v-if="loading">
      <CardSkeleton class="mt-6" :lines="8" />
      <CardSkeleton chart class="mt-8" />
    </template>

    <template v-else>
    <!-- Monthly P&L statement -->
    <section class="mt-6 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-8">
      <header class="text-center">
        <h2 class="font-display text-lg font-semibold sm:text-xl">{{ settings.businessName || 'Your workshop' }}</h2>
        <p class="mt-1 text-sm text-faint">Profit &amp; loss statement — {{ MONTH_NAMES[month - 1] }} {{ year }} (cash basis)</p>
      </header>

      <div class="mx-auto mt-6 max-w-xl text-sm">
        <h3 class="text-xs font-medium uppercase tracking-wider text-faint">Income</h3>
        <div v-for="[cat, v] in incomeLines" :key="cat" class="ledger-row flex flex-col gap-0.5 py-1.5 sm:flex-row sm:justify-between">
          <span class="min-w-0">{{ cat }}</span><span class="figure shrink-0 sm:text-right">{{ money(v) }}</span>
        </div>
        <div v-if="!incomeLines.length" class="ledger-row py-1.5 text-faint">No income recorded</div>
        <div class="rule-subtotal mt-1 flex flex-col gap-0.5 py-1.5 font-medium sm:flex-row sm:justify-between">
          <span>Total income</span><span class="figure shrink-0 sm:text-right">{{ money(totalIncome) }}</span>
        </div>

        <h3 class="mt-6 text-xs font-medium uppercase tracking-wider text-faint">Expenses</h3>
        <div v-for="[cat, v] in expenseLines" :key="cat" class="ledger-row flex flex-col gap-0.5 py-1.5 sm:flex-row sm:justify-between">
          <span class="min-w-0">{{ cat }}</span><span class="figure shrink-0 sm:text-right">({{ money(v) }})</span>
        </div>
        <div v-if="!expenseLines.length" class="ledger-row py-1.5 text-faint">No expenses recorded</div>
        <div class="rule-subtotal mt-1 flex flex-col gap-0.5 py-1.5 font-medium sm:flex-row sm:justify-between">
          <span>Total expenses</span><span class="figure shrink-0 sm:text-right">({{ money(totalExpenses) }})</span>
        </div>

        <div
          class="rule-total mt-6 flex flex-col gap-1 py-2 text-base font-semibold sm:flex-row sm:justify-between"
          :class="netResult >= 0 ? 'text-moss' : 'text-clay'"
        >
          <span>Net {{ netResult >= 0 ? 'profit' : 'loss' }} for the month</span>
          <span class="figure shrink-0 sm:text-right">{{ paren(netResult) }}</span>
        </div>
        <p class="mt-2 text-xs text-faint">
          Figures in parentheses are deductions — the accountant's way of writing money out.
        </p>
      </div>
    </section>

    <!-- Yearly view -->
    <section class="mt-8 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-8">
      <h2 class="font-display text-lg font-semibold sm:text-xl">The year {{ year }}, in full</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Gross revenue" :value="formatMoneyShort(yearGross, currency)" hint="all income, before expenses" />
        <StatCard label="Total expenses" :value="formatMoneyShort(yearExpenses, currency)" />
        <StatCard
          :label="yearNet >= 0 ? 'Net profit to date' : 'Net loss to date'"
          :value="formatMoneyShort(Math.abs(yearNet), currency)"
          :tone="yearNet >= 0 ? 'profit' : 'loss'"
        />
      </div>
      <div class="mt-6">
        <NetBarChart :series="series" :currency="currency" />
      </div>
      <div class="mt-6 overflow-x-auto">
      <table class="w-full min-w-[280px] max-w-xl text-sm">
        <tbody>
          <tr v-for="(v, i) in series" :key="i" class="ledger-row">
            <td class="py-1.5">{{ MONTH_NAMES[i] }}</td>
            <td class="figure py-1.5 text-right" :class="v > 0 ? 'text-moss' : v < 0 ? 'text-clay' : 'text-faint'">
              {{ v === 0 ? '—' : paren(v) }}
            </td>
          </tr>
          <tr class="rule-total font-semibold" :class="yearNet >= 0 ? 'text-moss' : 'text-clay'">
            <td class="py-2">Net for {{ year }}</td>
            <td class="figure py-2 text-right">{{ paren(yearNet) }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>
    </template>
  </div>
</template>
