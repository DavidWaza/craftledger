import type { JwtPayload } from '@supabase/supabase-js'

/** @nuxtjs/supabase v2 exposes the JWT as `useSupabaseUser()` — the uid is `sub`, not `id`. */
export function authUserId(user: JwtPayload | null | undefined): string | null {
  return user?.sub ?? null
}

/** Turn a PostgREST / auth error into something an artisan can act on. */
export function supabaseErrorMessage(error: { message?: string; code?: string; details?: string }): string {
  const msg = error.message ?? 'Something went wrong saving to the cloud.'
  if (error.code === '42P01' || /relation.*does not exist/i.test(msg)) {
    return 'The database tables are missing — run supabase-schema.sql in your Supabase SQL Editor, then try again.'
  }
  if (error.code === '42501' || /row-level security/i.test(msg)) {
    return 'Permission denied — sign out and back in, or check Row Level Security in Supabase.'
  }
  return msg
}
