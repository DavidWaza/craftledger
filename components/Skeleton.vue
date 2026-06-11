<script setup lang="ts">
// A single shimmering placeholder block. Size it from the parent, e.g.
//   <Skeleton class="h-4 w-24" />
//   <Skeleton circle class="h-3 w-3" />
defineProps<{ circle?: boolean }>()
</script>

<template>
  <div class="skeleton" :class="circle ? 'rounded-full' : 'rounded-md'" aria-hidden="true" />
</template>
