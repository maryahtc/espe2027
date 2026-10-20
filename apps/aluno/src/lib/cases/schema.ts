import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'

/**
 * O banco já tem a migração do odontograma e da arcada (20261021120000)? Até ela ser aplicada em produção (com
 * autorização), o portal segue o comportamento anterior: sem arcada e com dentes opcionais como antes.
 */
export const ODONTO_SCHEMA = '20261021120000'

export const odontogramReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  const schema = (data as { schema?: string } | null)?.schema ?? ''
  return schema >= ODONTO_SCHEMA
})
