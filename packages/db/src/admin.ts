import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

/**
 * Cliente com a chave secreta: IGNORA a RLS. Uso restrito a operações de Auth que só o servidor pode
 * fazer (enviar convite, gerar link de convite). Nunca para ler ou gravar dados de páginas.
 */
export function createSupabaseAdminClient() {
  const env = readSupabaseEnv()
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!env || !secretKey) return null
  return createClient<Database>(env.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
