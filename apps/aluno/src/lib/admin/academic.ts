import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { type ModuleDetail, MODULE_COLS, type ModuleRow, loadFaculty, loadModuleDetail, toCohort, toModule, today } from '@/lib/academic/load'
import { assignStates, type CohortVM, type FacultyRef, type ModuleVM } from '@/lib/academic/model'

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

export type CohortSummary = CohortVM & { modules: number; published: number; students: number; onPublic: boolean }

/** Turmas com contagens, para a lista do painel. */
export async function listCohorts(): Promise<CohortSummary[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const [{ data: cohorts }, { data: modules }, { data: enrollments }] = await Promise.all([
    supabase.from('cohorts').select('id, name, slug, starts_on, ends_on, status, description, closed_at, show_on_public').order('starts_on', { ascending: false }),
    supabase.from('modules').select('cohort_id, status').neq('status', 'arquivado'),
    supabase.from('enrollments').select('cohort_id, role_in_cohort, status'),
  ])
  return (cohorts ?? []).map((c) => ({
    ...toCohort(c),
    onPublic: c.show_on_public,
    modules: (modules ?? []).filter((m) => m.cohort_id === c.id).length,
    published: (modules ?? []).filter((m) => m.cohort_id === c.id && m.status === 'publicado').length,
    students: (enrollments ?? []).filter((e) => e.cohort_id === c.id && e.role_in_cohort === 'aluno' && e.status === 'ativa').length,
  }))
}

/** Todos os módulos da turma (rascunho, publicado e arquivado), na ordem do painel. */
export async function adminModules(cohortId: string): Promise<ModuleVM[]> {
  const supabase = await client()
  const { data, error } = await supabase.from('modules').select(MODULE_COLS).eq('cohort_id', cohortId).order('position')
  if (error) throw new Error(error.message)
  const modules = (data as unknown as ModuleRow[]).map(toModule)
  assignStates(modules.filter((m) => m.status === 'publicado'), today())
  return modules
}

export type HistoryEntry = { id: number; at: string; actor: string; table: string; action: string; changes: Record<string, unknown> }

const TABLE_LABEL: Record<string, string> = {
  modules: 'Módulo',
  module_days: 'Dia',
  module_sessions: 'Atividade',
  session_faculty: 'Professor da atividade',
  module_staff: 'Equipe',
  module_materials: 'Material',
  module_deliverables: 'Entrega',
  module_resources: 'Aula/recurso',
  module_internal_notes: 'Observações internas',
  cohorts: 'Turma',
  cohort_events: 'Evento',
}

export async function moduleHistory(moduleId: string, limit = 40): Promise<HistoryEntry[]> {
  const supabase = await client()
  const { data } = await supabase
    .from('change_log')
    .select('id, at, actor, table_name, action, changes')
    .eq('module_id', moduleId)
    .order('at', { ascending: false })
    .limit(limit)
  const actors = [...new Set((data ?? []).map((d) => d.actor).filter((a): a is string => Boolean(a)))]
  const { data: people } = actors.length ? await supabase.from('profiles').select('id, full_name, display_name').in('id', actors) : { data: [] }
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Admin']))
  return (data ?? []).map((d) => ({
    id: d.id,
    at: d.at,
    actor: d.actor ? (names.get(d.actor) ?? 'Admin') : 'Pré-cadastro',
    table: TABLE_LABEL[d.table_name] ?? d.table_name,
    action: d.action,
    changes: (d.changes ?? {}) as Record<string, unknown>,
  }))
}

export type AdminModulePage = {
  detail: ModuleDetail
  cohort: CohortVM
  siblings: ModuleVM[]
  faculty: FacultyRef[]
  history: HistoryEntry[]
  students: number
}

export async function loadAdminModule(id: string): Promise<AdminModulePage | null> {
  const detail = await loadModuleDetail(id)
  if (!detail) return null
  const supabase = await client()
  const [{ data: cohort }, siblings, faculty, history, { count }] = await Promise.all([
    supabase.from('cohorts').select('id, name, slug, starts_on, ends_on, status, description, closed_at').eq('id', detail.module.cohortId).single(),
    adminModules(detail.module.cohortId),
    loadFaculty(),
    moduleHistory(id),
    supabase.from('enrollments').select('user_id', { count: 'exact', head: true }).eq('cohort_id', detail.module.cohortId).eq('role_in_cohort', 'aluno').eq('status', 'ativa'),
  ])
  if (!cohort) return null
  const own = siblings.find((s) => s.id === id)
  if (own) detail.module.state = own.state
  return { detail, cohort: toCohort(cohort), siblings, faculty, history, students: count ?? 0 }
}
