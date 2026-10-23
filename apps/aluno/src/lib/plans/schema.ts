import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'
import { getSimulation } from '@/lib/simulation/session'

/**
 * O banco já tem a migração do Planejamento do caso (20261023120000)? Enquanto não tiver (produção só recebe a
 * migração com autorização), o portal segue exatamente como antes: nenhuma tela consulta as tabelas novas e o
 * Planejamento não aparece para alunos, coordenação ou Admin.
 */
export const PLAN_SCHEMA = '20261023120000'

export const planReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  const schema = (data as { schema?: string } | null)?.schema ?? ''
  return schema >= PLAN_SCHEMA
})

/**
 * O aluno vê o Planejamento? Aluno real: só com a migração aplicada. Modo de simulação: sempre — ali o plano vive só
 * no rascunho do cookie e nenhuma tabela é consultada ou gravada.
 */
export const planEnabled = cache(async (): Promise<boolean> => ((await getSimulation()) ? true : planReady()))
