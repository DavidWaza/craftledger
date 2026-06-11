/** A user's account profile — one row per auth user, in `public.profiles`. */
export interface Profile {
  id: string
  email: string
  fullName: string
}
