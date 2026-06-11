<script setup lang="ts">
const links = [
  { to: '/', label: 'Overview' },
  { to: '/books', label: 'The books' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' }
]

const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function signOut() {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <header class="border-b-[3px] border-double border-ink bg-card">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <NuxtLink to="/" class="flex items-baseline gap-2">
        <span class="font-display text-xl font-bold tracking-tight text-indigo">CraftLedger</span>
        <span class="hidden text-xs text-faint sm:inline">books for makers</span>
      </NuxtLink>
      <nav v-if="user" class="flex items-center gap-1 text-sm" aria-label="Main">
        <BookSwitcher class="mr-1" />
        <NuxtLink
          v-for="l in links" :key="l.to" :to="l.to"
          class="rounded-md px-3 py-1.5 font-medium text-faint transition-colors hover:text-ink"
          active-class="!text-paper bg-indigo"
        >
          {{ l.label }}
        </NuxtLink>
        <button
          v-if="user"
          type="button"
          class="ml-1 rounded-md px-3 py-1.5 font-medium text-faint transition-colors hover:text-clay"
          @click="signOut"
        >
          Sign out
        </button>
      </nav>
    </div>
  </header>
</template>
