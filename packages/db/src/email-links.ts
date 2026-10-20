import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

/**
 * Cliente só para PEDIR links de e-mail (recuperação de senha) no formato com a sessão no fragmento (#access_token=…),
 * o mesmo dos convites. O cliente padrão do servidor usa o fluxo PKCE: o link volta com ?code=… e só funciona no mesmo
 * navegador em que foi pedido (o verificador fica num cookie) — no celular × computador, falhava.
 * Chave publicável, sem sessão guardada: não lê nem grava dados.
 */
export function createSupabaseEmailLinkClient() {
  const env = readSupabaseEnv()
  if (!env) return null
  return createClient<Database>(env.url, env.publishableKey, {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
