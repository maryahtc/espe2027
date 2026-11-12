import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'
import { cohortModules, today } from '@/lib/academic/load'
import type { CohortVM } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { CASE_COLS, type CaseRow, loadStepOptions, moduleSpans, type RecordRow, recordCols, toCase, toRecord } from '@/lib/cases/load'
import type { ModuleSpan, StepOption } from '@/lib/cases/model'
import { loadCohortCases } from '@/lib/cases/staff'
import { type Period, type ProductionBase, productionBase } from '@/lib/production/model'
import { trackingCohorts } from '@/lib/tracking/load'
import {
  type Coverage,
  cohortEvolution,
  cohortSummary,
  coverage,
  type DifficultyRow,
  difficulties,
  modulesContext,
  type OwnedCase,
  type Panorama,
  panorama,
  type StudentRow,
  studentProductions,
  studentRows,
} from './model'

/**
 * Etapa 10 — cargas da Visão da turma e da produção individual (coordenação/Admin). Só leitura, sempre pela sessão
 * de quem está logado (RLS): a coordenação só lê as turmas que coordena; o Admin, todas.
 *
 * Caminhos de leitura (nenhum contorna a auditoria):
 * - `cohortPanel`: só AGREGADOS da turma e a linha-resumo de cada aluno (casos, consultas, experiências, concluídos,
 *   último registro). Nunca devolve a produção detalhada de um aluno.
 * - `studentProduction`: a ÚNICA função que devolve a produção detalhada de um aluno. Grava a auditoria no banco antes
 *   de ler qualquer dado (log_student_production_view); recusada → null, sem dados.
 */

export const AUDIT_SCHEMA = '20261112120000'

/** O banco já tem a função de auditoria da produção individual? Sem ela, a página individual fica indisponível. */
export const auditReady = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase.rpc('health')
  return ((data as { schema?: string } | null)?.schema ?? '') >= AUDIT_SCHEMA
})

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/** A turma, se a pessoa pode acompanhá-la (Admin: todas; coordenação: as que coordena, com matrícula ativa). */
export async function authorizedCohort(auth: AuthState, cohortId: string): Promise<CohortVM | null> {
  if (auth.role !== 'admin' && auth.role !== 'coordenacao') return null
  return (await trackingCohorts(auth)).find((c) => c.id === cohortId) ?? null
}

export type CohortPanel = {
  cohort: CohortVM
  today: string
  coverage: Coverage
  summary: ReturnType<typeof cohortSummary>
  evolution: ReturnType<typeof cohortEvolution>
  panorama: Panorama
  difficulties: DifficultyRow[]
  rows: StudentRow[]
  modules: { done: number; total: number }
}

/** Visão da turma no período. null = turma não autorizada para esta pessoa. */
export async function cohortPanel(auth: AuthState, cohortId: string, period: Period): Promise<CohortPanel | null> {
  const cohort = await authorizedCohort(auth, cohortId)
  if (!cohort) return null
  const supabase = await client()
  const [{ students, cases }, options, modules] = await Promise.all([loadCohortCases(cohortId), loadStepOptions(), cohortModules(cohortId)])
  const caseIds = cases.map((c) => c.id)
  const [{ data: links }, { data: topics }] = await Promise.all([
    caseIds.length ? supabase.from('case_difficulty_topics').select('case_id, topic_id').in('case_id', caseIds) : Promise.resolve({ data: [] as Array<{ case_id: string; topic_id: string }> }),
    supabase.from('topics').select('id, name'),
  ])
  const caseTopics = new Map<string, string[]>()
  for (const l of links ?? []) caseTopics.set(l.case_id, [...(caseTopics.get(l.case_id) ?? []), l.topic_id])
  const now = today()
  const list = studentProductions(students, cases as OwnedCase[], cohortId, moduleSpans(modules), options, period)
  return {
    cohort,
    today: now,
    coverage: coverage(list),
    summary: cohortSummary(list),
    evolution: cohortEvolution(list, cohort, now),
    panorama: panorama(list, options),
    difficulties: difficulties(list, caseTopics, new Map((topics ?? []).map((t) => [t.id, t.name]))),
    rows: studentRows(list),
    modules: modulesContext(modules, now),
  }
}

export type StudentProductionView =
  | { state: 'indisponivel' }
  | {
      state: 'ok'
      cohort: CohortVM
      student: { id: string; name: string; active: boolean }
      cases: OwnedCase[]
      base: ProductionBase
      options: StepOption[]
      spans: ModuleSpan[]
      modules: Awaited<ReturnType<typeof cohortModules>>
    }

/**
 * Produção individual de um aluno, só leitura. Primeiro a auditoria (o banco confere identidade, permissão na turma e
 * que o aluno pertence a ela, e grava quem/quem/turma/quando); só depois os dados. null = sem permissão.
 */
export async function studentProduction(auth: AuthState, cohortId: string, studentId: string): Promise<StudentProductionView | null> {
  if (!/^[0-9a-f-]{36}$/.test(cohortId) || !/^[0-9a-f-]{36}$/.test(studentId)) return null
  if (!(await auditReady())) return { state: 'indisponivel' }
  const cohort = await authorizedCohort(auth, cohortId)
  if (!cohort) return null
  const supabase = await client()
  const { data: allowed } = await supabase.rpc('log_student_production_view', { p_student_id: studentId, p_cohort_id: cohortId })
  if (allowed !== true) return null
  const [{ data: enr }, { data: cases }, options, modules] = await Promise.all([
    supabase.from('enrollments').select('status, profiles(full_name, display_name)').eq('cohort_id', cohortId).eq('user_id', studentId).eq('role_in_cohort', 'aluno').maybeSingle(),
    supabase.from('clinical_cases').select(`${CASE_COLS}, owner_id`).eq('cohort_id', cohortId).eq('owner_id', studentId),
    loadStepOptions(),
    cohortModules(cohortId),
  ])
  if (!enr) return null
  const ids = (cases ?? []).map((c) => (c as unknown as CaseRow).id)
  const { data: records } = ids.length
    ? await supabase.from('performed_procedures').select(await recordCols()).in('case_id', ids).returns<RecordRow[]>()
    : { data: [] as RecordRow[] }
  const byCase = new Map<string, ReturnType<typeof toRecord>[]>()
  for (const r of records ?? []) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), toRecord(r)])
  const owned: OwnedCase[] = ((cases ?? []) as unknown as Array<CaseRow & { owner_id: string }>).map((c) => ({ ...toCase(c, byCase.get(c.id) ?? [], []), ownerId: c.owner_id }))
  const p = enr.profiles as unknown as { full_name: string | null; display_name: string | null } | null
  const spans = moduleSpans(modules)
  return {
    state: 'ok',
    cohort,
    student: { id: studentId, name: p?.display_name?.trim() || p?.full_name?.trim() || 'Aluno sem nome', active: enr.status === 'ativa' },
    cases: owned,
    base: productionBase(owned, cohortId, spans, options),
    options,
    spans,
    modules,
  }
}
