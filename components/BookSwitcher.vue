<script setup lang="ts">
import { BOOK_COLORS, CURRENCIES, bookColorHex } from '~/types/ledger'

defineProps<{ block?: boolean }>()

const { books, activeBook, setActiveBook, createBook } = useBooks()

const open = ref(false)
const creating = ref(false)

const newName = ref('')
const newColor = ref<string>(BOOK_COLORS[0].key)
const newCurrency = ref<string>('NGN')
const busy = ref(false)

function pick(id: string) {
  setActiveBook(id)
  close()
}

function startCreate() {
  creating.value = true
  newName.value = ''
  newColor.value = BOOK_COLORS[books.value.length % BOOK_COLORS.length].key
  newCurrency.value = activeBook.value?.currency ?? 'NGN'
}

async function submitCreate() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  await createBook({ name: newName.value.trim(), color: newColor.value, currency: newCurrency.value })
  busy.value = false
  creating.value = false
  close()
}

function close() {
  open.value = false
  creating.value = false
}
</script>

<template>
  <div class="relative" :class="block ? 'w-full' : ''">
    <button
      type="button"
      class="flex items-center gap-2 rounded-md border border-rule bg-paper text-sm font-medium transition-colors hover:border-ink"
      :class="block ? 'w-full justify-between px-3 py-2.5' : 'px-2.5 py-1.5'"
      @click="open = !open"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: bookColorHex(activeBook?.color ?? 'indigo') }" />
        <span class="truncate">{{ activeBook?.name ?? 'No book' }}</span>
      </span>
      <svg class="h-3.5 w-3.5 shrink-0 text-faint" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" stroke-width="1.5" fill="none" /></svg>
    </button>

    <div v-if="open" class="fixed inset-0 z-10" @click="close" />

    <div
      v-if="open"
      class="z-20 overflow-hidden rounded-lg border border-rule bg-card shadow-lift"
      :class="block
        ? 'relative mt-2 w-full'
        : 'absolute right-0 mt-2 w-[min(100vw-2rem,16rem)] sm:w-64'"
    >
      <p class="px-3 pt-3 text-xs font-medium uppercase tracking-wider text-faint">Your books</p>
      <ul class="mt-1 max-h-64 overflow-auto py-1">
        <li v-for="b in books" :key="b.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-indigo-wash"
            @click="pick(b.id)"
          >
            <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: bookColorHex(b.color) }" />
            <span class="min-w-0 flex-1 truncate">{{ b.name }}</span>
            <span class="text-xs text-faint">{{ b.currency }}</span>
            <span v-if="b.id === activeBook?.id" class="text-indigo">✓</span>
          </button>
        </li>
      </ul>

      <div class="border-t border-rule p-2">
        <button
          v-if="!creating"
          type="button"
          class="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-indigo transition-colors hover:bg-indigo-wash"
          @click="startCreate"
        >
          + New book
        </button>

        <form v-else class="space-y-2 p-1" @submit.prevent="submitCreate">
          <input
            v-model="newName" type="text" class="field !py-1.5 text-sm" placeholder="Book name (e.g. Work)"
            autofocus
          />
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="c in BOOK_COLORS" :key="c.key" type="button"
              class="h-6 w-6 rounded-full ring-offset-2 ring-offset-card transition"
              :class="newColor === c.key ? 'ring-2 ring-ink' : ''"
              :style="{ backgroundColor: c.hex }"
              :title="c.label"
              @click="newColor = c.key"
            />
          </div>
          <select v-model="newCurrency" class="field !py-1.5 text-sm">
            <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.label }}</option>
          </select>
          <div class="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="submit" class="btn-primary !py-1.5 flex-1 justify-center text-sm" :disabled="busy || !newName.trim()">
              {{ busy ? 'Creating…' : 'Create book' }}
            </button>
            <button type="button" class="btn-ghost !py-1.5 text-sm" @click="creating = false">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
