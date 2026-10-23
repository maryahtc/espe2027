/**
 * Planejamento do caso no Modo de simulação — só no rascunho do cookie (nada vai para o banco ou para o Storage).
 * Mesmas regras do banco (Parte 1): mesmo catálogo, mesmas regras de dentes/arcada/quantidade, vínculo só com
 * consulta real ativa, consulta vinculada somente leitura, nada migra sozinho. Limite nominal 10 × 10 por caso;
 * o limite físico do cookie usa a mensagem já existente.
 */
import { hasPersonalIdentifier, resolvePlacement, type StepOption } from '@/lib/cases/model'
import type { DentalArch } from '@/lib/procedures/model'
import { type Ctx, SIM_LIMIT_MSG, SimError, type SimState, type StepInfo, toRecordVM } from '@/lib/simulation/state'
import { compareVisit, missingDraft, type PlanItem, type PlanVisit } from './model'

export const SIM_PLAN_LIMITS = { visits: 10, items: 10 } as const

export type SimPlanItem = { id: string; stepId: string; procedureId: string; teeth: number[]; arch: DentalArch | null; quantity: number; description: string | null; position: number }
export type SimPlanVisit = { id: string; caseId: string; position: number; note: string | null; realizedOn: string | null; items: SimPlanItem[] }

export type PlanItemInput = { id?: string; stepId: string; teeth?: number[]; arch?: DentalArch | null; quantity?: number; description?: string | null }
export type PlanVisitInput = { caseId: string; visitId?: string; note?: string | null; items: PlanItemInput[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export class PlanError extends Error {}

/** Observação do planejamento: até 200 caracteres, sem identificadores pessoais (mesma regra do banco). */
export function planNote(v: unknown): string | null {
  const t = typeof v === 'string' ? v.trim() : ''
  if (!t) return null
  if (t.length > 200) throw new PlanError('Observação do planejamento: no máximo 200 caracteres.')
  if (hasPersonalIdentifier(t)) throw new PlanError('Observação do planejamento: não inclua CPF, telefone ou documento do paciente.')
  return t
}

/**
 * Itens limpos e validados como no banco: etapa existente (e ativa, para item novo), descrição só no "Outro",
 * dentes/arcada/quantidade por resolvePlacement. `existing` = ids já gravados (podem ter etapa desativada depois).
 */
export function normalizeItems(items: PlanItemInput[], steps: Map<string, StepInfo>, archSupported: boolean, existing: Set<string>) {
  return items.map((it, i) => {
    if (!it || !UUID.test(it.stepId)) throw new PlanError('Item inválido.')
    const step = steps.get(it.stepId)
    const keep = it.id && existing.has(it.id)
    if (!step || (!keep && !step.active)) throw new PlanError('Um dos procedimentos escolhidos não está mais disponível.')
    let description: string | null = null
    if (step.requiresDescription) {
      description = typeof it.description === 'string' ? it.description.trim().slice(0, 120) : ''
      if (description.length < 3) throw new PlanError('Descreva o "Outro procedimento".')
      if (hasPersonalIdentifier(description)) throw new PlanError('Descrição: não inclua CPF, telefone ou documento do paciente.')
    }
    let placed
    try {
      placed = resolvePlacement(step, { quantity: Number(it.quantity ?? 1), teeth: it.teeth ?? [], arch: it.arch ?? null }, archSupported)
    } catch (e) {
      throw new PlanError(e instanceof Error ? e.message : 'Item inválido.')
    }
    return { id: keep ? it.id! : null, stepId: it.stepId, procedureId: step.procedureId, ...placed, description, position: i + 1 }
  })
}

const plansOf = (s: SimState): SimPlanVisit[] => (s.plans ??= [])
function caseFor(s: SimState, caseId: string) {
  const c = s.cases.find((x) => x.id === caseId)
  if (!c) throw new SimError('Caso não encontrado.')
  if (c.removed || c.status !== 'em_andamento') throw new SimError('Planejamento somente leitura: o caso está concluído ou excluído.')
  return c
}
function visitFor(s: SimState, visitId: string): SimPlanVisit {
  const v = plansOf(s).find((x) => x.id === visitId)
  if (!v) throw new SimError('Consulta planejada não encontrada.')
  return v
}
const err = (e: unknown) => (e instanceof PlanError ? new SimError(e.message) : e)

/** Rascunho → mesmo formato da tela real. */
export function simPlan(s: SimState, caseId: string): PlanVisit[] {
  return (s.plans ?? []).filter((v) => v.caseId === caseId).map((v) => ({ id: v.id, position: v.position, note: v.note, realizedOn: v.realizedOn, items: v.items.map((i) => ({ ...i })) }))
}

export function simPlanSave(s: SimState, p: PlanVisitInput, ctx: Ctx): string {
  caseFor(s, p.caseId)
  const plans = plansOf(s)
  let v: SimPlanVisit
  if (p.visitId) {
    v = visitFor(s, p.visitId)
    if (v.caseId !== p.caseId) throw new SimError('Consulta planejada não encontrada.')
    if (v.realizedOn) throw new SimError('Consulta vinculada: desfaça o vínculo para alterar.')
  } else {
    if (plans.filter((x) => x.caseId === p.caseId).length >= SIM_PLAN_LIMITS.visits) throw new SimError(SIM_LIMIT_MSG)
    v = { id: ctx.newId(), caseId: p.caseId, position: Math.max(0, ...plans.filter((x) => x.caseId === p.caseId).map((x) => x.position)) + 1, note: null, realizedOn: null, items: [] }
  }
  if (!p.items?.length) throw new SimError('Inclua pelo menos um procedimento na consulta planejada.')
  if (p.items.length > SIM_PLAN_LIMITS.items) throw new SimError(SIM_LIMIT_MSG)
  try {
    v.note = planNote(p.note)
    v.items = normalizeItems(p.items, ctx.steps, ctx.archSupported, new Set(v.items.map((i) => i.id))).map((i) => ({ ...i, id: i.id ?? ctx.newId() }))
  } catch (e) {
    throw err(e)
  }
  if (!p.visitId) plans.push(v)
  return v.id
}

export function simPlanDelete(s: SimState, visitId: string): string {
  const v = visitFor(s, visitId)
  caseFor(s, v.caseId)
  if (v.realizedOn) throw new SimError('Consulta vinculada: desfaça o vínculo antes de excluir.')
  s.plans = plansOf(s).filter((x) => x.id !== visitId)
  return v.caseId
}

/** ↑ ↓ só entre as consultas ainda planejadas do caso. */
export function simPlanMove(s: SimState, visitId: string, dir: 'up' | 'down'): string {
  const v = visitFor(s, visitId)
  caseFor(s, v.caseId)
  if (v.realizedOn) throw new SimError('Consulta vinculada não muda de posição.')
  const list = plansOf(s).filter((x) => x.caseId === v.caseId && !x.realizedOn).sort((a, b) => a.position - b.position)
  const i = list.indexOf(v)
  const other = list[dir === 'up' ? i - 1 : i + 1]
  if (other) [v.position, other.position] = [other.position, v.position]
  return v.caseId
}

/** Vínculo: só com consulta real (caso + data) que tenha registro ativo; uma consulta planejada por data. */
export function simPlanLink(s: SimState, visitId: string, date: string): string {
  const v = visitFor(s, visitId)
  const c = caseFor(s, v.caseId)
  if (v.realizedOn) throw new SimError('Consulta vinculada: desfaça o vínculo para alterar.')
  if (!c.records.some((r) => !r.removed && r.performedOn === date)) throw new SimError('Só é possível vincular a uma consulta real com registro ativo nesta data.')
  if (plansOf(s).some((x) => x.caseId === v.caseId && x.realizedOn === date)) throw new SimError('Esta consulta real já está vinculada a outra consulta planejada.')
  v.realizedOn = date
  return v.caseId
}

export function simPlanUnlink(s: SimState, visitId: string): string {
  const v = visitFor(s, visitId)
  caseFor(s, v.caseId)
  v.realizedOn = null
  return v.caseId
}

/** Opções mínimas (etapa → unidade) para a comparação a partir do contexto. */
export const unitOptions = (steps: Map<string, StepInfo>) => [...steps.entries()].map(([stepId, st]) => ({ stepId, unit: st.unit }) as unknown as StepOption)

/** "Levar para a próxima" / "Planejar em nova consulta": só o que faltou, e só porque o aluno pediu. */
export function simPlanCarry(s: SimState, visitId: string, itemId: string, mode: 'proxima' | 'nova', ctx: Ctx): string {
  const v = visitFor(s, visitId)
  const c = caseFor(s, v.caseId)
  const cmp = compareVisit(simPlan(s, v.caseId).find((x) => x.id === visitId)!, c.records.map(toRecordVM), unitOptions(ctx.steps))
  const it = cmp?.items.find((x) => x.item.id === itemId)
  const draft = it ? missingDraft(it) : null
  if (!draft) throw new SimError('Nada a levar: este item foi registrado como planejado.')
  const item = (pos: number): SimPlanItem => ({ id: ctx.newId(), stepId: draft.stepId, procedureId: (it!.item as PlanItem).procedureId, teeth: draft.teeth, arch: draft.arch, quantity: draft.quantity, description: draft.description, position: pos })
  const plans = plansOf(s)
  if (mode === 'proxima') {
    const next = plans.filter((x) => x.caseId === v.caseId && !x.realizedOn).sort((a, b) => a.position - b.position)[0]
    if (!next) throw new SimError('Não há próxima consulta planejada. Use "Planejar em nova consulta".')
    if (next.items.length >= SIM_PLAN_LIMITS.items) throw new SimError(SIM_LIMIT_MSG)
    next.items.push(item(next.items.length + 1))
    return v.caseId
  }
  if (plans.filter((x) => x.caseId === v.caseId).length >= SIM_PLAN_LIMITS.visits) throw new SimError(SIM_LIMIT_MSG)
  plans.push({ id: ctx.newId(), caseId: v.caseId, position: Math.max(0, ...plans.filter((x) => x.caseId === v.caseId).map((x) => x.position)) + 1, note: null, realizedOn: null, items: [item(1)] })
  return v.caseId
}
