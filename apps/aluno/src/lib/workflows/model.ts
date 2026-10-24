/**
 * Workflows clínicos (Etapa 9) — regras puras, sem banco. "Como fazer": referência de consulta rápida.
 * Nunca progresso, conclusão ou porcentagem; nunca infere orientação clínica pela ordem das etapas.
 * Nome e categoria vêm sempre do catálogo (procedimento).
 */
import { normalize } from '@/lib/cases/model'

export type WorkflowStatus = 'rascunho' | 'publicado' | 'arquivado'
export type WorkflowItemKind = 'passo' | 'material' | 'atencao'

export const WORKFLOW_LIMITS = { stages: 15, itemsPerKind: 30, next: 6, contents: 6, text: 240, summary: 280, stageName: 60, label: 80, note: 200 } as const

export type WorkflowItem = { id: string; kind: WorkflowItemKind; text: string; position: number }
export type WorkflowNext = { id: string; label: string | null; targetStageId: string | null; note: string | null; position: number }
export type WorkflowContentLink = { contentId: string; position: number }
export type WorkflowStage = {
  id: string
  name: string
  slug: string
  position: number
  procedureStepId: string | null
  items: WorkflowItem[]
  next: WorkflowNext[]
  contents: WorkflowContentLink[]
}
export type Workflow = {
  id: string
  procedureId: string
  procedureSlug: string
  /** Do catálogo. */
  procedureName: string
  procedureSynonyms: string[]
  procedureActive: boolean
  categoryName: string
  categoryPosition: number
  summary: string | null
  status: WorkflowStatus
  position: number
  updatedAt: string
  stages: WorkflowStage[]
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

/** Etapas em ordem. */
export function orderedStages(w: Pick<Workflow, 'stages'>): WorkflowStage[] {
  return [...w.stages].sort(byPosition)
}

/** Seções da etapa: passos, materiais e pontos de atenção, cada um em ordem. */
export function stageSections(stage: Pick<WorkflowStage, 'items'>): Record<WorkflowItemKind, WorkflowItem[]> {
  const out: Record<WorkflowItemKind, WorkflowItem[]> = { passo: [], material: [], atencao: [] }
  for (const item of [...stage.items].sort(byPosition)) out[item.kind].push(item)
  return out
}

export type NextView = { id: string; label: string | null; target: { slug: string; name: string } | null; note: string | null }

/**
 * Próximos passos EXATAMENTE como cadastrados. Etapa sem próximos passos devolve lista vazia: nada é inferido
 * pela ordem. Destino que não está entre as etapas visíveis vira só orientação (ou some, se não houver texto).
 */
export function nextSteps(stage: Pick<WorkflowStage, 'next'>, stages: Pick<WorkflowStage, 'id' | 'slug' | 'name'>[]): NextView[] {
  const index = new Map(stages.map((s) => [s.id, s]))
  const out: NextView[] = []
  for (const n of [...stage.next].sort(byPosition)) {
    const t = n.targetStageId ? index.get(n.targetStageId) : undefined
    const target = t ? { slug: t.slug, name: t.name } : null
    if (!target && !n.note) continue
    out.push({ id: n.id, label: n.label, target, note: n.note })
  }
  return out
}

/** Mesma regra do banco para publicar: pelo menos 1 etapa e pelo menos 1 passo em cada etapa. */
export function publishIssues(w: Pick<Workflow, 'stages'>): string[] {
  const stages = orderedStages(w)
  if (stages.length === 0) return ['Adicione pelo menos uma etapa.']
  return stages.filter((s) => !s.items.some((i) => i.kind === 'passo')).map((s) => `Etapa "${s.name}" sem passo a passo.`)
}

/** O que o aluno vê: publicado e com o procedimento ativo (mesma regra da RLS, para a Simulação). */
export function visibleToStudent(w: Pick<Workflow, 'status' | 'procedureActive'>): boolean {
  return w.status === 'publicado' && w.procedureActive
}

/** Busca simples, sem acento: nome do procedimento, sinônimos do catálogo, categoria e descrição curta. */
export function searchWorkflows<T extends Pick<Workflow, 'procedureName' | 'procedureSynonyms' | 'categoryName' | 'summary'>>(list: T[], query: string): T[] {
  const words = normalize(query).split(' ').filter(Boolean)
  if (!words.length) return list
  return list.filter((w) => {
    const hay = normalize([w.procedureName, ...w.procedureSynonyms, w.categoryName, w.summary ?? ''].join(' '))
    return words.every((word) => hay.includes(word))
  })
}

/** Lista do aluno agrupada pelas categorias do catálogo, na ordem do catálogo; dentro, pela ordem do workflow. */
export function groupByCategory<T extends Pick<Workflow, 'categoryName' | 'categoryPosition' | 'position' | 'procedureName'>>(list: T[]): Array<{ category: string; items: T[] }> {
  const sorted = [...list].sort(
    (a, b) => a.categoryPosition - b.categoryPosition || a.categoryName.localeCompare(b.categoryName, 'pt-BR') || a.position - b.position || a.procedureName.localeCompare(b.procedureName, 'pt-BR'),
  )
  const groups: Array<{ category: string; items: T[] }> = []
  for (const w of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.category === w.categoryName) last.items.push(w)
    else groups.push({ category: w.categoryName, items: [w] })
  }
  return groups
}

/**
 * Navegação contextual a partir do Planejamento: a etapa do workflow ligada à etapa do catálogo do item, se houver;
 * senão, a visão geral do workflow. Só leitura/navegação.
 */
export function workflowHref(w: Pick<Workflow, 'procedureSlug' | 'stages'>, procedureStepId: string | null): string {
  const base = `/workflows/${w.procedureSlug}`
  if (!procedureStepId) return base
  const stage = orderedStages(w).find((s) => s.procedureStepId === procedureStepId)
  return stage ? `${base}/${stage.slug}` : base
}

/* ── Checklist temporário (só no navegador, sessionStorage) ─────────────────────────────────────────────
 * Ajuda momentânea para separar materiais. Nunca vai ao banco, não gera progresso nem porcentagem. */

/** Chave da sessão por etapa. */
export function checklistKey(stageId: string): string {
  return `conexo:wf-checklist:${stageId}`
}

/** Lê as marcações guardadas, ignorando o que não é mais item de material da etapa (lista editada). */
export function parseChecked(raw: string | null, materialIds: string[]): Set<string> {
  if (!raw) return new Set()
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return new Set()
    const valid = new Set(materialIds)
    return new Set(value.filter((v): v is string => typeof v === 'string' && valid.has(v)))
  } catch {
    return new Set()
  }
}

export function serializeChecked(checked: Set<string>): string {
  return JSON.stringify([...checked].sort())
}

export function toggleChecked(checked: Set<string>, id: string): Set<string> {
  const next = new Set(checked)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
