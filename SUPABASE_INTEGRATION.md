# Integrating Supabase into CraftLedger — Step by Step

Goal: turn CraftLedger from "books in one browser" into "books in the cloud,
private to each artisan, available on any device" — without changing how the
app feels to use.

The plan in one line: **Supabase becomes the ledger drawer, your `useLedger()`
composable stays the only thing the pages ever talk to.** Pages and components
don't change at all. That's the payoff of having kept all storage logic in one
composable.

---

## Phase 1 — Create the backend (15 minutes, no code)

### Step 1. Create the Supabase project
1. Go to https://supabase.com and sign in with GitHub.
2. Click **New project** → pick your organisation.
3. Name it `craftledger`, choose a strong database password (save it
   somewhere safe — you rarely need it again, but you do need it).
4. Region: choose the one closest to your users (e.g. `eu-west` for
   West-Africa-facing apps — lowest latency to Nigeria currently).
5. Wait ~2 minutes for provisioning.

### Step 2. Run the schema
1. In the dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase-schema.sql` (the file next to this
   guide) and click **Run**.
3. Confirm: **Table Editor** now shows `profiles` and `entries`, both with a
   shield icon (RLS enabled). If there's no shield, stop and re-run section 5
   of the SQL — RLS is what keeps one artisan from reading another's books.

### Step 3. Turn on email auth
1. **Authentication → Providers → Email**: enabled by default, leave it on.
2. Optional for a smoother start: **Authentication → Settings** → turn OFF
   "Confirm email" while developing, turn it back ON before real users.

### Step 4. Collect your two keys
**Project Settings → API**. Copy:
- `Project URL` → e.g. `https://abcd1234.supabase.co`
- `anon public` key (long string starting `eyJ…`)

The `anon` key is safe to ship in the frontend — RLS is what protects data,
not key secrecy. Never copy the `service_role` key into the app.

---

## Phase 2 — Wire the frontend (about an hour)

### Step 5. Install the Nuxt Supabase module
In the `craftledger` folder:

```bash
npm install @nuxtjs/supabase
```

### Step 6. Environment variables
Create a file named `.env` in the project root (it's already in `.gitignore`):

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_KEY=eyJ...your-anon-key...
```

### Step 7. Register the module
In `nuxt.config.ts`, add to the existing config:

```ts
modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

supabase: {
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    exclude: []        // every page requires sign-in; the books are private
  }
}
```

### Step 8. Add a login page
Create `pages/login.vue` with email + password fields calling:

```ts
const supabase = useSupabaseClient()

// sign up
await supabase.auth.signUp({ email, password })
// sign in
await supabase.auth.signInWithPassword({ email, password })
// then: navigateTo('/')
```

Also create a tiny `pages/confirm.vue` that just calls `navigateTo('/')` —
the module uses it to land email-confirmation redirects.

Add a "Sign out" button to `AppHeader.vue`:

```ts
await useSupabaseClient().auth.signOut()
navigateTo('/login')
```

### Step 9. Rewrite the inside of `useLedger()` — and nothing else
Keep the exact same return signature (`entries`, `settings`, `addEntry`,
`updateEntry`, `removeEntry`, `totalFor`, `monthlyNet`, `categoryTotals`,
`yearsOnRecord`). Only the internals change:

```ts
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// LOAD (replaces localStorage read)
async function loadEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('id, type, entry_date, description, category, amount_minor')
    .order('entry_date', { ascending: false })
  if (!error && data) {
    entries.value = data.map(r => ({
      id: r.id,
      type: r.type,
      date: r.entry_date,          // map column → app field
      description: r.description,
      category: r.category,
      amountMinor: Number(r.amount_minor)
    }))
  }
}

// ADD (replaces unshift + localStorage write)
async function addEntry(entry: Omit<LedgerEntry, 'id'>) {
  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: user.value!.id,
      type: entry.type,
      entry_date: entry.date,
      description: entry.description,
      category: entry.category,
      amount_minor: entry.amountMinor
    })
    .select()
    .single()
  if (!error && data) {
    entries.value.unshift({ ...entry, id: data.id })  // optimistic local update
  }
}
```

`updateEntry` → `supabase.from('entries').update({...}).eq('id', id)`
`removeEntry` → `supabase.from('entries').delete().eq('id', id)`
Settings → `select`/`update` on `profiles` the same way.

Note you never filter by `user_id` in reads — RLS does it server-side, which
is exactly why it must be on.

The accounting helpers (`totalFor`, `monthlyNet`, `categoryTotals`) need **zero
changes** — they compute from `entries.value`, which is still just an array.

### Step 10. One-time migration of existing browser data
So nobody loses books already recorded in localStorage, add a "Import from
this browser" button on the Settings page:

```ts
async function importLocal() {
  const raw = localStorage.getItem('craftledger:entries')
  if (!raw) return
  const old = JSON.parse(raw) as LedgerEntry[]
  for (const e of old) {
    await addEntry({ type: e.type, date: e.date, description: e.description,
                     category: e.category, amountMinor: e.amountMinor })
  }
  localStorage.removeItem('craftledger:entries')
}
```

### Step 11. Test locally, in order
1. `npm run dev` → you're redirected to `/login` (auth guard works).
2. Sign up → check **Authentication → Users** in Supabase: user exists, and
   **Table Editor → profiles** auto-created a row (the trigger works).
3. Record an entry → appears in **Table Editor → entries** with your user_id.
4. Open an incognito window, create a second account → it must see an empty
   ledger (RLS works). This test matters more than all the others.
5. Edit, delete, change currency, check Reports — figures should match what
   the old version computed.

---

## Phase 3 — Deploy (10 minutes)

### Step 12. Vercel environment variables
Vercel dashboard → your project → **Settings → Environment Variables**, add
`SUPABASE_URL` and `SUPABASE_KEY` with the same values as `.env`, for
Production and Preview. Then push to `main` — Vercel redeploys automatically.

### Step 13. Tell Supabase about your live URL
**Authentication → URL Configuration** → set Site URL to
`https://your-app.vercel.app` and add it to Redirect URLs. Without this,
email links point at localhost.

### Step 14. Before real users
- Re-enable "Confirm email".
- Supabase free tier pauses projects after 7 days of inactivity — fine while
  building; upgrade or keep traffic flowing once artisans rely on it.
- Keep the CSV export button. An accountant's rule: the client can always
  walk away with their books.

---

## What you gain, in accounting terms

| Before (localStorage) | After (Supabase) |
|---|---|
| Books live in one browser | Books live in a real ledger, reachable anywhere |
| Cleared cache = books gone | Postgres with daily backups |
| One artisan only | Every artisan gets a private, locked set of books |
| Trust the device | Trust the database constraints: amounts > 0, valid types, RLS |

Total effort: roughly an afternoon, and pages/components stay untouched.
