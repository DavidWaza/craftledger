<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const notice = ref('')
const busy = ref(false)

// If already signed in, don't sit on the login page.
watchEffect(() => {
  if (user.value) navigateTo('/')
})

async function submit() {
  error.value = ''
  notice.value = ''
  if (!email.value.trim()) return (error.value = 'Enter your email.')
  if (password.value.length < 6) return (error.value = 'Password must be at least 6 characters.')

  busy.value = true
  try {
    if (mode.value === 'signup') {
      const { error: e } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          // Where the confirmation link sends people back to. Points at the
          // live site so links don't dead-end on localhost.
          emailRedirectTo: 'https://craftledger.vercel.app/confirm'
        }
      })
      if (e) throw e
      // With email confirmation on, there's no session yet.
      if (!user.value) {
        notice.value = 'Account created. Check your email to confirm, then sign in.'
        mode.value = 'signin'
      } else {
        await navigateTo('/')
      }
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      })
      if (e) throw e
      // Session is live before the JWT ref updates — read it directly so the
      // ledger plugin loads this account, not whoever was signed in before.
      await supabase.auth.getSession()
      await navigateTo('/')
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Something went wrong. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center px-1 sm:min-h-[70vh]">
    <div class="text-center">
      <span class="font-display text-2xl font-bold tracking-tight text-indigo">craftleger</span>
      <p class="mt-1 text-sm text-faint">Books for makers, kept in the cloud.</p>
    </div>

    <form class="mt-8 rounded-lg border border-rule bg-card p-4 shadow-lift sm:p-6" @submit.prevent="submit">
      <h1 class="font-display text-lg font-semibold">
        {{ mode === 'signin' ? 'Sign in to your books' : 'Create your books' }}
      </h1>

      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Email</span>
        <input v-model="email" type="email" autocomplete="email" class="field" placeholder="you@example.com" />
      </label>

      <label class="mt-4 block">
        <span class="mb-1 block text-xs font-medium text-faint">Password</span>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            class="field pr-10"
            placeholder="At least 6 characters"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-faint transition-colors hover:text-ink"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <svg
              v-if="showPassword"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" stroke-linecap="round" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" stroke-linecap="round" />
              <path d="M1 1l22 22" stroke-linecap="round" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" stroke-linecap="round" />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </label>

      <p v-if="error" class="mt-3 rounded-md bg-clay-soft px-3 py-2 text-sm text-clay">{{ error }}</p>
      <p v-if="notice" class="mt-3 rounded-md bg-moss-soft px-3 py-2 text-sm text-moss">{{ notice }}</p>

      <button type="submit" class="btn-primary mt-5 w-full justify-center" :disabled="busy">
        {{ busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up' }}
      </button>

      <p class="mt-4 text-center text-sm text-faint">
        <template v-if="mode === 'signin'">
          New here?
          <button type="button" class="font-medium text-indigo hover:underline" @click="mode = 'signup'; error = ''; notice = ''">
            Create an account
          </button>
        </template>
        <template v-else>
          Already have books?
          <button type="button" class="font-medium text-indigo hover:underline" @click="mode = 'signin'; error = ''; notice = ''">
            Sign in
          </button>
        </template>
      </p>
    </form>
  </div>
</template>
