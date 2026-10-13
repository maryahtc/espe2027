import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cohortModules, viewerCohorts } from '@/lib/academic/load'
import type { CohortVM } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { CONTENT_COLS, type ContentRow, toContent } from '@/lib/library/load'
import { isReleased } from '@/lib/library/model'
import { buildTracking, type TContent, type TModule, type TProgress, type TStudent, type Tracking } from './model'

/**
 * Turmas que a pessoa pode acompanhar: admin, todas; coordenação, só as que coordena.
 * (A RLS garante o mesmo no banco: a coordenação só lê alunos e progresso da própria turma.)
 */
export async function trackingCohorts(auth: AuthState): Promise<CohortVM[]> {
  const all = await viewerCohorts()
  if (auth.role === 'admin') return all
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase.from('enrollments').select('cohort_id').eq('user_id', auth.userId).eq('role_in_cohort', 'coordenacao').eq('status', 'ativa')
  const mine = new Set((data ?? []).map((e) => e.cohort_id))
  return all.filter((c) => mine.has(c.id))
}

export type CohortTracking = {
  students: TStudent[]
  contents: TContent[]
  modules: TModule[]
  progress: TProgress[]
  tracking: Tracking
}

export async function loadCohortTracking(cohortId: string): Promise<CohortTracking> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  const [{ data: enr }, { data: rows, error }, mods] = await Promise.all([
    supabase
      .from('enrollments')
      .select('user_id, profiles(id, full_name, display_name, deactivated_at)')
      .eq('cohort_id', cohortId)
      .eq('role_in_cohort', 'aluno')
      .eq('status', 'ativa'),
    supabase.from('contents').select(CONTENT_COLS).eq('status', 'publicado').order('title'),
    cohortModules(cohortId),
  ])
  if (error) throw new Error(error.message)

  const students: TStudent[] = (enr ?? [])
    .map((e) => e.profiles as unknown as { id: string; full_name: string; display_name: string | null; deactivated_at: string | null } | null)
    .filter((p): p is NonNullable<typeof p> => !!p && !p.deactivated_at)
    .map((p) => ({ id: p.id, name: p.display_name?.trim() || p.full_name?.trim() || 'Aluno sem nome' }))

  const contents: TContent[] = (rows as unknown as ContentRow[])
    .map((r) => toContent(r))
    .filter((c) => (!c.cohortIds.length || c.cohortIds.includes(cohortId)) && isReleased(c))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      kind: c.kind,
      category: c.category,
      modules: c.modules.filter((m) => m.cohortId === cohortId).map((m) => ({ moduleId: m.moduleId, requirement: m.requirement, phase: m.phase })),
    }))

  const modules: TModule[] = mods.map((m) => ({ id: m.id, number: m.number, title: m.title, theme: m.theme, state: m.state, start: m.start }))

  const ids = students.map((s) => s.id)
  const { data: prog } = ids.length
    ? await supabase.from('content_progress').select('user_id, content_id, status, percent, updated_at, completed_at').in('user_id', ids)
    : { data: [] }
  const contentIds = new Set(contents.map((c) => c.id))
  const progress: TProgress[] = (prog ?? [])
    .filter((p) => contentIds.has(p.content_id))
    .map((p) => ({ userId: p.user_id, contentId: p.content_id, status: p.status, percent: p.percent, updatedAt: p.updated_at, completedAt: p.completed_at }))

  return { students, contents, modules, progress, tracking: buildTracking({ students, contents, modules, progress }) }
}
