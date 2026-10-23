import { describe, expect, it } from 'vitest'
import { SIM_PLAN_LIMITS, simPlan, simPlanCarry, simPlanDelete, simPlanLink, simPlanMove, simPlanSave, simPlanUnlink } from '@/lib/plans/sim'
import { type Ctx, emptyState, SIM_LIMIT_MSG, type SimState, type StepInfo } from '@/lib/simulation/state'

const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`
const LP = id(901)
const ESC = id(902)
const AJ = id(903)
const EXO = id(904)
const steps = new Map<string, StepInfo>([
  [LP, { procedureId: id(801), active: true, requiresDescription: false, location: 'dentes', unit: 'dente' }],
  [ESC, { procedureId: id(802), active: true, requiresDescription: false, location: 'arcada', unit: 'arcada' }],
  [AJ, { procedureId: id(803), active: true, requiresDescription: false, location: 'nenhuma', unit: 'caso' }],
  [EXO, { procedureId: id(804), active: false, requiresDescription: false, location: 'dentes', unit: 'dente' }],
])
let n = 1000
const ctx: Ctx = { archSupported: true, today: '2027-03-20', now: '2027-03-20T10:00:00Z', modules: [], steps, activeTopics: new Set(), newId: () => id(++n) }
const CASE = id(1)
function state(): SimState {
  const s = emptyState()
  s.cases.push({
    id: CASE,
    patientLabel: 'P.L.',
    title: null,
    status: 'em_andamento',
    concludedOn: null,
    supervisorId: null,
    smileCloudUrl: null,
    difficulty: null,
    ease: null,
    differently: null,
    topicIds: [],
    removed: false,
    createdAt: ctx.now,
    records: [{ id: id(2), stepId: LP, procedureId: id(801), performedOn: '2027-03-12', quantity: 2, teeth: [11, 21], arch: null, moduleId: null, moduleAuto: true, note: null, description: null, removed: false, createdAt: ctx.now }],
  })
  return s
}

describe('Planejamento no rascunho da simulação (mesmas regras do banco)', () => {
  it('salva consulta planejada com as mesmas regras de dentes/arcada/quantidade', () => {
    const s = state()
    const v = simPlanSave(s, { caseId: CASE, note: 'conferir cor', items: [{ stepId: LP, teeth: [22, 11, 12, 21], quantity: 9 }, { stepId: ESC, arch: 'ambas' }] }, ctx)
    const p = simPlan(s, CASE).find((x) => x.id === v)!
    expect(p.items.map((i) => [i.teeth, i.arch, i.quantity])).toEqual([
      [[22, 11, 12, 21], null, 4],
      [[], 'ambas', 2],
    ])
    expect(p.note).toBe('conferir cor')
    expect(s.cases[0]!.records).toHaveLength(1) // nada do planejamento vira registro
  })
  it('recusa: arcada faltando, etapa desativada, observação com CPF ou longa, sem itens', () => {
    const s = state()
    expect(() => simPlanSave(s, { caseId: CASE, items: [{ stepId: ESC }] }, ctx)).toThrow(/arcada/)
    expect(() => simPlanSave(s, { caseId: CASE, items: [{ stepId: EXO, teeth: [36] }] }, ctx)).toThrow(/não está mais disponível/)
    expect(() => simPlanSave(s, { caseId: CASE, note: '123.456.789-09', items: [{ stepId: AJ }] }, ctx)).toThrow(/CPF/)
    expect(() => simPlanSave(s, { caseId: CASE, note: 'a'.repeat(201), items: [{ stepId: AJ }] }, ctx)).toThrow(/200/)
    expect(() => simPlanSave(s, { caseId: CASE, items: [] }, ctx)).toThrow(/pelo menos um/)
  })
  it('limite nominal 10 consultas × 10 itens por caso', () => {
    const s = state()
    for (let i = 0; i < SIM_PLAN_LIMITS.visits; i++) simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    expect(() => simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)).toThrow(SIM_LIMIT_MSG)
    const s2 = state()
    expect(() => simPlanSave(s2, { caseId: CASE, items: Array.from({ length: 11 }, () => ({ stepId: AJ })) }, ctx)).toThrow(SIM_LIMIT_MSG)
  })
  it('vínculo só com consulta real ativa; uma por data; vinculada é somente leitura; desfazer libera', () => {
    const s = state()
    const v = simPlanSave(s, { caseId: CASE, items: [{ stepId: LP, teeth: [11, 12, 21, 22] }] }, ctx)
    expect(() => simPlanLink(s, v, '2027-03-13')).toThrow(/registro ativo/)
    simPlanLink(s, v, '2027-03-12')
    const v2 = simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    expect(() => simPlanLink(s, v2, '2027-03-12')).toThrow(/já está vinculada/)
    expect(() => simPlanSave(s, { caseId: CASE, visitId: v, items: [{ stepId: AJ }] }, ctx)).toThrow(/desfaça o vínculo/)
    expect(() => simPlanDelete(s, v)).toThrow(/desfaça o vínculo/)
    expect(() => simPlanMove(s, v, 'up')).toThrow(/vinculada/)
    simPlanUnlink(s, v)
    expect(simPlan(s, CASE).find((x) => x.id === v)!.realizedOn).toBeNull()
    expect(s.cases[0]!.records).toHaveLength(1)
  })
  it('levar para a próxima: só os dentes que faltaram; planejar em nova consulta; nada migra sozinho', () => {
    const s = state()
    const v = simPlanSave(s, { caseId: CASE, items: [{ stepId: LP, teeth: [11, 12, 21, 22] }] }, ctx)
    const next = simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    simPlanLink(s, v, '2027-03-12')
    expect(simPlan(s, CASE).find((x) => x.id === next)!.items).toHaveLength(1) // nada mudou sozinho
    const itemId = simPlan(s, CASE).find((x) => x.id === v)!.items[0]!.id
    simPlanCarry(s, v, itemId, 'proxima', ctx)
    expect(simPlan(s, CASE).find((x) => x.id === next)!.items.map((i) => [i.stepId, i.teeth, i.quantity])).toEqual([
      [AJ, [], 1],
      [LP, [12, 22], 2],
    ])
    simPlanCarry(s, v, itemId, 'nova', ctx)
    expect(simPlan(s, CASE)).toHaveLength(3)
  })
  it('reordena só as planejadas', () => {
    const s = state()
    const a = simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    const b = simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    simPlanMove(s, b, 'up')
    const order = simPlan(s, CASE).sort((x, y) => x.position - y.position).map((x) => x.id)
    expect(order).toEqual([b, a])
  })
  it('caso concluído ou excluído: somente leitura', () => {
    const s = state()
    const v = simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)
    s.cases[0]!.status = 'concluido'
    expect(() => simPlanSave(s, { caseId: CASE, items: [{ stepId: AJ }] }, ctx)).toThrow(/somente leitura/)
    expect(() => simPlanDelete(s, v)).toThrow(/somente leitura/)
    s.cases[0]!.status = 'em_andamento'
    s.cases[0]!.removed = true
    expect(() => simPlanMove(s, v, 'up')).toThrow(/somente leitura/)
  })
})
