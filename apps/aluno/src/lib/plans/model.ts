/**
 * Planejamento do caso (Etapa 8) — regras puras, testáveis sem banco.
 *
 * - O planejamento NUNCA é registro: nada aqui grava ou altera registros reais; Jornada e Minha Produção não leem
 *   o planejamento. A comparação é sempre CALCULADA a partir dos registros reais ativos da consulta vinculada.
 * - Consulta real = caso + data (a mesma definição congelada da Jornada e de Minha Produção).
 * - Posições: as mesmas da Etapa 7 (dentes; arcada com "ambas" = superior + inferior; unidade caso = posição única;
 *   sem posição = quantidade).
 * - Nada migra sozinho: as posições que faltaram só viram um item novo quando o aluno pede.
 */
import { type RecordVM, resolvePlacement, type StepOption } from '@/lib/cases/model'
import type { DentalArch } from '@/lib/procedures/model'
import { positions as recordPositions } from '@/lib/production/model'

export type PlanItem = {
  id: string
  stepId: string
  procedureId: string
  teeth: number[]
  arch: DentalArch | null
  quantity: number
  description: string | null
  position: number
}

export type PlanVisit = {
  id: string
  position: number
  note: string | null
  /** Consulta real vinculada (data); null = planejada. */
  realizedOn: string | null
  items: PlanItem[]
}

/** Resultado de um item na consulta vinculada (calculado; nunca marcado à mão). */
export type ItemStatus = 'planejado' | 'parcial' | 'nao_registrado'

export type ItemComparison = {
  item: PlanItem
  status: ItemStatus
  /** Posições planejadas e as que aparecem em registros reais da mesma etapa (ids "d11", "a-superior", "caso"). */
  planned: string[]
  registered: string[]
  /** Sem posição: quantidade planejada × registrada. */
  plannedQuantity: number
  registeredQuantity: number
}

export type ExtraRecord = {
  record: RecordVM
  /** Posições do registro que não estavam planejadas para aquela etapa (vazio = o registro inteiro está fora do plano). */
  positions: string[]
}

export type VisitComparison = {
  date: string
  /** Nenhum registro ativo nessa data (o registro foi removido ou mudou de data depois do vínculo). */
  noRecords: boolean
  items: ItemComparison[]
  /** "Também realizado nesta consulta": o que foi registrado e não estava planejado. */
  extras: ExtraRecord[]
}

/** Posições planejadas de um item (mesma forma da Etapa 7); null = sem posição (vale a quantidade). */
export function itemPositions(item: Pick<PlanItem, 'teeth' | 'arch'>, unit: StepOption['unit'] | undefined): string[] | null {
  return recordPositions({ teeth: item.teeth, arch: item.arch }, unit)?.map((p) => p.id) ?? null
}

/**
 * Compara a consulta vinculada com os registros reais ATIVOS do caso naquela data.
 * `records` = registros do caso (removidos são ignorados aqui). Sem vínculo → null.
 */
export function compareVisit(visit: PlanVisit, records: RecordVM[], options: StepOption[]): VisitComparison | null {
  if (!visit.realizedOn) return null
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const real = records.filter((r) => !r.removed && r.performedOn === visit.realizedOn)

  // Posições registradas por etapa (e quantidades sem posição).
  const regPos = new Map<string, Set<string>>()
  const regQty = new Map<string, number>()
  for (const r of real) {
    const pos = recordPositions(r, byStep.get(r.stepId)?.unit)
    if (pos) {
      const set = regPos.get(r.stepId) ?? new Set<string>()
      for (const p of pos) set.add(p.id)
      regPos.set(r.stepId, set)
      regQty.set(r.stepId, (regQty.get(r.stepId) ?? 0) + pos.length)
    } else {
      regQty.set(r.stepId, (regQty.get(r.stepId) ?? 0) + r.quantity)
    }
  }

  const items: ItemComparison[] = [...visit.items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const planned = itemPositions(item, byStep.get(item.stepId)?.unit)
      const got = regPos.get(item.stepId) ?? new Set<string>()
      if (planned) {
        const registered = planned.filter((p) => got.has(p))
        const status: ItemStatus = registered.length === planned.length ? 'planejado' : registered.length ? 'parcial' : 'nao_registrado'
        return { item, status, planned, registered, plannedQuantity: planned.length, registeredQuantity: registered.length }
      }
      // Sem posição: compara quantidades da mesma etapa.
      const q = regQty.get(item.stepId) ?? 0
      const status: ItemStatus = q >= item.quantity ? 'planejado' : q > 0 ? 'parcial' : 'nao_registrado'
      return { item, status, planned: [], registered: [], plannedQuantity: item.quantity, registeredQuantity: Math.min(q, item.quantity) }
    })

  // O que foi registrado e não estava planejado (etapa fora do plano, ou posições não planejadas daquela etapa).
  const plannedSteps = new Map<string, { positions: Set<string>; anonymous: boolean }>()
  for (const item of visit.items) {
    const p = itemPositions(item, byStep.get(item.stepId)?.unit)
    const cur = plannedSteps.get(item.stepId) ?? { positions: new Set<string>(), anonymous: false }
    if (p) for (const x of p) cur.positions.add(x)
    else cur.anonymous = true
    plannedSteps.set(item.stepId, cur)
  }
  const extras: ExtraRecord[] = []
  for (const r of real) {
    const plan = plannedSteps.get(r.stepId)
    if (!plan) {
      extras.push({ record: r, positions: [] })
      continue
    }
    if (plan.anonymous) continue
    const pos = recordPositions(r, byStep.get(r.stepId)?.unit)
    if (!pos) continue
    const outside = pos.map((x) => x.id).filter((x) => !plan.positions.has(x))
    if (outside.length) extras.push({ record: r, positions: outside })
  }

  return { date: visit.realizedOn, noRecords: real.length === 0, items, extras }
}

/** Ordem de exibição: vinculadas pela data real; depois as planejadas pela ordem do aluno (numeradas 1, 2, 3…). */
export function displayOrder(visits: PlanVisit[]): Array<PlanVisit & { number: number | null }> {
  const linked = visits.filter((v) => v.realizedOn).sort((a, b) => a.realizedOn!.localeCompare(b.realizedOn!))
  const planned = visits.filter((v) => !v.realizedOn).sort((a, b) => a.position - b.position)
  return [...linked.map((v) => ({ ...v, number: null })), ...planned.map((v, i) => ({ ...v, number: i + 1 }))]
}

// ─── Posições que faltaram (só quando o aluno pede) ──────────────────────────────────────────────

export type ItemDraft = { stepId: string; teeth: number[]; arch: DentalArch | null; quantity: number; description: string | null }

/**
 * Um item novo só com o que faltou: dentes não registrados; arcada que faltou (as duas → "ambas"); quantidade
 * restante sem posição; unidade caso → 1. null quando nada faltou. Nunca é aplicado automaticamente.
 */
export function missingDraft(c: ItemComparison): ItemDraft | null {
  if (c.status === 'planejado') return null
  const base = { stepId: c.item.stepId, description: c.item.description }
  const missing = c.planned.filter((p) => !c.registered.includes(p))
  if (c.planned.length) {
    const teeth = missing.filter((p) => p.startsWith('d')).map((p) => Number(p.slice(1)))
    if (teeth.length) return { ...base, teeth, arch: null, quantity: teeth.length }
    const sides = missing.filter((p) => p.startsWith('a-')).map((p) => p.slice(2))
    if (sides.length) {
      const arch: DentalArch = sides.length === 2 ? 'ambas' : (sides[0] as DentalArch)
      return { ...base, teeth: [], arch, quantity: sides.length }
    }
    if (missing.includes('caso')) return { ...base, teeth: [], arch: null, quantity: 1 }
    return null
  }
  const rest = c.plannedQuantity - c.registeredQuantity
  return rest > 0 ? { ...base, teeth: [], arch: null, quantity: rest } : null
}

// ─── Pré-preenchimento do registro real ──────────────────────────────────────────────────────────

export type PrefillLine = { option: StepOption; teeth: number[]; arch: DentalArch | null; quantity: number; description: string; warning: string | null }

/**
 * Linhas iniciais do registro real a partir de uma consulta planejada. Só preenche o formulário: nada é gravado até o
 * aluno confirmar e salvar (com as validações da Etapa 6). Etapa desativada fica de fora (com aviso); dentes/arcada
 * incompatíveis com a regra atual do catálogo entram em branco, com "Revise".
 */
export function prefillLines(visit: PlanVisit, options: StepOption[], archSupported = true): { lines: PrefillLine[]; skipped: string[] } {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const lines: PrefillLine[] = []
  const skipped: string[] = []
  for (const item of [...visit.items].sort((a, b) => a.position - b.position)) {
    const o = byStep.get(item.stepId)
    if (!o || !o.active) {
      skipped.push(o?.label ?? 'Etapa removida do catálogo')
      continue
    }
    try {
      const p = resolvePlacement(o, { quantity: item.quantity, teeth: item.teeth, arch: item.arch }, archSupported)
      lines.push({ option: o, teeth: p.teeth, arch: p.arch, quantity: p.quantity, description: item.description ?? '', warning: null })
    } catch {
      lines.push({ option: o, teeth: [], arch: null, quantity: 1, description: item.description ?? '', warning: 'Revise os dentes/arcada desta linha (a regra do catálogo mudou).' })
    }
  }
  return { lines, skipped }
}
