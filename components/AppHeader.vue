<script setup lang="ts">
const route = useRoute()
const links = [
  { to: '/', label: 'Overview' },
  { to: '/books', label: 'The books' },
  { to: '/reports', label: 'Reports' },
  { to: '/tax', label: 'Tax' },
  { to: '/settings', label: 'Settings' }
]

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const menuOpen = ref(false)

watch(() => route.path, () => { menuOpen.value = false })

async function signOut() {
  menuOpen.value = false
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <header class="border-b-[3px] border-double border-ink bg-card">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <NuxtLink to="/" class="flex min-w-0 items-baseline gap-2" @click="menuOpen = false">
        <span class="font-display text-lg font-bold tracking-tight text-indigo sm:text-xl">CraftLedger</span>
        <span class="hidden text-xs text-faint sm:inline">books for makers</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav v-if="user" class="hidden items-center gap-1 text-sm lg:flex" aria-label="Main">
        <BookSwitcher class="mr-1" />
        <NuxtLink
          v-for="l in links" :key="l.to" :to="l.to"
          class="rounded-md px-3 py-1.5 font-medium text-faint transition-colors hover:text-ink"
          active-class="!text-paper bg-indigo"
        >
          {{ l.label }}
        </NuxtLink>
        <button
          type="button"
          class="ml-1 rounded-md px-3 py-1.5 font-medium text-faint transition-colors hover:text-clay"
          @click="signOut"
        >
          Sign out
        </button>
      </nav>

      <!-- Mobile menu toggle -->
      <button
        v-if="user"
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-rule p-2 text-ink transition-colors hover:border-indigo lg:hidden"
        :aria-expanded="menuOpen"
        aria-controls="mobile-nav"
        aria-label="Open menu"
        @click="menuOpen = !menuOpen"
      >
        <svg v-if="!menuOpen" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
        </svg>
        <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Mobile nav panel -->
    <nav
      v-if="user && menuOpen"
      id="mobile-nav"
      class="border-t border-rule lg:hidden"
      aria-label="Main"
    >
      <div class="mx-auto max-w-5xl space-y-1 px-4 py-3 sm:px-6">
        <div class="pb-2">
          <BookSwitcher block />
        </div>
        <NuxtLink
          v-for="l in links" :key="l.to" :to="l.to"
          class="block rounded-md px-3 py-2.5 text-sm font-medium text-faint transition-colors hover:bg-indigo-wash hover:text-ink"
          active-class="!bg-indigo !text-paper"
          @click="menuOpen = false"
        >
          {{ l.label }}
        </NuxtLink>
        <button
          type="button"
          class="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-clay transition-colors hover:bg-clay-soft"
          @click="signOut"
        >
          Sign out
        </button>
      </div>
    </nav>
  </header>
</template>
