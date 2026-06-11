<script setup lang="ts">
// Placeholder for <LedgerTable> while entries load.
const { rows = 6 } = defineProps<{ rows?: number }>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-rule bg-card shadow-lift">
    <div
      v-for="i in rows" :key="i"
      class="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 last:border-b-0"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton circle class="h-2.5 w-2.5 shrink-0" />
        <div class="min-w-0 flex-1 space-y-2">
          <Skeleton class="h-3.5 w-2/5" />
          <Skeleton class="h-2.5 w-1/4" />
        </div>
      </div>
      <Skeleton class="h-3.5 w-20 shrink-0" />
    </div>
  </div>
</template>
