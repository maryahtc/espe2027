import 'server-only'
import type { createSupabaseServerClient } from '@portal/db/server'
import { getAuth } from '@/lib/auth/session'
import { getSimulation, updateSimulation } from '@/lib/simulation/session'
import { simSetProgress } from '@/lib/simulation/state'
import { contentVisible, resourceVisible } from '@/lib/simulation/visibility'

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/**
 * Abriu o conteúdo (arquivo ou link): registra "em andamento" sem rebaixar quem já concluiu.
 * Só para aluno de verdade; na simulação vai para o rascunho; Admin/coordenação fora dela não gravam nada.
 */
export async function markStarted(supabase: Db, contentId: string): Promise<void> {
  const sim = await getSimulation()
  if (sim) {
    if (sim.state.progress[contentId]) return
    try {
      await updateSimulation(sim, (st) => simSetProgress(st, contentId, { status: 'iniciado', percent: 0, positionSeconds: 0, completedAt: null }, new Date().toISOString()))
    } catch {
      // limite da simulação: abrir o conteúdo continua funcionando
    }
    return
  }
  const auth = await getAuth()
  if (!auth || auth === 'previa' || auth.role !== 'aluno') return
  await supabase
    .from('content_progress')
    .upsert({ user_id: auth.userId, content_id: contentId, status: 'iniciado' }, { onConflict: 'user_id,content_id', ignoreDuplicates: true })
}

/** Na simulação, o Admin só abre o que o aluno da turma poderia abrir (a conta Admin lê mais). */
export async function simulationAllowsContent(supabase: Db, contentId: string): Promise<boolean> {
  const sim = await getSimulation()
  if (!sim) return true
  const { data: c } = await supabase.from('contents').select('status, available_from, content_cohorts(cohort_id)').eq('id', contentId).maybeSingle()
  if (!c) return false
  const cohortIds = (c.content_cohorts as unknown as Array<{ cohort_id: string }>).map((x) => x.cohort_id)
  return contentVisible({ status: c.status, availableFrom: c.available_from, cohortIds }, sim.cohortVM.id)
}

export async function simulationAllowsResource(supabase: Db, resourceId: string): Promise<boolean> {
  const sim = await getSimulation()
  if (!sim) return true
  const { data: r } = await supabase.from('module_resources').select('status, available_from, modules(cohort_id, status)').eq('id', resourceId).maybeSingle()
  const m = r?.modules as unknown as { cohort_id: string; status: string } | null
  return !!r && !!m && m.cohort_id === sim.cohortVM.id && m.status === 'publicado' && resourceVisible({ status: r.status, availableFrom: r.available_from })
}
