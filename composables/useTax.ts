import type { Ref } from 'vue'
import { computeVatReturn, estimateIncomeTax } from '~/utils/tax'

/**
 * Reactive NRS tax figures for the open book: a monthly VAT return for the
 * chosen month, plus a year-to-date personal-income-tax estimate.
 */
export function useTax(year: Ref<number>, month: Ref<number>) {
  const { entries } = useLedger()
  const { activeBook } = useBooks()

  const vatRegistered = computed(() => activeBook.value?.vatRegistered ?? true)
  const inclusive = computed(() => activeBook.value?.pricesVatInclusive ?? true)
  const currency = computed(() => activeBook.value?.currency ?? 'NGN')
  const isNgn = computed(() => currency.value === 'NGN')

  const vatReturn = computed(() =>
    computeVatReturn(entries.value, {
      year: year.value,
      month: month.value,
      vatRegistered: vatRegistered.value,
      inclusive: inclusive.value
    })
  )

  const incomeTax = computed(() =>
    estimateIncomeTax(entries.value, {
      year: year.value,
      vatRegistered: vatRegistered.value,
      inclusive: inclusive.value
    })
  )

  return { vatReturn, incomeTax, vatRegistered, inclusive, currency, isNgn }
}
