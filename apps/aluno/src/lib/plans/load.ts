import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { DentalArch } from '@/lib/procedures/model'
import { getSimulation } from '@/lib/simulation/session'
import type { PlanVisit } from './model'
import { planEnabled, planReady } from './schema'
import { simPlan } from './sim'

type VisitRow = { id: string; case_id: string; position: number; note: string | null; realized_on: string | null }
type ItemRow = { id: string; visit_id: string; step_id: string; procedure_id: string; teeth: number[] | null; arch: DentalArch | null; quantity: number; other_description: string | null; position: number }

async function fromDb(caseId: string): Promise<PlanVisit[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const [{ data: visits }, { data: items }] = await Promise.all([
    supabase.from('case_plan_visits').select('id, case_id, position, note, realized_on').eq('case_id', caseId).returns<VisitRow[]>(),
    supabase.from('case_plan_items').select('id, visit_id, step_id, procedure_id, teeth, arch, quantity, other_description, position').eq('case_id', caseId).returns<ItemRow[]>(),
  ])
  return (visits ?? []).map((v) => ({
    id: v.id,
    position: v.position,
    note: v.note,
    realizedOn: v.realized_on,
    items: (items ?? [])
      .filter((i) => i.visit_id === v.id)
      .map((i) => ({ id: i.id, stepId: i.step_id, procedureId: i.procedure_id, teeth: i.teeth ?? [], arch: i.arch, quantity: i.quantity, description: i.other_description, position: i.position })),
  }))
}

/**
 * Planejamento do caso do próprio aluno: na simulação, do rascunho; aluno real, do banco (só com a migração).
 * null = Planejamento desativado (banco na versão anterior) — a tela não mostra nada e nada é consultado.
 */
export async function loadMyPlan(caseId: string): Promise<PlanVisit[] | null> {
  if (!(await planEnabled())) return null
  const sim = await getSimulation()
  if (sim) return simPlan(sim.state, caseId)
  return fromDb(caseId)
}

/** Leitura da coordenação/Admin (somente leitura, RLS do caso). Só com a migração aplicada. */
export async function loadStaffPlan(caseId: string): Promise<PlanVisit[] | null> {
  if (!(await planReady())) return null
  return fromDb(caseId)
}
