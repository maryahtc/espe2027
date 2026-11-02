import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'
import { loadLibrary } from '@/lib/library/load'
import { getSimulation } from '@/lib/simulation/session'
import { visibleToStudent, type WorkflowItemKind, type WorkflowStage, type WorkflowStatus } from './model'
import { workflowsReady } from './schema'

/**
 * Leitura dos Workflows como o ALUNO vê (Etapa 9 · Parte 3). Só publicado com procedimento ativo — filtrado aqui
 * também, porque na Simulação (e no "Ver como aluno" do Admin/Coordenação) quem lê é uma conta da equipe, que a RLS
 * deixa ver rascunhos. Conteúdos da Biblioteca: só os que a Biblioteca mostraria a esta pessoa agora (mesma carga e
 * mesmas regras, inclusive da Simulação). Nada aqui grava.
 */

type ProcRow = { id: string; name: string; slug: string; active: boolean; synonyms: string[] | null; procedure_categories: { name: string; position: number } | null }
type WfRow = { id: string; procedure_id: string; summary: string | null; status: WorkflowStatus; position: number; updated_at: string; procedures: ProcRow | null }
const COLS = 'id, procedure_id, summary, status, position, updated_at, procedures(id, name, slug, active, synonyms, procedure_categories(name, position))'

export type StudentWorkflowSummary = {
  id: string
  slug: string
  procedureName: string
  procedureSynonyms: string[]
  categoryName: string
  categoryPosition: number
  summary: string | null
  position: number
  stageCount: number
}

const visible = (r: WfRow) => !!r.procedures && visibleToStudent({ status: r.status, procedureActive: r.procedures.active })

function summaryOf(r: WfRow, stageCount: number): StudentWorkflowSummary {
  return {
    id: r.id,
    slug: r.procedures!.slug,
    procedureName: r.procedures!.name,
    procedureSynonyms: r.procedures!.synonyms ?? [],
    categoryName: r.procedures!.procedure_categories?.name ?? 'Outros',
    categoryPosition: r.procedures!.procedure_categories?.position ?? 999,
    summary: r.summary,
    position: r.position,
    stageCount,
  }
}

/** Workflows publicados (procedimento ativo). null = recurso desligado (banco ainda sem a Etapa 9). */
export const studentWorkflowList = cache(async (): Promise<StudentWorkflowSummary[] | null> => {
  if (!(await workflowsReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const [{ data: rows }, { data: stages }] = await Promise.all([
    supabase.from('workflows').select(COLS).eq('status', 'publicado').returns<WfRow[]>(),
    supabase.from('workflow_stages').select('workflow_id'),
  ])
  const count = new Map<string, number>()
  for (const s of stages ?? []) count.set(s.workflow_id, (count.get(s.workflow_id) ?? 0) + 1)
  return (rows ?? []).filter(visible).map((r) => summaryOf(r, count.get(r.id) ?? 0))
})

export type StudentContent = { id: string; slug: string; title: string; kind: string }
export type StudentStage = Omit<WorkflowStage, 'contents'> & { contents: StudentContent[] }
export type StudentWorkflow = StudentWorkflowSummary & { updatedAt: string; stages: StudentStage[] }

/** Um workflow pelo endereço do procedimento (slug do catálogo). null = não existe/indisponível para o aluno. */
export const studentWorkflow = cache(async (slug: string): Promise<StudentWorkflow | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !(await workflowsReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data: proc } = await supabase.from('procedures').select('id').eq('slug', slug).maybeSingle()
  if (!proc) return null
  const { data: w } = await supabase.from('workflows').select(COLS).eq('procedure_id', proc.id).eq('status', 'publicado').returns<WfRow[]>().maybeSingle()
  if (!w || !visible(w)) return null
  const [{ data: stages }, { data: items }, { data: next }, { data: links }] = await Promise.all([
    supabase.from('workflow_stages').select('id, name, slug, position, procedure_step_id').eq('workflow_id', w.id),
    supabase.from('workflow_stage_items').select('id, stage_id, kind, text, position').eq('workflow_id', w.id),
    supabase.from('workflow_stage_next').select('id, stage_id, label, target_stage_id, note, position').eq('workflow_id', w.id),
    supabase.from('workflow_stage_contents').select('stage_id, content_id, position').eq('workflow_id', w.id),
  ])
  // Conteúdos: só os que a Biblioteca mostraria agora a quem está vendo (aluno real pela RLS; Simulação pela turma).
  let readable = new Map<string, StudentContent>()
  if ((links ?? []).length) {
    const sim = await getSimulation()
    const library = await loadLibrary(null, sim?.cohortVM.id ?? null)
    readable = new Map(library.map((c) => [c.id, { id: c.id, slug: c.slug, title: c.title, kind: c.kind }]))
  }
  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position
  const list: StudentStage[] = (stages ?? [])
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      position: s.position,
      procedureStepId: s.procedure_step_id,
      items: (items ?? []).filter((i) => i.stage_id === s.id).map((i) => ({ id: i.id, kind: i.kind as WorkflowItemKind, text: i.text, position: i.position })),
      next: (next ?? []).filter((n) => n.stage_id === s.id).map((n) => ({ id: n.id, label: n.label, targetStageId: n.target_stage_id, note: n.note, position: n.position })),
      contents: (links ?? [])
        .filter((l) => l.stage_id === s.id)
        .sort(byPos)
        .map((l) => readable.get(l.content_id))
        .filter((c): c is StudentContent => !!c),
    }))
    .sort(byPos)
  return { ...summaryOf(w, list.length), updatedAt: w.updated_at, stages: list }
})

export type WorkflowLink = { slug: string; stages: Array<{ slug: string; procedureStepId: string | null; position: number }> }

/**
 * Para o Planejamento do caso: procedimento → workflow publicado (procedimento ativo), com as etapas ligadas ao
 * catálogo. Só leitura/navegação. Vazio com o banco ainda sem a Etapa 9.
 */
export async function workflowLinksFor(procedureIds: string[]): Promise<Map<string, WorkflowLink>> {
  const out = new Map<string, WorkflowLink>()
  const ids = [...new Set(procedureIds)].filter((id) => /^[0-9a-f-]{36}$/.test(id))
  if (!ids.length || !(await workflowsReady())) return out
  const supabase = await createSupabaseServerClient()
  if (!supabase) return out
  const { data: rows } = await supabase.from('workflows').select(COLS).eq('status', 'publicado').in('procedure_id', ids).returns<WfRow[]>()
  const shown = (rows ?? []).filter(visible)
  if (!shown.length) return out
  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('workflow_id, slug, procedure_step_id, position')
    .in('workflow_id', shown.map((r) => r.id))
  for (const r of shown)
    out.set(r.procedure_id, {
      slug: r.procedures!.slug,
      stages: (stages ?? []).filter((s) => s.workflow_id === r.id).map((s) => ({ slug: s.slug, procedureStepId: s.procedure_step_id, position: s.position })),
    })
  return out
}
