import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'

/** O banco já tem professores e logística (20261124120000)? Sem isso, as telas mostram só um aviso. */
export const LOGISTICS_SCHEMA = '20261124120000'

export const logisticsReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  return ((data as { schema?: string } | null)?.schema ?? '') >= LOGISTICS_SCHEMA
})
