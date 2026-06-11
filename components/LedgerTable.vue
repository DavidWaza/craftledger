<script setup lang="ts">
import type { LedgerEntry } from '~/types/ledger'

const props = defineProps<{
  entries: LedgerEntry[]
  currency: string
  showTotals?: boolean
}>()
const emit = defineEmits<{ edit: [entry: LedgerEntry]; remove: [id: string] }>()

const confirmingId = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null

function askDelete(id: string) {
  if (confirmingId.value === id) {
    emit('remove', id)
    confirmingId.value = null
    return
  }
  confirmingId.value = id
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => (confirmingId.value = null), 3000)
}

const totalIn = computed(() =>
  props.entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amountMinor, 0)
)
const totalOut = computed(() =>
  props.entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amountMinor, 0)
)
const net = computed(() => totalIn.value - totalOut.value)
</script>

<template>
  <div>
    <!-- Mobile: card list -->
    <ul class="space-y-3 md:hidden">
      <li
        v-for="e in entries" :key="e.id"
        class="rounded-lg border border-rule bg-card p-4 shadow-lift"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="figure text-xs text-faint">{{ formatDate(e.date) }}</p>
            <p class="mt-0.5 font-medium leading-snug">{{ e.description }}</p>
            <span
              class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs"
              :class="e.type === 'income' ? 'bg-moss-soft text-moss' : 'bg-clay-soft text-clay'"
            >{{ e.category }}</span>
          </div>
          <p
            class="figure shrink-0 text-right text-sm font-semibold"
            :class="e.type === 'income' ? 'text-moss' : 'text-clay'"
          >
            {{ e.type === 'income' ? formatMoney(e.amountMinor, currency) : `(${formatMoney(e.amountMinor, currency)})` }}
          </p>
        </div>
        <div class="mt-3 flex gap-3 border-t border-rule pt-3">
          <button type="button" class="text-xs font-medium text-indigo hover:underline" @click="emit('edit', e)">Edit</button>
          <button
            type="button"
            class="text-xs font-medium hover:underline"
            :class="confirmingId === e.id ? 'text-clay' : 'text-faint'"
            @click="askDelete(e.id)"
          >{{ confirmingId === e.id ? 'Confirm delete' : 'Delete' }}</button>
        </div>
      </li>

      <li v-if="showTotals && entries.length" class="rounded-lg border border-rule bg-card p-4 text-sm">
        <div class="flex justify-between py-1">
          <span class="text-faint">Money in</span>
          <span class="figure font-medium text-moss">{{ formatMoney(totalIn, currency) }}</span>
        </div>
        <div class="flex justify-between py-1">
          <span class="text-faint">Money out</span>
          <span class="figure font-medium text-clay">{{ formatMoney(totalOut, currency) }}</span>
        </div>
        <div
          class="rule-total mt-2 flex justify-between pt-2 font-semibold"
          :class="net >= 0 ? 'text-moss' : 'text-clay'"
        >
          <span>Net result</span>
          <span class="figure">{{ net < 0 ? `(${formatMoney(-net, currency)})` : formatMoney(net, currency) }}</span>
        </div>
      </li>
    </ul>

    <!-- Desktop: table -->
    <div class="hidden overflow-x-auto rounded-lg border border-rule bg-card shadow-lift md:block">
      <table class="w-full min-w-[560px] text-sm">
        <thead>
          <tr class="border-b border-ink text-left text-xs uppercase tracking-wider text-faint">
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium">Description</th>
            <th class="px-4 py-3 font-medium">Category</th>
            <th class="px-4 py-3 text-right font-medium">In</th>
            <th class="px-4 py-3 text-right font-medium">Out</th>
            <th class="px-4 py-3 text-right font-medium"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e.id" class="ledger-row">
            <td class="figure whitespace-nowrap px-4 py-2.5 text-faint">{{ formatDate(e.date) }}</td>
            <td class="px-4 py-2.5">{{ e.description }}</td>
            <td class="px-4 py-2.5">
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="e.type === 'income' ? 'bg-moss-soft text-moss' : 'bg-clay-soft text-clay'"
              >{{ e.category }}</span>
            </td>
            <td class="figure px-4 py-2.5 text-right text-moss">
              {{ e.type === 'income' ? formatMoney(e.amountMinor, currency) : '' }}
            </td>
            <td class="figure px-4 py-2.5 text-right text-clay">
              {{ e.type === 'expense' ? formatMoney(e.amountMinor, currency) : '' }}
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-right">
              <button class="text-xs font-medium text-indigo hover:underline" @click="emit('edit', e)">Edit</button>
              <button
                class="ml-3 text-xs font-medium hover:underline"
                :class="confirmingId === e.id ? 'text-clay' : 'text-faint'"
                @click="askDelete(e.id)"
              >{{ confirmingId === e.id ? 'Confirm delete' : 'Delete' }}</button>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="showTotals && entries.length">
          <tr class="rule-subtotal text-sm">
            <td colspan="3" class="px-4 py-2.5 font-medium">Totals for this view</td>
            <td class="figure px-4 py-2.5 text-right font-medium text-moss">{{ formatMoney(totalIn, currency) }}</td>
            <td class="figure px-4 py-2.5 text-right font-medium text-clay">{{ formatMoney(totalOut, currency) }}</td>
            <td></td>
          </tr>
          <tr class="rule-total">
            <td colspan="3" class="px-4 py-2.5 font-semibold">Net result</td>
            <td colspan="2" class="figure px-4 py-2.5 text-right font-semibold" :class="net >= 0 ? 'text-moss' : 'text-clay'">
              {{ net < 0 ? `(${formatMoney(-net, currency)})` : formatMoney(net, currency) }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
