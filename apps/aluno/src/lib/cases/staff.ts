import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { AuthState } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'
import { CASE_COLS, type CaseRow, type RecordRow, recordCols, toCase, toRecord } from './load'
import type { CaseVM } from './model'

/**
 * Leitura dos casos pela coordenação (só a própria turma, só casos não removidos) e pelo admin (todas as turmas,
 * inclusive removidos). Somente leitura: nenhuma ação de escrita sobre o caso existe para esses papéis — e o banco
 * recusa de qualquer forma (só o dono altera). Abrir um caso individual grava a auditoria (log_case_view).
 */
async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/** Turmas que a pessoa pode consultar: admin, todas; coordenação, só as que coordena (mesma regra do banco). */
export const staffCohorts = (auth: AuthState) => trackingCohorts(auth)

export type StaffStudent = { id: string; name: string; active: boolean }
export type StaffCase = CaseVM & { ownerId: string }

const nameOf = (p: { full_name: string | null; display_name: string | null } | null) => p?.display_name?.trim() || p?.full_name?.trim() || 'Aluno sem nome'

/** Alunos da turma e os casos que a pessoa pode ler (a RLS já tira os removidos da coordenação). */
export async function loadCohortCases(cohortId: string): Promise<{ students: StaffStudent[]; cases: StaffCase[] }> {
  const supabase = await client()
  const [{ data: enr }, { data: cases }, { data: records }] = await Promise.all([
    supabase.from('enrollments').select('user_id, status, profiles(full_name, display_name)').eq('cohort_id', cohortId).eq('role_in_cohort', 'aluno'),
    supabase.from('clinical_cases').select(`${CASE_COLS}, owner_id`).eq('cohort_id', cohortId),
    supabase.from('performed_procedures').select(await recordCols()).eq('cohort_id', cohortId).returns<RecordRow[]>(),
  ])
  const students = (enr ?? [])
    .map((e) => ({
      id: e.user_id,
      name: nameOf(e.profiles as unknown as { full_name: string | null; display_name: string | null } | null),
      active: e.status === 'ativa',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const byCase = new Map<string, ReturnType<typeof toRecord>[]>()
  for (const r of (records ?? []) as RecordRow[]) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), toRecord(r)])
  const list = ((cases ?? []) as Array<CaseRow & { owner_id: string }>)
    .map((c) => ({ ...toCase(c, byCase.get(c.id) ?? [], []), ownerId: c.owner_id }))
    .sort((a, b) => (b.lastActivityOn ?? b.createdAt).localeCompare(a.lastActivityOn ?? a.createdAt))
  return { students, cases: list }
}

/**
 * Abre um caso para leitura: primeiro grava a auditoria (o banco só grava/libera se a pessoa pode ler o caso);
 * sem permissão → null (a página responde "não encontrado", sem revelar se o caso existe).
 */
export async function openStaffCase(caseId: string): Promise<(StaffCase & { ownerName: string }) | null> {
  if (!/^[0-9a-f-]{36}$/.test(caseId)) return null
  const supabase = await client()
  const { data: allowed } = await supabase.rpc('log_case_view', { p_case_id: caseId })
  if (allowed !== true) return null
  const [{ data: c }, { data: records }, { data: topics }] = await Promise.all([
    supabase.from('clinical_cases').select(`${CASE_COLS}, owner_id`).eq('id', caseId).maybeSingle(),
    supabase.from('performed_procedures').select(await recordCols()).eq('case_id', caseId).returns<RecordRow[]>(),
    supabase.from('case_difficulty_topics').select('topic_id').eq('case_id', caseId),
  ])
  if (!c) return null
  const row = c as CaseRow & { owner_id: string }
  const { data: owner } = await supabase.from('profiles').select('full_name, display_name').eq('id', row.owner_id).maybeSingle()
  return {
    ...toCase(row, ((records ?? []) as RecordRow[]).map(toRecord), (topics ?? []).map((t) => t.topic_id)),
    ownerId: row.owner_id,
    ownerName: nameOf(owner),
  }
}

export type AuditEntry = {
  id: number
  at: string
  action: string
  actorName: string
  ownerName: string | null
  caseId: string | null
  cohortId: string | null
  details: Record<string, unknown>
}

export const AUDIT_ACTION: Record<string, string> = {
  'caso.abrir': 'Abriu o caso',
  'caso.excluir_definitivo': 'Excluiu definitivamente',
}

/** Auditoria de casos (admin vê tudo; a coordenação, só a da própria turma — regra do banco). */
export async function loadCaseAudit(filter: { caseId?: string; cohortId?: string; limit?: number }): Promise<AuditEntry[]> {
  const supabase = await client()
  let q = supabase.from('audit_log').select('id, at, action, actor, owner_id, entity_id, cohort_id, details').eq('entity', 'clinical_cases')
  if (filter.caseId) q = q.eq('entity_id', filter.caseId)
  if (filter.cohortId) q = q.eq('cohort_id', filter.cohortId)
  const { data } = await q.order('at', { ascending: false }).limit(filter.limit ?? 50)
  const rows = data ?? []
  const people = [...new Set(rows.flatMap((r) => [r.actor, r.owner_id]).filter((x): x is string => !!x))]
  const { data: profs } = people.length ? await supabase.from('profiles').select('id, full_name, display_name').in('id', people) : { data: [] }
  const name = new Map((profs ?? []).map((p) => [p.id, nameOf(p)]))
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    action: r.action,
    actorName: (r.actor && name.get(r.actor)) || 'Conta removida',
    ownerName: r.owner_id ? (name.get(r.owner_id) ?? null) : null,
    caseId: r.entity_id,
    cohortId: r.cohort_id,
    details: (r.details ?? {}) as Record<string, unknown>,
  }))
}
