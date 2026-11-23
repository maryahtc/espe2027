import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { CohortVM } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'
import type { TaskVM } from './model'
import { tasksReady } from './schema'

/**
 * Cargas do quadro de pendências, sempre pela sessão de quem está logado (RLS): Admin vê tudo; coordenação, só as
 * pendências das turmas que coordena (nunca as gerais). Aluno não chega aqui (as páginas recusam antes).
 */

const COLS =
  'id, cohort_id, module_id, category, title, details, responsible_id, responsible_ops_id, due_date, priority, status, next_action, depends_on_id, dependency_note, quantity_needed, quantity_available, partner_name, link_url, completed_at, updated_at'

type Row = {
  id: string
  cohort_id: string | null
  module_id: string | null
  category: TaskVM['category']
  title: string
  details: string | null
  responsible_id: string | null
  responsible_ops_id: string | null
  due_date: string | null
  priority: TaskVM['priority']
  status: TaskVM['status']
  next_action: string | null
  depends_on_id: string | null
  dependency_note: string | null
  quantity_needed: number | null
  quantity_available: number | null
  partner_name: string | null
  link_url: string | null
  completed_at: string | null
  updated_at: string
}

export type ModuleOption = { id: string; cohortId: string; label: string }
/** Responsável: chave "f:<id>" (equipe acadêmica, faculty) ou "o:<id>" (Equipe operacional). */
export type PersonOption = { id: string; name: string; group: 'academica' | 'operacional'; active: boolean }

export type TaskBoardData = {
  tasks: TaskVM[]
  cohorts: CohortVM[]
  modules: ModuleOption[]
  people: PersonOption[]
  /** Admin pode criar pendência geral (sem turma) e excluir. */
  admin: boolean
}

const moduleLabel = (m: { number: number | null; title: string }) => (m.number ? `Módulo ${String(m.number).padStart(2, '0')}` : m.title)

export async function loadTaskBoard(auth: AuthState, filter: { moduleId?: string } = {}): Promise<TaskBoardData | null> {
  if (auth.role !== 'admin' && auth.role !== 'coordenacao') return null
  if (!(await tasksReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const cohorts = await trackingCohorts(auth)
  const cohortIds = cohorts.map((c) => c.id)
  let q = supabase.from('admin_tasks').select(COLS)
  if (filter.moduleId) q = q.eq('module_id', filter.moduleId)
  const [{ data: rows }, { data: mods }, { data: fac }, { data: ops }] = await Promise.all([
    q.returns<Row[]>(),
    cohortIds.length
      ? supabase.from('modules').select('id, cohort_id, number, title').in('cohort_id', cohortIds).neq('status', 'arquivado').order('position')
      : Promise.resolve({ data: [] as Array<{ id: string; cohort_id: string; number: number | null; title: string }> }),
    supabase.from('faculty').select('id, display_name, kind, active').order('display_name'),
    supabase.from('ops_people').select('id, name, role_title, active').order('name'),
  ])
  const modules: ModuleOption[] = (mods ?? []).map((m) => ({ id: m.id, cohortId: m.cohort_id, label: `${moduleLabel(m)}${m.title && !/^Módulo \d+$/.test(m.title) ? ` · ${m.title}` : ''}` }))
  const modName = new Map(modules.map((m) => [m.id, m.label]))
  const people: PersonOption[] = [
    ...(fac ?? []).map((f) => ({ id: `f:${f.id}`, name: f.display_name, group: 'academica' as const, active: f.active })),
    ...(ops ?? []).map((o) => ({ id: `o:${o.id}`, name: o.role_title ? `${o.name} (${o.role_title})` : o.name, group: 'operacional' as const, active: o.active })),
  ]
  const personName = new Map(people.map((p) => [p.id, p.name]))
  const cohortName = new Map(cohorts.map((c) => [c.id, c.name]))
  const list = rows ?? []
  const titleOf = new Map(list.map((r) => [r.id, r.title]))
  const tasks: TaskVM[] = list.map((r) => ({
    id: r.id,
    cohortId: r.cohort_id,
    cohortName: r.cohort_id ? (cohortName.get(r.cohort_id) ?? null) : null,
    moduleId: r.module_id,
    moduleLabel: r.module_id ? (modName.get(r.module_id) ?? null) : null,
    category: r.category,
    title: r.title,
    details: r.details,
    responsibleId: r.responsible_id ? `f:${r.responsible_id}` : r.responsible_ops_id ? `o:${r.responsible_ops_id}` : null,
    responsibleName: r.responsible_id ? (personName.get(`f:${r.responsible_id}`) ?? null) : r.responsible_ops_id ? (personName.get(`o:${r.responsible_ops_id}`) ?? null) : null,
    dueDate: r.due_date,
    priority: r.priority,
    status: r.status,
    nextAction: r.next_action,
    dependsOnId: r.depends_on_id,
    dependsOnTitle: r.depends_on_id ? (titleOf.get(r.depends_on_id) ?? null) : null,
    dependencyNote: r.dependency_note,
    quantityNeeded: r.quantity_needed == null ? null : Number(r.quantity_needed),
    quantityAvailable: r.quantity_available == null ? null : Number(r.quantity_available),
    partnerName: r.partner_name,
    linkUrl: r.link_url,
    completedAt: r.completed_at,
    updatedAt: r.updated_at,
  }))
  return { tasks, cohorts, modules, people, admin: auth.role === 'admin' }
}

/** Só as contagens (painel do Admin). null = banco sem o quadro. */
export async function loadTaskStatuses(): Promise<Array<Pick<TaskVM, 'status' | 'dueDate' | 'priority'>> | null> {
  if (!(await tasksReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data } = await supabase.from('admin_tasks').select('status, due_date, priority')
  return (data ?? []).map((r) => ({ status: r.status, dueDate: r.due_date, priority: r.priority }))
}
