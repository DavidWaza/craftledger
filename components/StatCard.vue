<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
  tone?: 'profit' | 'loss' | 'neutral'
}>()
</script>

<template>
  <div class="rounded-lg border border-rule bg-card p-4 shadow-lift">
    <p class="text-xs font-medium uppercase tracking-wider text-faint">{{ label }}</p>
    <p
      class="figure mt-2 text-2xl font-semibold"
      :class="tone === 'profit' ? 'text-moss' : tone === 'loss' ? 'text-clay' : 'text-ink'"
    >
      {{ value }}
    </p>
    <p v-if="hint" class="mt-1 text-xs text-faint">{{ hint }}</p>
  </div>
</template>
