import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'

/**
 * O banco já tem o quadro de pendências (20261123120000)? Enquanto não tiver (produção só recebe a migração com
 * autorização), nenhuma tela consulta a tabela nova: o quadro mostra um aviso e o resto do portal segue igual.
 */
export const TASKS_SCHEMA = '20261123120000'

export const tasksReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  return ((data as { schema?: string } | null)?.schema ?? '') >= TASKS_SCHEMA
})
