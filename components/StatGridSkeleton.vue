<script setup lang="ts">
// Placeholder row of <StatCard>s. `cols` controls the large-screen column count
// so it lines up with the real grid (4 on the overview, 3 on reports).
const { count = 4, cols = 4 } = defineProps<{ count?: number; cols?: 3 | 4 }>()
</script>

<template>
  <div
    class="grid gap-3 sm:grid-cols-2"
    :class="cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'"
  >
    <div v-for="i in count" :key="i" class="rounded-lg border border-rule bg-card p-4 shadow-lift">
      <Skeleton class="h-3 w-24" />
      <Skeleton class="mt-3 h-7 w-32" />
    </div>
  </div>
</template>
