<script setup lang="ts">
// The Supabase module redirects email-confirmation / OAuth links here.
// Once a session exists, send the artisan to their books.
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) navigateTo('/')
})

onMounted(() => {
  // Fallback in case the session is already established on load.
  if (user.value) navigateTo('/')
})
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center text-center">
    <span class="font-display text-xl font-bold tracking-tight text-indigo">craftleger</span>
    <p class="mt-2 text-sm text-faint">Signing you in…</p>
  </div>
</template>
