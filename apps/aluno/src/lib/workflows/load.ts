import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { WorkflowItemKind, WorkflowStage, WorkflowStatus } from './model'

/**
 * Cargas do editor de Workflows (Admin e Coordenação). Tudo passa pela RLS de quem está logado: a coordenação nunca
 * vê mais do que as regras permitem (ex.: título de conteúdo da Biblioteca que ela não pode ler).
 * Só chamar depois de `workflowsReady()`.
 */
async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

type ProcRow = { id: string; name: string; slug: string; active: boolean; position: number; synonyms: string[] | null; procedure_categories: { name: string; position: number } | null }
type PersonRow = { display_name: string | null; full_name: string } | null

const personName = (p: PersonRow) => (p ? p.display_name || p.full_name : null)

export type WfListItem = {
  id: string
  procedureId: string
  procedureName: string
  procedureSlug: string
  procedureActive: boolean
  procedureSynonyms: string[]
  categoryName: string
  categoryPosition: number
  summary: string | null
  status: WorkflowStatus
  position: number
  stageCount: number
  updatedAt: string
  updatedByName: string | null
}

/** Lista do editor: todos os workflows (rascunho, publicado, arquivado), com o que vem do catálogo. */
export async function loadWorkflowList(): Promise<WfListItem[]> {
  const supabase = await client()
  const [{ data: rows }, { data: stages }] = await Promise.all([
    supabase
      .from('workflows')
      .select('id, procedure_id, summary, status, position, updated_at, updater:profiles!workflows_updated_by_fkey(display_name, full_name), procedures(id, name, slug, active, position, synonyms, procedure_categories(name, position))')
      .returns<Array<{ id: string; procedure_id: string; summary: string | null; status: WorkflowStatus; position: number; updated_at: string; updater: PersonRow; procedures: ProcRow | null }>>(),
    supabase.from('workflow_stages').select('workflow_id'),
  ])
  const count = new Map<string, number>()
  for (const s of stages ?? []) count.set(s.workflow_id, (count.get(s.workflow_id) ?? 0) + 1)
  return (rows ?? []).map((r) => ({
    id: r.id,
    procedureId: r.procedure_id,
    procedureName: r.procedures?.name ?? 'Procedimento',
    procedureSlug: r.procedures?.slug ?? '',
    procedureActive: r.procedures?.active ?? false,
    procedureSynonyms: r.procedures?.synonyms ?? [],
    categoryName: r.procedures?.procedure_categories?.name ?? 'Sem categoria',
    categoryPosition: r.procedures?.procedure_categories?.position ?? 999,
    summary: r.summary,
    status: r.status,
    position: r.position,
    stageCount: count.get(r.id) ?? 0,
    updatedAt: r.updated_at,
    updatedByName: personName(r.updater),
  }))
}

export type ProcedureChoice = { id: string; name: string; categoryName: string; categoryPosition: number; position: number; blocked: string | null }

/**
 * Procedimentos do catálogo para "Novo workflow". Nunca cria nem edita o catálogo. Ficam indisponíveis (com motivo):
 * "Outro procedimento" (etapa com descrição obrigatória), procedimento desativado e o que já tem workflow ativo.
 */
export async function procedureChoices(): Promise<ProcedureChoice[]> {
  const supabase = await client()
  const [{ data: procs }, { data: other }, { data: active }] = await Promise.all([
    supabase
      .from('procedures')
      .select('id, name, slug, active, position, synonyms, procedure_categories(name, position)')
      .returns<ProcRow[]>(),
    supabase.from('procedure_steps').select('procedure_id').eq('requires_description', true),
    supabase.from('workflows').select('procedure_id').neq('status', 'arquivado'),
  ])
  const isOther = new Set((other ?? []).map((s) => s.procedure_id))
  const taken = new Set((active ?? []).map((w) => w.procedure_id))
  return (procs ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.procedure_categories?.name ?? 'Sem categoria',
      categoryPosition: p.procedure_categories?.position ?? 999,
      position: p.position,
      blocked: isOther.has(p.id) ? 'não pode ter workflow' : !p.active ? 'desativado no catálogo' : taken.has(p.id) ? 'já tem workflow' : null,
    }))
    .sort((a, b) => a.categoryPosition - b.categoryPosition || a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'))
}

export type LinkedContent = { id: string; contentId: string; position: number; title: string | null; kind: string | null; available: boolean }
export type CatalogStep = { id: string; name: string; active: boolean }
export type WfEditorStage = WorkflowStage & { linked: LinkedContent[] }
export type WfEditor = Omit<WfListItem, 'stageCount'> & {
  publishedAt: string | null
  stages: WfEditorStage[]
  catalogSteps: CatalogStep[]
}

/** Um workflow completo para o editor (null = não existe ou sem permissão). */
export async function loadWorkflowEditor(id: string): Promise<WfEditor | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await client()
  const { data: w } = await supabase
    .from('workflows')
    .select('id, procedure_id, summary, status, position, published_at, updated_at, updater:profiles!workflows_updated_by_fkey(display_name, full_name), procedures(id, name, slug, active, position, synonyms, procedure_categories(name, position))')
    .eq('id', id)
    .returns<Array<{ id: string; procedure_id: string; summary: string | null; status: WorkflowStatus; position: number; published_at: string | null; updated_at: string; updater: PersonRow; procedures: ProcRow | null }>>()
    .maybeSingle()
  if (!w) return null
  const [{ data: stages }, { data: items }, { data: next }, { data: links }, { data: steps }] = await Promise.all([
    supabase.from('workflow_stages').select('id, name, slug, position, procedure_step_id').eq('workflow_id', id),
    supabase.from('workflow_stage_items').select('id, stage_id, kind, text, position').eq('workflow_id', id),
    supabase.from('workflow_stage_next').select('id, stage_id, label, target_stage_id, note, position').eq('workflow_id', id),
    supabase.from('workflow_stage_contents').select('id, stage_id, content_id, position').eq('workflow_id', id),
    supabase.from('procedure_steps').select('id, name, active, position').eq('procedure_id', w.procedure_id).order('position'),
  ])
  // Títulos só do que a pessoa pode ler (RLS da Biblioteca). O que não volta = indisponível, sem revelar o título.
  const contentIds = [...new Set((links ?? []).map((l) => l.content_id))]
  const { data: contents } = contentIds.length
    ? await supabase.from('contents').select('id, title, kind, status').in('id', contentIds)
    : { data: [] as Array<{ id: string; title: string; kind: string; status: string }> }
  const byId = new Map((contents ?? []).map((c) => [c.id, c]))

  return {
    id: w.id,
    procedureId: w.procedure_id,
    procedureName: w.procedures?.name ?? 'Procedimento',
    procedureSlug: w.procedures?.slug ?? '',
    procedureActive: w.procedures?.active ?? false,
    procedureSynonyms: w.procedures?.synonyms ?? [],
    categoryName: w.procedures?.procedure_categories?.name ?? 'Sem categoria',
    categoryPosition: w.procedures?.procedure_categories?.position ?? 999,
    summary: w.summary,
    status: w.status,
    position: w.position,
    publishedAt: w.published_at,
    updatedAt: w.updated_at,
    updatedByName: personName(w.updater),
    catalogSteps: (steps ?? []).map((s) => ({ id: s.id, name: s.name, active: s.active })),
    stages: (stages ?? [])
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        position: s.position,
        procedureStepId: s.procedure_step_id,
        items: (items ?? []).filter((i) => i.stage_id === s.id).map((i) => ({ id: i.id, kind: i.kind as WorkflowItemKind, text: i.text, position: i.position })),
        next: (next ?? []).filter((n) => n.stage_id === s.id).map((n) => ({ id: n.id, label: n.label, targetStageId: n.target_stage_id, note: n.note, position: n.position })),
        contents: (links ?? []).filter((l) => l.stage_id === s.id).map((l) => ({ contentId: l.content_id, position: l.position })),
        linked: (links ?? [])
          .filter((l) => l.stage_id === s.id)
          .sort((a, b) => a.position - b.position)
          .map((l) => {
            const c = byId.get(l.content_id)
            return { id: l.id, contentId: l.content_id, position: l.position, title: c?.title ?? null, kind: c?.kind ?? null, available: !!c && c.status === 'publicado' }
          }),
      }))
      .sort((a, b) => a.position - b.position),
  }
}

export type ContentChoice = { id: string; title: string; kind: string }

/** Conteúdos que a pessoa pode relacionar: publicados e legíveis para ela (RLS da Biblioteca). */
export async function contentChoices(): Promise<ContentChoice[]> {
  const supabase = await client()
  const { data } = await supabase.from('contents').select('id, title, kind').eq('status', 'publicado').order('title')
  return (data ?? []).map((c) => ({ id: c.id, title: c.title, kind: c.kind }))
}
