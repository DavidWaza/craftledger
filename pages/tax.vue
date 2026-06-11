<script setup lang="ts">
import { VAT_RATE } from '~/utils/tax'

const { activeBook } = useBooks()

const now = new Date()
const monthInput = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const year = computed(() => parseInt(monthInput.value.slice(0, 4), 10))
const month = computed(() => parseInt(monthInput.value.slice(5, 7), 10))

const { vatReturn, incomeTax, vatRegistered, inclusive, currency, isNgn } = useTax(year, month)

function money(v: number) { return formatMoney(v, currency.value) }
const vatPct = `${(VAT_RATE * 100).toFixed(1)}%`

const periodLabel = computed(() => `${MONTH_NAMES[month.value - 1]} ${year.value}`)

/** Net VAT can be a credit (negative) — frame it for the reader. */
const vatPayable = computed(() => vatReturn.value.netVatMinor)

function downloadStatement() {
  const r = vatReturn.value
  const t = incomeTax.value
  const lines: string[] = []
  const push = (...cells: (string | number)[]) => lines.push(cells.join(','))

  push('CraftLedger — NRS monthly tax statement')
  push('Book', `"${activeBook.value?.name ?? ''}"`)
  push('Currency', currency.value)
  push('Period', `${MONTH_NAMES[month.value - 1]} ${year.value}`)
  push('VAT registered', r.vatRegistered ? 'Yes' : 'No')
  push('Price basis', r.inclusive ? 'VAT-inclusive' : 'VAT-exclusive')
  push('')
  push('VALUE ADDED TAX (VAT)')
  push('Section', 'Category', 'Gross', 'VAT')
  for (const l of r.outputLines) push('Sales (output)', `"${l.category}"`, (l.grossMinor / 100).toFixed(2), (l.vatMinor / 100).toFixed(2))
  push('', 'Total sales / output VAT', (r.salesGrossMinor / 100).toFixed(2), (r.outputVatMinor / 100).toFixed(2))
  for (const l of r.inputLines) push('Purchases (input)', `"${l.category}"`, (l.grossMinor / 100).toFixed(2), (l.vatMinor / 100).toFixed(2))
  push('', 'Total purchases / input VAT', (r.purchasesGrossMinor / 100).toFixed(2), (r.inputVatMinor / 100).toFixed(2))
  push('', 'NET VAT PAYABLE', '', (r.netVatMinor / 100).toFixed(2))
  push('', 'Due date', '', r.dueDate)
  push('')
  push('INCOME TAX ESTIMATE (year to date)')
  push('Taxable profit', (t.taxableProfitMinor / 100).toFixed(2))
  push('Estimated annual tax', (t.annualTaxMinor / 100).toFixed(2))
  push('Suggested monthly set-aside', (t.monthlySetAsideMinor / 100).toFixed(2))

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `nrs-tax-${year.value}-${String(month.value).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-3xl font-bold tracking-tight">Tax · NRS</h1>
        <p class="mt-1 text-sm text-faint">
          Your monthly VAT return and a running income-tax estimate for
          <span class="font-medium text-ink">{{ activeBook?.name }}</span>.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="monthInput" type="month" class="field !w-auto" />
        <button class="btn-ghost" @click="downloadStatement">Download statement</button>
      </div>
    </div>

    <!-- non-NGN notice -->
    <p v-if="!isNgn" class="mt-5 rounded-md bg-brass-soft px-3 py-2 text-sm text-brass">
      NRS tax applies to Nigerian-naira books. This book is in {{ currency }}, so treat these figures as illustrative.
    </p>

    <!-- Filing summary -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <section class="rounded-lg border border-rule bg-card p-5 shadow-lift">
        <p class="text-xs uppercase tracking-wider text-faint">VAT to remit · {{ periodLabel }}</p>
        <template v-if="vatRegistered">
          <p class="mt-1 figure text-3xl font-bold" :class="vatPayable >= 0 ? 'text-ink' : 'text-moss'">
            {{ money(Math.abs(vatPayable)) }}
          </p>
          <p class="mt-1 text-sm text-faint">
            <template v-if="vatPayable >= 0">Due to NRS by <span class="font-medium text-ink">{{ formatDate(vatReturn.dueDate) }}</span>.</template>
            <template v-else>Input VAT exceeds output — carry this credit forward.</template>
          </p>
        </template>
        <template v-else>
          <p class="mt-1 figure text-3xl font-bold text-faint">{{ money(0) }}</p>
          <p class="mt-1 text-sm text-faint">This book isn't VAT-registered, so no VAT is charged or remitted.</p>
        </template>
      </section>

      <section class="rounded-lg border border-rule bg-card p-5 shadow-lift">
        <p class="text-xs uppercase tracking-wider text-faint">Income tax · set aside / month</p>
        <p class="mt-1 figure text-3xl font-bold">{{ money(incomeTax.monthlySetAsideMinor) }}</p>
        <p class="mt-1 text-sm text-faint">
          Est. {{ money(incomeTax.annualTaxMinor) }} for {{ year }} on
          {{ money(incomeTax.taxableProfitMinor) }} profit
          ({{ (incomeTax.effectiveRate * 100).toFixed(1) }}% effective).
        </p>
      </section>
    </div>

    <!-- VAT return detail -->
    <section v-if="vatRegistered" class="mt-8 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-5">
      <div class="flex items-baseline justify-between">
        <h2 class="font-display text-lg font-semibold">VAT return — {{ periodLabel }}</h2>
        <span class="text-xs text-faint">{{ inclusive ? 'prices VAT-inclusive' : 'prices VAT-exclusive' }} · {{ vatPct }}</span>
      </div>

      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-rule text-left text-xs uppercase tracking-wider text-faint">
            <th class="py-2">Category</th>
            <th class="py-2 text-right">Gross</th>
            <th class="py-2 text-right">VAT</th>
          </tr>
        </thead>
        <tbody>
          <tr class="text-xs font-semibold uppercase tracking-wider text-moss">
            <td class="pt-3" colspan="3">Output VAT — on sales</td>
          </tr>
          <tr v-for="l in vatReturn.outputLines" :key="`o-${l.category}`" class="border-b border-rule/60">
            <td class="py-1.5">{{ l.category }}</td>
            <td class="py-1.5 text-right figure">{{ money(l.grossMinor) }}</td>
            <td class="py-1.5 text-right figure">{{ money(l.vatMinor) }}</td>
          </tr>
          <tr v-if="!vatReturn.outputLines.length"><td class="py-1.5 text-faint" colspan="3">No sales this month.</td></tr>
          <tr class="border-b border-rule font-medium">
            <td class="py-1.5">Total output VAT</td>
            <td class="py-1.5 text-right figure">{{ money(vatReturn.salesGrossMinor) }}</td>
            <td class="py-1.5 text-right figure">{{ money(vatReturn.outputVatMinor) }}</td>
          </tr>

          <tr class="text-xs font-semibold uppercase tracking-wider text-clay">
            <td class="pt-4" colspan="3">Input VAT — on purchases</td>
          </tr>
          <tr v-for="l in vatReturn.inputLines" :key="`i-${l.category}`" class="border-b border-rule/60">
            <td class="py-1.5">{{ l.category }}</td>
            <td class="py-1.5 text-right figure">{{ money(l.grossMinor) }}</td>
            <td class="py-1.5 text-right figure">{{ money(l.vatMinor) }}</td>
          </tr>
          <tr v-if="!vatReturn.inputLines.length"><td class="py-1.5 text-faint" colspan="3">No purchases this month.</td></tr>
          <tr class="border-b border-rule font-medium">
            <td class="py-1.5">Total input VAT</td>
            <td class="py-1.5 text-right figure">{{ money(vatReturn.purchasesGrossMinor) }}</td>
            <td class="py-1.5 text-right figure">{{ money(vatReturn.inputVatMinor) }}</td>
          </tr>

          <tr class="text-base font-bold">
            <td class="py-3">Net VAT payable</td>
            <td></td>
            <td class="py-3 text-right figure" :class="vatPayable >= 0 ? 'text-ink' : 'text-moss'">{{ money(vatReturn.netVatMinor) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-xs text-faint">
        Output VAT − input VAT. File and pay by the 21st of the following month. Exempt or zero-rated
        items should be excluded — adjust your categories if any sales/purchases don't carry {{ vatPct }} VAT.
      </p>
    </section>

    <!-- Income tax detail -->
    <section class="mt-8 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-5">
      <h2 class="font-display text-lg font-semibold">Income tax estimate — {{ year }}</h2>
      <p class="mb-4 text-sm text-faint">
        Personal income tax on this book's profit, using the 2026 bands. A running guide so you can set money
        aside — income tax is filed annually, not monthly.
      </p>
      <dl class="grid gap-3 sm:grid-cols-2">
        <div class="flex justify-between rounded-md bg-paper px-3 py-2">
          <dt class="text-sm text-faint">Income {{ vatRegistered && inclusive ? '(ex-VAT)' : '' }}</dt>
          <dd class="figure text-sm font-medium">{{ money(incomeTax.incomeNetMinor) }}</dd>
        </div>
        <div class="flex justify-between rounded-md bg-paper px-3 py-2">
          <dt class="text-sm text-faint">Expenses {{ vatRegistered && inclusive ? '(ex-VAT)' : '' }}</dt>
          <dd class="figure text-sm font-medium">{{ money(incomeTax.expensesNetMinor) }}</dd>
        </div>
        <div class="flex justify-between rounded-md bg-paper px-3 py-2">
          <dt class="text-sm text-faint">Taxable profit</dt>
          <dd class="figure text-sm font-medium">{{ money(incomeTax.taxableProfitMinor) }}</dd>
        </div>
        <div class="flex justify-between rounded-md bg-paper px-3 py-2">
          <dt class="text-sm text-faint">Estimated annual tax</dt>
          <dd class="figure text-sm font-bold">{{ money(incomeTax.annualTaxMinor) }}</dd>
        </div>
      </dl>
      <p v-if="incomeTax.belowIncomeTaxThreshold" class="mt-3 rounded-md bg-moss-soft px-3 py-2 text-sm text-moss">
        Turnover is under ₦100m, so as a small business you may be exempt from company income tax. This estimate
        treats you as a sole trader paying personal income tax — confirm which applies to you.
      </p>
    </section>

    <!-- Settings hint -->
    <p class="mt-6 text-sm text-faint">
      VAT registration and price basis for this book are set on the
      <NuxtLink to="/settings" class="font-medium text-indigo hover:underline">Settings</NuxtLink> page.
      These figures are a planning estimate, not tax advice — confirm with the NRS or an accountant before filing.
    </p>
  </div>
</template>
