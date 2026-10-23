'use server'

import type { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionState } from '@/lib/cases/actions'
import { loadMyCase, loadStepOptions } from '@/lib/cases/load'
import { applySim } from '@/lib/simulation/apply'
import { studentGate } from '@/lib/simulation/gate'
import type { StepInfo } from '@/lib/simulation/state'
import { compareVisit, missingDraft } from './model'
import { planReady } from './schema'
import { normalizeItems, PlanError, type PlanVisitInput, planNote, simPlanCarry, simPlanDelete, simPlanLink, simPlanMove, simPlanSave, simPlanUnlink } from './sim'
import { loadMyPlan } from './load'
import { odontogramReady } from '@/lib/cases/schema'

/**
 * Ações do Planejamento do caso (Etapa 8). Nenhuma delas grava em performed_procedures: o registro real continua
 * sendo só o do registro rápido da Etapa 6. Aluno real → banco (RLS + gatilhos da Parte 1, só com a migração);
 * Admin no Modo de simulação → rascunho; Admin fora da simulação e coordenação → bloqueado.
 */
type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
const UUID = /^[0-9a-f-]{36}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

async function gate() {
  const g = await studentGate()
  if (g.kind === 'blocked') throw new PlanError(g.reason)
  if (g.kind === 'real' && !(await planReady())) throw new PlanError('O Planejamento do caso ainda não está disponível.')
  return g
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new PlanError('Planejamento somente leitura: o caso está concluído, excluído ou a turma foi encerrada.')
  if (error.code === '23505') throw new PlanError('Esta consulta real já está vinculada a outra consulta planejada.')
  if (error.code === '23514' && !/violates check constraint/.test(error.message)) throw new PlanError(error.message)
  if (error.code === '23514') throw new PlanError('Algum dado não é permitido (ex.: CPF ou telefone na observação, ou dente inválido).')
  throw new PlanError('Não foi possível salvar o planejamento.')
}

async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const msg = await fn()
    revalidatePath('/', 'layout')
    return { aviso: msg || 'Salvo.' }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

const str = (fd: FormData, k: string, max = 40) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const uid = (fd: FormData, k = 'id') => {
  const v = str(fd, k)
  if (!UUID.test(v)) throw new PlanError('Registro inválido.')
  return v
}
async function stepInfo(): Promise<Map<string, StepInfo>> {
  return new Map((await loadStepOptions()).map((o) => [o.stepId, { procedureId: o.procedureId, active: o.active, requiresDescription: o.requiresDescription, location: o.location, unit: o.unit }]))
}
async function visitRow(db: Db, id: string) {
  const { data } = await db.from('case_plan_visits').select('id, case_id, position, realized_on').eq('id', id).maybeSingle()
  if (!data) throw new PlanError('Consulta planejada não encontrada.')
  return data
}

// ─── Criar / editar consulta planejada ───────────────────────────────────────────────────────────

export async function savePlanVisit(_: ActionState, fd: FormData): Promise<ActionState> {
  let caseId = ''
  const result = await run(async () => {
    let p: PlanVisitInput
    try {
      p = JSON.parse(str(fd, 'payload', 20000)) as PlanVisitInput
    } catch {
      throw new PlanError('Não foi possível ler o planejamento.')
    }
    if (!UUID.test(p.caseId ?? '') || (p.visitId && !UUID.test(p.visitId))) throw new PlanError('Registro inválido.')
    caseId = p.caseId
    const g = await gate()
    if (g.kind === 'sim') {
      await applySim(g.sim, (s, ctx) => simPlanSave(s, p, ctx))
      return
    }
    const db = g.db
    if (!p.items?.length) throw new PlanError('Inclua pelo menos um procedimento na consulta planejada.')
    if (p.items.length > 15) throw new PlanError('No máximo 15 itens por consulta planejada.')
    const note = planNote(p.note)
    const steps = await stepInfo()
    const ready = await odontogramReady()
    if (p.visitId) {
      const v = await visitRow(db, p.visitId)
      if (v.case_id !== p.caseId) throw new PlanError('Consulta planejada não encontrada.')
      if (v.realized_on) throw new PlanError('Consulta vinculada: desfaça o vínculo para alterar.')
      const { data: current } = await db.from('case_plan_items').select('id').eq('visit_id', p.visitId)
      const items = normalizeItems(p.items, steps, ready, new Set((current ?? []).map((i) => i.id)))
      fail((await db.from('case_plan_visits').update({ note }).eq('id', p.visitId)).error)
      const keep = new Set(items.filter((i) => i.id).map((i) => i.id!))
      const drop = (current ?? []).map((i) => i.id).filter((x) => !keep.has(x))
      if (drop.length) fail((await db.from('case_plan_items').delete().in('id', drop)).error)
      for (const i of items.filter((x) => x.id)) {
        fail((await db.from('case_plan_items').update({ teeth: i.teeth, arch: i.arch, quantity: i.quantity, other_description: i.description, position: i.position }).eq('id', i.id!)).error)
      }
      const add = items.filter((x) => !x.id)
      if (add.length) {
        fail(
          (
            await db.from('case_plan_items').insert(
              add.map((i) => ({ visit_id: p.visitId!, case_id: p.caseId, owner_id: g.auth.userId, step_id: i.stepId, procedure_id: i.procedureId, teeth: i.teeth, arch: i.arch, quantity: i.quantity, other_description: i.description, position: i.position })),
            )
          ).error,
        )
      }
      return
    }
    const items = normalizeItems(p.items, steps, ready, new Set())
    const { data: last } = await db.from('case_plan_visits').select('position').eq('case_id', p.caseId).order('position', { ascending: false }).limit(1)
    const { data: created, error } = await db
      .from('case_plan_visits')
      .insert({ case_id: p.caseId, owner_id: g.auth.userId, position: (last?.[0]?.position ?? 0) + 1, note })
      .select('id')
      .single()
    fail(error)
    const { error: itemsError } = await db.from('case_plan_items').insert(
      items.map((i) => ({ visit_id: created!.id, case_id: p.caseId, owner_id: g.auth.userId, step_id: i.stepId, procedure_id: i.procedureId, teeth: i.teeth, arch: i.arch, quantity: i.quantity, other_description: i.description, position: i.position })),
    )
    if (itemsError) await db.from('case_plan_visits').delete().eq('id', created!.id)
    fail(itemsError)
  })
  if (caseId && !result?.erro) redirect(`/casos/${caseId}#planejamento`)
  return result
}

// ─── Excluir, reordenar, vincular, desfazer, levar ───────────────────────────────────────────────

export async function deletePlanVisit(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = uid(fd)
    const g = await gate()
    if (g.kind === 'sim') {
      await applySim(g.sim, (s) => simPlanDelete(s, id))
      return 'Consulta planejada excluída.'
    }
    const v = await visitRow(g.db, id)
    if (v.realized_on) throw new PlanError('Consulta vinculada: desfaça o vínculo antes de excluir.')
    const { data, error } = await g.db.from('case_plan_visits').delete().eq('id', id).select('id')
    fail(error)
    if (!data?.length) throw new PlanError('Planejamento somente leitura: o caso está concluído, excluído ou a turma foi encerrada.')
    return 'Consulta planejada excluída.'
  })
}

export async function movePlanVisit(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = uid(fd)
    const dir = str(fd, 'para') === 'up' ? 'up' : 'down'
    const g = await gate()
    if (g.kind === 'sim') {
      await applySim(g.sim, (s) => simPlanMove(s, id, dir))
      return 'Ordem atualizada.'
    }
    const v = await visitRow(g.db, id)
    if (v.realized_on) throw new PlanError('Consulta vinculada não muda de posição.')
    const { data: list } = await g.db.from('case_plan_visits').select('id, position').eq('case_id', v.case_id).is('realized_on', null).order('position')
    const rows = list ?? []
    const i = rows.findIndex((r) => r.id === id)
    const other = rows[dir === 'up' ? i - 1 : i + 1]
    if (!other) return 'Ordem atualizada.'
    fail((await g.db.from('case_plan_visits').update({ position: other.position }).eq('id', id)).error)
    fail((await g.db.from('case_plan_visits').update({ position: v.position }).eq('id', other.id)).error)
    return 'Ordem atualizada.'
  })
}

export async function linkPlanVisit(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = uid(fd)
    const date = str(fd, 'data')
    if (!DATE.test(date)) throw new PlanError('Escolha a consulta registrada.')
    const g = await gate()
    if (g.kind === 'sim') {
      await applySim(g.sim, (s) => simPlanLink(s, id, date))
      return 'Consulta vinculada.'
    }
    const { data, error } = await g.db.from('case_plan_visits').update({ realized_on: date }).eq('id', id).select('id')
    fail(error)
    if (!data?.length) throw new PlanError('Planejamento somente leitura: o caso está concluído, excluído ou a turma foi encerrada.')
    return 'Consulta vinculada.'
  })
}

export async function unlinkPlanVisit(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = uid(fd)
    const g = await gate()
    if (g.kind === 'sim') {
      await applySim(g.sim, (s) => simPlanUnlink(s, id))
      return 'Vínculo desfeito. Os registros reais não mudaram.'
    }
    const { data, error } = await g.db.from('case_plan_visits').update({ realized_on: null }).eq('id', id).select('id')
    fail(error)
    if (!data?.length) throw new PlanError('Planejamento somente leitura: o caso está concluído, excluído ou a turma foi encerrada.')
    return 'Vínculo desfeito. Os registros reais não mudaram.'
  })
}

/** "Levar para a próxima consulta planejada" / "Planejar em nova consulta": só o que faltou, por pedido do aluno. */
export async function carryPlanItem(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = uid(fd)
    const itemId = uid(fd, 'item')
    const mode = str(fd, 'modo') === 'nova' ? 'nova' : 'proxima'
    const g = await gate()
    const ok = mode === 'nova' ? 'Nova consulta planejada criada com o que faltou.' : 'Levado para a próxima consulta planejada.'
    if (g.kind === 'sim') {
      await applySim(g.sim, (s, ctx) => simPlanCarry(s, id, itemId, mode, ctx))
      return ok
    }
    const v = await visitRow(g.db, id)
    const [plan, kase, options] = await Promise.all([loadMyPlan(v.case_id), loadMyCase(v.case_id, g.auth.userId), loadStepOptions()])
    const visit = plan?.find((x) => x.id === id)
    if (!visit || !kase) throw new PlanError('Consulta planejada não encontrada.')
    const cmp = compareVisit(visit, kase.records, options)
    const it = cmp?.items.find((x) => x.item.id === itemId)
    const draft = it ? missingDraft(it) : null
    if (!draft) throw new PlanError('Nada a levar: este item foi registrado como planejado.')
    const row = (visitId: string, position: number) => ({
      visit_id: visitId,
      case_id: v.case_id,
      owner_id: g.auth.userId,
      step_id: draft.stepId,
      procedure_id: it!.item.procedureId,
      teeth: draft.teeth,
      arch: draft.arch,
      quantity: draft.quantity,
      other_description: draft.description,
      position,
    })
    if (mode === 'proxima') {
      const next = (plan ?? []).filter((x) => !x.realizedOn).sort((a, b) => a.position - b.position)[0]
      if (!next) throw new PlanError('Não há próxima consulta planejada. Use "Planejar em nova consulta".')
      fail((await g.db.from('case_plan_items').insert(row(next.id, next.items.length + 1))).error)
      return ok
    }
    const max = Math.max(0, ...(plan ?? []).map((x) => x.position))
    const { data: created, error } = await g.db.from('case_plan_visits').insert({ case_id: v.case_id, owner_id: g.auth.userId, position: max + 1 }).select('id').single()
    fail(error)
    const { error: e2 } = await g.db.from('case_plan_items').insert(row(created!.id, 1))
    if (e2) await g.db.from('case_plan_visits').delete().eq('id', created!.id)
    fail(e2)
    return ok
  })
}
