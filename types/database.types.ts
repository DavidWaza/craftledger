// Types describing the Supabase database, so the typed client knows the shape
// of `books` and `entries`. Mirror this with supabase-schema.sql.
// (You can also regenerate it with: supabase gen types typescript --project-id <ref>)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          currency: string
          vat_registered: boolean
          prices_vat_inclusive: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          color?: string
          currency?: string
          vat_registered?: boolean
          prices_vat_inclusive?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          currency?: string
          vat_registered?: boolean
          prices_vat_inclusive?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          id: string
          user_id: string
          book_id: string
          type: 'income' | 'expense'
          entry_date: string
          description: string
          category: string
          amount_minor: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          type: 'income' | 'expense'
          entry_date: string
          description: string
          category: string
          amount_minor: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          type?: 'income' | 'expense'
          entry_date?: string
          description?: string
          category?: string
          amount_minor?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
