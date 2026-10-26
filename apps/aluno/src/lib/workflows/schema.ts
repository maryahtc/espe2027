import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'

/**
 * O banco já tem a migração dos Workflows clínicos (20261024120000)? Enquanto não tiver (produção só recebe a migração
 * com autorização), nenhuma tela consulta as tabelas novas: o editor mostra um aviso e o resto do portal segue igual.
 */
export const WORKFLOW_SCHEMA = '20261024120000'

export const workflowsReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  const schema = (data as { schema?: string } | null)?.schema ?? ''
  return schema >= WORKFLOW_SCHEMA
})
