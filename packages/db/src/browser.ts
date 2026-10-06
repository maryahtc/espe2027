import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

/** Cliente do Supabase no navegador (componentes de cliente). Sujeito à RLS. */
export function createSupabaseBrowserClient() {
  const env = readSupabaseEnv()
  if (!env) return null
  return createBrowserClient<Database>(env.url, env.publishableKey)
}
