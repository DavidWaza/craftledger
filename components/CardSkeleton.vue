<script setup lang="ts">
// Generic placeholder for a bordered card section with a heading and a few
// rows of content. Used for the Reports/Tax statements and Settings panels.
const { lines = 5, chart = false } = defineProps<{ lines?: number; chart?: boolean }>()
</script>

<template>
  <section class="rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-5">
    <Skeleton class="h-5 w-40" />
    <Skeleton v-if="chart" class="mt-5 h-40 w-full" />
    <div v-else class="mt-5 space-y-3">
      <div v-for="i in lines" :key="i" class="flex items-center justify-between gap-4">
        <Skeleton class="h-3.5" :class="i % 2 ? 'w-1/3' : 'w-2/5'" />
        <Skeleton class="h-3.5 w-16 shrink-0" />
      </div>
    </div>
  </section>
</template>
