// Types describing the Supabase database, so the typed client knows the shape
// of `profiles` and `entries`. Mirror this with supabase-schema.sql.
// (You can also regenerate it with: supabase gen types typescript --project-id <ref>)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          business_name: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          business_name?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          id: string
          user_id: string
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
