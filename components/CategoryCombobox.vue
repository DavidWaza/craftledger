<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options: readonly string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const query = ref(props.modelValue)

watch(() => props.modelValue, v => { query.value = v })

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = [...props.options]
  if (!q) return list
  return list.filter(c => c.toLowerCase().includes(q))
})

function pick(value: string) {
  emit('update:modelValue', value)
  query.value = value
  open.value = false
}

function onFocus() {
  open.value = true
}

function onInput() {
  open.value = true
  const exact = props.options.find(c => c.toLowerCase() === query.value.trim().toLowerCase())
  emit('update:modelValue', exact ?? '')
}

function onBlur() {
  setTimeout(() => {
    open.value = false
    const exact = props.options.find(c => c.toLowerCase() === query.value.trim().toLowerCase())
    if (exact) {
      emit('update:modelValue', exact)
      query.value = exact
    } else {
      query.value = props.modelValue
    }
  }, 150)
}

function onDocClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative">
    <input
      v-model="query"
      type="search"
      class="field"
      placeholder="Search categories…"
      autocomplete="off"
      role="combobox"
      :aria-expanded="open"
      aria-autocomplete="list"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
    />
    <ul
      v-if="open && filtered.length"
      class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-rule bg-card py-1 shadow-lift"
      role="listbox"
    >
      <li v-for="c in filtered" :key="c" role="option" :aria-selected="c === modelValue">
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-rule/40"
          :class="c === modelValue ? 'bg-indigo/10 font-medium text-indigo' : ''"
          @mousedown.prevent="pick(c)"
        >
          {{ c }}
        </button>
      </li>
    </ul>
    <p v-else-if="open && query.trim() && !filtered.length" class="absolute z-10 mt-1 w-full rounded-md border border-rule bg-card px-3 py-2 text-sm text-faint shadow-lift">
      No matching categories.
    </p>
  </div>
</template>
