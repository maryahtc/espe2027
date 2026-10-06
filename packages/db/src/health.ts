import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

export type DatabaseHealth =
  | { status: 'ok'; schema: string }
  | { status: 'nao-configurado' }
  | { status: 'erro'; message: string }

/** Confere a conexão chamando public.health() — que devolve só a versão do esquema. */
export async function checkDatabase(timeoutMs = 4000): Promise<DatabaseHealth> {
  const env = readSupabaseEnv()
  if (!env) return { status: 'nao-configurado' }
  const client = createClient<Database>(env.url, env.publishableKey, { auth: { persistSession: false } })
  try {
    const { data, error } = await client.rpc('health').abortSignal(AbortSignal.timeout(timeoutMs))
    if (error) return { status: 'erro', message: error.message }
    const schema = (data as { schema?: string } | null)?.schema ?? 'desconhecido'
    return { status: 'ok', schema }
  } catch (e) {
    return { status: 'erro', message: e instanceof Error ? e.message : 'falha desconhecida' }
  }
}
