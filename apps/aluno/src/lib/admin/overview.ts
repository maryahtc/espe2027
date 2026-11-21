import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cohortModules, today } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { loadTaskStatuses } from '@/lib/tasks/load'
import { type TaskCounts, taskCounts } from '@/lib/tasks/model'
import { workflowsReady } from '@/lib/workflows/schema'
import { type AttentionItem, attentionItems } from './attention'

/**
 * Etapa 10 — números reais e "Precisa da sua atenção" do painel inicial do Admin. Só leitura, sessão do Admin (RLS e
 * a função admin_people recusam quem não é admin). Workflows só entram com o banco já na Etapa 9.
 */
export type AdminOverview = {
  cohortsActive: number
  studentsActive: number
  invitesPending: number
  modules: { published: number; draft: number }
  contents: { published: number; draft: number }
  workflows: { published: number; draft: number } | null
  proceduresActive: number
  announcementsLive: number
  /** Próximo módulo publicado (início hoje ou depois) entre as turmas ativas. Só contexto. */
  nextModule: { id: string; label: string; title: string; start: string; cohortName: string } | null
  /** Quadro de pendências (null = banco ainda sem o quadro). */
  tasks: TaskCounts | null
  attention: AttentionItem[]
}

export async function loadAdminOverview(): Promise<AdminOverview | null> {
  const auth = await requireUser(['admin'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) return null
  const now = today()
  const [wf, taskRows] = await Promise.all([workflowsReady(), loadTaskStatuses()])
  const tasks = taskRows ? taskCounts(taskRows, now) : null
  const [{ data: cohorts }, { data: people }, { data: enr }, { data: contents }, { data: ct }, { data: procs }, { data: ann }, { data: flows }] = await Promise.all([
    supabase.from('cohorts').select('id, name, status'),
    supabase.rpc('admin_people'),
    supabase.from('enrollments').select('cohort_id, status').eq('role_in_cohort', 'aluno'),
    supabase.from('contents').select('id, status'),
    supabase.from('content_topics').select('content_id'),
    supabase.from('procedures').select('id').eq('active', true),
    supabase.from('announcements').select('id').eq('status', 'publicado').lte('visible_from', now).gte('visible_until', now),
    wf ? supabase.from('workflows').select('status') : Promise.resolve({ data: null as Array<{ status: string }> | null }),
  ])
  const active = (cohorts ?? []).filter((c) => c.status === 'ativa').map((c) => c.id)
  const activeSet = new Set(active)
  // Módulos (não arquivados) das turmas ativas, com datas, professores e equipe — a mesma carga do cronograma.
  const modules = (await Promise.all(active.map((id) => cohortModules(id, false)))).flat()
  const moduleIds = modules.map((m) => m.id)
  const [{ data: mc }, { data: mr }] = moduleIds.length
    ? await Promise.all([
        supabase.from('module_contents').select('module_id, requirement, phase, contents(status)').in('module_id', moduleIds).eq('phase', 'antes'),
        supabase.from('module_resources').select('module_id, requirement, phase, status').in('module_id', moduleIds).eq('phase', 'antes'),
      ])
    : [{ data: [] }, { data: [] }]
  const topicCount = new Map<string, number>()
  for (const r of ct ?? []) topicCount.set(r.content_id, (topicCount.get(r.content_id) ?? 0) + 1)
  const prep = [
    ...((mc ?? []) as unknown as Array<{ module_id: string; requirement: string; contents: { status: string } | null }>).map((x) => ({ moduleId: x.module_id, requirement: x.requirement, status: x.contents?.status ?? 'arquivado' })),
    ...((mr ?? []) as Array<{ module_id: string; requirement: string; status: string }>).map((x) => ({ moduleId: x.module_id, requirement: x.requirement, status: x.status })),
  ]
  const cohortName = new Map((cohorts ?? []).map((c) => [c.id, c.name]))
  const next = modules
    .filter((m): m is typeof m & { start: string } => m.status === 'publicado' && !!m.start && m.start >= now)
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  const count = (list: Array<{ status: string }> | null | undefined, s: string) => (list ?? []).filter((x) => x.status === s).length
  return {
    cohortsActive: active.length,
    studentsActive: (enr ?? []).filter((e) => e.status === 'ativa' && activeSet.has(e.cohort_id)).length,
    invitesPending: (people ?? []).filter((p) => p.invited_at && !p.last_sign_in_at && !p.deactivated_at).length,
    modules: { published: modules.filter((m) => m.status === 'publicado').length, draft: modules.filter((m) => m.status === 'rascunho').length },
    contents: { published: count(contents, 'publicado'), draft: count(contents, 'rascunho') },
    workflows: flows ? { published: count(flows, 'publicado'), draft: count(flows, 'rascunho') } : null,
    proceduresActive: (procs ?? []).length,
    announcementsLive: (ann ?? []).length,
    tasks,
    nextModule: next ? { id: next.id, label: next.label, title: next.title, start: next.start, cohortName: cohortName.get(next.cohortId) ?? '' } : null,
    attention: attentionItems({
      today: now,
      people: people ?? [],
      modules: modules.map((m) => ({
        id: m.id,
        label: m.label,
        title: m.title,
        status: m.status,
        start: m.start,
        end: m.end,
        teachers: m.teachers.length,
        staffTeachers: m.staff.filter((s) => s.role === 'principal' || s.role === 'docente').length,
      })),
      prep,
      contents: (contents ?? []).map((c) => ({ status: c.status, topics: topicCount.get(c.id) ?? 0 })),
      workflowsDraft: flows ? count(flows, 'rascunho') : 0,
      tasksOverdue: tasks?.overdue ?? 0,
    }),
  }
}
