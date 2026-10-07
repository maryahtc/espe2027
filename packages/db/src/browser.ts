import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

/**
 * Cliente do Supabase no navegador (componentes de cliente). Sujeito à RLS.
 * Atenção: a sessão fica em cookies httpOnly (ver cookies.ts), então este cliente NÃO enxerga o usuário
 * logado — login e dados do usuário passam sempre pelo servidor.
 */
export function createSupabaseBrowserClient() {
  const env = readSupabaseEnv()
  if (!env) return null
  return createBrowserClient<Database>(env.url, env.publishableKey)
}
