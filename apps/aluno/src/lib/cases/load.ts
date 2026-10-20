import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'
import { cohortModules, loadFaculty } from '@/lib/academic/load'
import type { AuthState } from '@/lib/auth/session'
import { loadLibrary, loadTaxonomy } from '@/lib/library/load'
import { type ContentVM, isReleased } from '@/lib/library/model'
import { getSimulation } from '@/lib/simulation/session'
import { simCases } from '@/lib/simulation/state'
import type { CaseVM, ModuleSpan, RecordVM, StepOption } from './model'
import { normalize } from './model'

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/** Etapas ativas de procedimentos ativos, prontas para o registro (rótulo, unidade, busca por sinônimos). */
export const loadStepOptions = cache(async (): Promise<StepOption[]> => {
  const supabase = await client()
  const [{ data: cats }, { data: procs }, { data: steps }] = await Promise.all([
    supabase.from('procedure_categories').select('id, name, position'),
    supabase.from('procedures').select('id, category_id, name, synonyms, active, position'),
    supabase.from('procedure_steps').select('id, procedure_id, name, unit, completes, requires_description, synonyms, active, position'),
  ])
  const catOf = new Map((cats ?? []).map((c) => [c.id, c]))
  const procOf = new Map((procs ?? []).map((p) => [p.id, p]))
  return (steps ?? [])
    .map((s) => {
      const p = procOf.get(s.procedure_id)
      if (!p) return null
      const c = catOf.get(p.category_id)
      return {
        stepId: s.id,
        procedureId: p.id,
        procedureName: p.name,
        stepName: s.name,
        label: s.name === p.name ? p.name : `${p.name} · ${s.name}`,
        unit: s.unit,
        completes: s.completes,
        requiresDescription: s.requires_description,
        categoryName: c?.name ?? '',
        search: normalize([p.name, s.name, ...(p.synonyms ?? []), ...(s.synonyms ?? [])].join(' ')),
        position: (c?.position ?? 0) * 10000 + p.position * 100 + s.position,
        active: s.active && p.active,
      }
    })
    .filter((o): o is StepOption => !!o)
    .sort((a, b) => a.position - b.position)
})

/** Só o que aparece no registro (as listas e páginas usam todas, para ler registros antigos). */
export async function activeStepOptions(): Promise<StepOption[]> {
  return (await loadStepOptions()).filter((o) => o.active)
}

export type CaseRow = {
  id: string
  cohort_id: string
  patient_label: string
  title: string | null
  status: CaseVM['status']
  started_on: string | null
  last_activity_on: string | null
  concluded_on: string | null
  supervisor_faculty_id: string | null
  smile_cloud_url: string | null
  difficulty_text: string | null
  ease_text: string | null
  do_differently_text: string | null
  cover_path: string | null
  removed_at: string | null
  created_at: string
}
export const CASE_COLS = `id, cohort_id, patient_label, title, status, started_on, last_activity_on, concluded_on, supervisor_faculty_id,
  smile_cloud_url, difficulty_text, ease_text, do_differently_text, cover_path, removed_at, created_at`
export const RECORD_COLS = 'id, case_id, step_id, procedure_id, performed_on, quantity, teeth, module_id, module_auto, note, other_description, removed_at, created_at'

export type RecordRow = {
  id: string
  case_id: string
  step_id: string
  procedure_id: string
  performed_on: string
  quantity: number
  teeth: number[] | null
  module_id: string | null
  module_auto: boolean
  note: string | null
  other_description: string | null
  removed_at: string | null
  created_at: string
}

export const toRecord = (r: RecordRow): RecordVM => ({
  id: r.id,
  stepId: r.step_id,
  procedureId: r.procedure_id,
  performedOn: r.performed_on,
  quantity: r.quantity,
  teeth: r.teeth ?? [],
  moduleId: r.module_id,
  moduleAuto: r.module_auto,
  note: r.note,
  description: r.other_description,
  removed: !!r.removed_at,
  createdAt: r.created_at,
})

export function toCase(c: CaseRow, records: RecordVM[], topicIds: string[]): CaseVM {
  return {
    id: c.id,
    cohortId: c.cohort_id,
    patientLabel: c.patient_label,
    title: c.title,
    status: c.status,
    startedOn: c.started_on,
    lastActivityOn: c.last_activity_on,
    concludedOn: c.concluded_on,
    supervisorId: c.supervisor_faculty_id,
    smileCloudUrl: c.smile_cloud_url,
    difficulty: c.difficulty_text,
    ease: c.ease_text,
    differently: c.do_differently_text,
    coverPath: c.cover_path,
    removed: !!c.removed_at,
    createdAt: c.created_at,
    topicIds,
    records,
  }
}

/** Casos do próprio aluno (inclusive excluídos, para o filtro "Excluídos"), com os registros. */
export const loadMyCases = cache(async (userId: string): Promise<CaseVM[]> => {
  // Simulação: só os casos do rascunho (nunca dados reais).
  const sim = await getSimulation()
  if (sim) return simCases(sim.state, sim.cohortVM.id)
  const supabase = await client()
  const [{ data: cases }, { data: records }] = await Promise.all([
    supabase.from('clinical_cases').select(CASE_COLS).eq('owner_id', userId).order('last_activity_on', { ascending: false, nullsFirst: false }),
    supabase.from('performed_procedures').select(RECORD_COLS).eq('owner_id', userId),
  ])
  const byCase = new Map<string, RecordVM[]>()
  for (const r of (records ?? []) as RecordRow[]) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), toRecord(r)])
  return ((cases ?? []) as CaseRow[])
    .map((c) => toCase(c, byCase.get(c.id) ?? [], []))
    .sort((a, b) => (b.lastActivityOn ?? b.createdAt).localeCompare(a.lastActivityOn ?? a.createdAt) || b.createdAt.localeCompare(a.createdAt))
})

/**
 * Um caso do próprio aluno. Caso de outra pessoa → null (a leitura pela coordenação/admin, com auditoria,
 * fica em lib/cases/staff.ts e nunca passa por aqui).
 */
export async function loadMyCase(id: string, userId: string): Promise<CaseVM | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const sim = await getSimulation()
  if (sim) return simCases(sim.state, sim.cohortVM.id).find((c) => c.id === id) ?? null
  const supabase = await client()
  const { data: c } = await supabase.from('clinical_cases').select(`${CASE_COLS}, owner_id`).eq('id', id).maybeSingle()
  if (!c || (c as { owner_id: string }).owner_id !== userId) return null
  const [{ data: records }, { data: topics }] = await Promise.all([
    supabase.from('performed_procedures').select(RECORD_COLS).eq('case_id', id),
    supabase.from('case_difficulty_topics').select('topic_id').eq('case_id', id),
  ])
  return toCase(c as CaseRow, ((records ?? []) as RecordRow[]).map(toRecord), (topics ?? []).map((t) => t.topic_id))
}

/** Pode registrar nesta turma? (aluno com matrícula ativa numa turma ativa — a mesma regra do banco). */
export async function canRegister(cohortId: string): Promise<boolean> {
  // Simulação: como um aluno com matrícula ativa na turma simulada (registra se a turma está ativa).
  const sim = await getSimulation()
  if (sim) return cohortId === sim.cohortVM.id && sim.cohortVM.status === 'ativa'
  const supabase = await client()
  const { data } = await supabase.rpc('can_register_cases', { p_cohort_id: cohortId })
  return data === true
}

export function moduleSpans(modules: Awaited<ReturnType<typeof cohortModules>>): ModuleSpan[] {
  return modules.map((m) => ({ id: m.id, label: m.label, title: m.title, start: m.start, end: m.end }))
}

/** Tudo o que a tela de registro precisa, de uma vez. */
export async function loadRegistration(auth: AuthState, cohortId: string) {
  const [options, cases, modules, faculty, taxonomy, allowed] = await Promise.all([
    activeStepOptions(),
    loadMyCases(auth.userId),
    cohortModules(cohortId),
    loadFaculty(),
    loadTaxonomy(),
    canRegister(cohortId),
  ])
  const history = cases.flatMap((c) => c.records.filter((r) => !r.removed).map((r) => ({ stepId: r.stepId, createdAt: r.createdAt })))
  return {
    allowed,
    options,
    history,
    openCases: cases.filter((c) => !c.removed && c.status === 'em_andamento' && c.cohortId === cohortId),
    modules: moduleSpans(modules),
    supervisors: faculty.filter((f) => f.active).map((f) => ({ id: f.id, name: f.name })),
    topics: taxonomy.topics.filter((t) => !t.mergedInto).map((t) => ({ id: t.id, name: t.name, synonyms: t.synonyms })),
  }
}

/**
 * Conteúdos relacionados ao caso: temas da dificuldade ∪ temas ligados aos procedimentos do caso.
 * Só o que é da turma do caso e já está liberado. Vazio quando não há vínculo. `userId` = de quem é o progresso
 * mostrado (o dono do caso — também na leitura da coordenação/admin).
 */
export async function relatedContents(c: CaseVM, userId: string, limit = 6): Promise<ContentVM[]> {
  const supabase = await client()
  const procIds = [...new Set(c.records.filter((r) => !r.removed).map((r) => r.procedureId))]
  const { data: links } = procIds.length ? await supabase.from('procedure_topics').select('topic_id').in('procedure_id', procIds) : { data: [] }
  const topics = new Set([...c.topicIds, ...(links ?? []).map((l) => l.topic_id)])
  if (!topics.size) return []
  const library = await loadLibrary(userId, c.cohortId)
  return library
    .filter((x) => isReleased(x) && (!x.cohortIds.length || x.cohortIds.includes(c.cohortId)) && x.topics.some((t) => topics.has(t.id)))
    .sort((a, b) => b.topics.filter((t) => topics.has(t.id)).length - a.topics.filter((t) => topics.has(t.id)).length)
    .slice(0, limit)
}

/**
 * Links temporários (10 min) das fotos de capa — o bucket é privado e o Storage só assina para quem pode ler o caso
 * (a mesma regra do banco). `mini` = miniatura das listas. Sem Storage/bucket (ou sem permissão) → sem foto.
 */
export async function coverUrls(paths: Array<string | null | undefined>, mini = false): Promise<Map<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => !!p))]
  const out = new Map<string, string>()
  if (!wanted.length || (await getSimulation())) return out
  try {
    const supabase = await client()
    const files = wanted.map((p) => (mini ? p.replace(/\.webp$/, '-mini.webp') : p))
    const { data } = await supabase.storage.from('case-covers').createSignedUrls(files, 600)
    for (const [i, d] of (data ?? []).entries()) if (d.signedUrl && !d.error) out.set(wanted[i]!, d.signedUrl)
  } catch {
    // Foto é opcional: falha no Storage nunca derruba a página.
  }
  return out
}
