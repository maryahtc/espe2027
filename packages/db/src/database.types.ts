/**
 * Tipos do banco. Gerado por `npm run types -w @portal/db` (Supabase CLI) quando o projeto existir;
 * até lá, mantido à mão e restrito ao que a migração base cria.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      schema_info: {
        Row: { id: boolean; version: string; updated_at: string }
        Insert: { id?: boolean; version: string; updated_at?: string }
        Update: { id?: boolean; version?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      health: { Args: Record<string, never>; Returns: Json }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
