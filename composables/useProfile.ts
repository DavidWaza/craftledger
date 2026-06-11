import type { Profile } from '~/types/profile'

/** Shape of a row in the `profiles` table. */
interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
}

const PROFILE_COLUMNS = 'id, email, full_name'

/**
 * The signed-in user's account profile (display name + email), stored in the
 * `profiles` table. A row is created automatically by the sign-up trigger; this
 * composable loads it and lets the user edit their display name. State is shared
 * app-wide via useState and cleared on account switch by plugins/ledger.client.ts.
 */
export function useProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const profile = useState<Profile | null>('cl-profile', () => null)
  const profileLoaded = useState('cl-profile-loaded', () => false)

  function rowToProfile(r: ProfileRow): Profile {
    return {
      id: r.id,
      email: r.email ?? '',
      fullName: r.full_name ?? ''
    }
  }

  /** Returns true only when the fetch actually completed. */
  async function loadProfile(): Promise<boolean> {
    const uid = authUserId(user.value)
    if (!uid) return false
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.error('[useProfile] loadProfile', error)
      return false
    }
    // The trigger should have made a row; if it somehow didn't, create one so
    // the profile is never silently missing.
    if (!data) {
      const created = await ensureRow(uid)
      profile.value = created
    } else {
      profile.value = rowToProfile(data as ProfileRow)
    }
    profileLoaded.value = true
    return true
  }

  /** Insert a starter row for accounts that predate the trigger / migration. */
  async function ensureRow(uid: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: uid, email: user.value?.email ?? null, full_name: '' })
      .select(PROFILE_COLUMNS)
      .single()
    if (error) {
      console.error('[useProfile] ensureRow', error)
      return null
    }
    return data ? rowToProfile(data as ProfileRow) : null
  }

  /** Save edits (currently just the display name) back to the DB. */
  async function updateProfile(patch: { fullName?: string }): Promise<boolean> {
    const uid = authUserId(user.value)
    if (!uid) return false
    const dbPatch: { full_name?: string } = {}
    if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName
    const { data, error } = await supabase
      .from('profiles')
      .update(dbPatch)
      .eq('id', uid)
      .select(PROFILE_COLUMNS)
      .maybeSingle()
    if (error) {
      console.error('[useProfile] updateProfile', error)
      return false
    }
    if (data) profile.value = rowToProfile(data as ProfileRow)
    return true
  }

  function reset() {
    profile.value = null
    profileLoaded.value = false
  }

  return { profile, profileLoaded, loadProfile, updateProfile, reset }
}
