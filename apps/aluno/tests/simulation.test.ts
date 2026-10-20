import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seal, unseal } from '@/lib/simulation/seal'
import {
  type Ctx,
  emptyState,
  SIM_LIMITS,
  type SimPayload,
  simCases,
  simDismiss,
  simNeedsTerms,
  simRegister,
  simSaveDetails,
  simSetCaseRemoved,
  simSetProgress,
  simSetRecordRemoved,
  simSetStatus,
  simToggleCheck,
  simUpdateRecord,
} from '@/lib/simulation/state'
import { announcementVisible, contentVisible, resourceVisible } from '@/lib/simulation/visibility'

const COHORT = '00000000-0000-4000-b000-000000000001'
const STEP = '00000000-0000-4000-c000-000000000001'
const STEP_OTHER = '00000000-0000-4000-c000-000000000002'
const STEP_OFF = '00000000-0000-4000-c000-000000000003'
const STEP_ARCH = '00000000-0000-4000-c000-000000000004'
const TOPIC = '00000000-0000-4000-d000-000000000001'
const MOD_A = '00000000-0000-4000-e000-00000000000a'
const MOD_B = '00000000-0000-4000-e000-00000000000b'

function ctx(): Ctx {
  return {
    archSupported: true,
    today: '2027-03-10',
    now: '2027-03-10T12:00:00.000Z',
    modules: [
      { id: MOD_A, label: '01', title: 'A', start: '2027-02-01', end: '2027-02-05' },
      { id: MOD_B, label: '02', title: 'B', start: '2027-03-08', end: '2027-03-12' },
    ],
    steps: new Map([
      [STEP, { procedureId: 'p1', active: true, requiresDescription: false, location: 'dentes', unit: 'dente' }],
      [STEP_OTHER, { procedureId: 'p2', active: true, requiresDescription: true, location: 'nenhuma', unit: 'caso' }],
      [STEP_OFF, { procedureId: 'p3', active: false, requiresDescription: false, location: 'dentes', unit: 'dente' }],
      [STEP_ARCH, { procedureId: 'p4', active: true, requiresDescription: false, location: 'arcada', unit: 'arcada' }],
    ]),
    activeTopics: new Set([TOPIC]),
    newId: randomUUID,
  }
}

const register = (s = emptyState(), over: Partial<Parameters<typeof simRegister>[1]> = {}) =>
  simRegister(s, { mode: 'novo', patient: 'm.a.s.', date: '2027-03-09', lines: [{ stepId: STEP, quantity: 2, teeth: [11, 21] }], module: { auto: true }, ...over }, ctx())

describe('rascunho da simulação: casos com as mesmas regras do banco', () => {
  it('registra caso novo: código em maiúsculas, dentes válidos, módulo automático pela data', () => {
    const s = emptyState()
    const { caseId, count } = register(s)
    expect(count).toBe(1)
    const [c] = simCases(s, COHORT)
    expect(c!.id).toBe(caseId)
    expect(c!.patientLabel).toBe('M.A.S.')
    expect(c!.cohortId).toBe(COHORT)
    expect(c!.records[0]!.teeth).toEqual([11, 21])
    expect(c!.records[0]!.moduleId).toBe(MOD_B) // 09/03 está dentro do Módulo B
    expect(c!.startedOn).toBe('2027-03-09')
    expect(c!.coverPath).toBeNull()
  })

  it('recusa o que o banco recusa', () => {
    expect(() => register(emptyState(), { patient: 'Maria Silva' })).toThrow()
    expect(() => register(emptyState(), { date: '2027-03-11' })).toThrow(/futuro/)
    expect(() => register(emptyState(), { lines: [{ stepId: STEP_OFF, quantity: 1, teeth: [] }] })).toThrow(/não está mais disponível/)
    expect(() => register(emptyState(), { lines: [{ stepId: STEP_OTHER, quantity: 1, teeth: [] }] })).toThrow(/Descreva/)
    expect(() => register(emptyState(), { lines: [{ stepId: STEP, quantity: 0, teeth: [] }] })).toThrow(/Quantidade/)
    expect(() => register(emptyState(), { extras: { difficulty: 'ligar 11 98765-4321' } })).toThrow(/CPF, telefone/)
    expect(() => register(emptyState(), { extras: { smile: 'http://x' } })).toThrow(/https/)
  })

  it('registra em caso existente, edita, conclui/reabre, exclui/restaura', () => {
    const s = emptyState()
    const { caseId } = register(s)
    register(s, { mode: 'existente', caseId, date: '2027-02-03' })
    let c = simCases(s, COHORT)[0]!
    expect(c.records).toHaveLength(2)
    expect(c.startedOn).toBe('2027-02-03')
    expect(c.records[1]!.moduleId).toBe(MOD_A)

    simSaveDetails(s, caseId, { patient: 'sc-1', title: 'Reabilitação', supervisorId: '', smile: '', difficulty: 'Cor', ease: '', differently: '', topicIds: [TOPIC] }, ctx())
    c = simCases(s, COHORT)[0]!
    expect(c.patientLabel).toBe('SC-1')
    expect(c.topicIds).toEqual([TOPIC])

    simSetStatus(s, caseId, 'concluido', ctx())
    expect(simCases(s, COHORT)[0]!.concludedOn).toBe('2027-03-10')
    simSetStatus(s, caseId, 'em_andamento', ctx())
    expect(simCases(s, COHORT)[0]!.concludedOn).toBeNull()

    const rid = c.records[0]!.id
    simUpdateRecord(s, rid, { date: '2027-02-02', quantity: 4, teeth: [], note: 'ok', module: { auto: true, id: null } }, ctx())
    expect(simCases(s, COHORT)[0]!.records[0]).toMatchObject({ quantity: 4, performedOn: '2027-02-02', moduleId: MOD_A })
    simUpdateRecord(s, rid, { date: '2027-02-02', quantity: 4, teeth: [12, 22], note: 'ok', module: { auto: true, id: null } }, ctx())
    expect(simCases(s, COHORT)[0]!.records[0]).toMatchObject({ quantity: 2, teeth: [12, 22] }) // com posições: quantidade = nº de posições
    simSetRecordRemoved(s, rid, true)
    expect(simCases(s, COHORT)[0]!.startedOn).toBe('2027-02-03') // registro excluído não conta
    simSetCaseRemoved(s, caseId, true)
    expect(simCases(s, COHORT)[0]!.removed).toBe(true)
  })

  it('odontograma e arcada: mesmas regras do banco (quantidade automática, nada descartado em silêncio)', () => {
    const s = emptyState()
    const { caseId } = register(s, { lines: [{ stepId: STEP, quantity: 9, teeth: [12, 11, 21, 22], note: 'refeito' }] })
    let r = simCases(s, COHORT)[0]!.records[0]!
    expect(r.quantity).toBe(4)
    expect(r.note).toBe('refeito')
    register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP_ARCH, quantity: 1, teeth: [], arch: 'ambas' }] })
    r = simCases(s, COHORT)[0]!.records.find((x) => x.stepId === STEP_ARCH)!
    expect([r.arch, r.quantity]).toEqual(['ambas', 2])
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP_ARCH, quantity: 1, teeth: [] }] })).toThrow(/arcada/)
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP_ARCH, quantity: 1, teeth: [16], arch: 'superior' }] })).toThrow(/não identifica dentes/)
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP, quantity: 1, teeth: [11], arch: 'superior' }] })).toThrow(/não arcada/)
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP_OTHER, quantity: 1, teeth: [11], description: 'algo feito' }] })).toThrow(/não identifica dentes/)
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP, quantity: 1, teeth: [51] }] })).toThrow(/FDI/)
    expect(() => register(s, { mode: 'existente', caseId, lines: [{ stepId: STEP, quantity: 1, teeth: [], note: 'ligar 11 98765-4321' }] })).toThrow(/CPF, telefone/)
  })

    it('limites conservadores', () => {
    const s = emptyState()
    for (let i = 0; i < SIM_LIMITS.cases; i++) register(s, { patient: `C-${i}` })
    expect(() => register(s, { patient: 'X-1' })).toThrow(/Limite da simulação/)
  })

  it('progresso, checklist, "Entendi" e termo ficam no rascunho', () => {
    const s = emptyState()
    simSetProgress(s, 'c1', { status: 'concluido', percent: 100, positionSeconds: 0, completedAt: 'x' }, 'agora')
    simToggleCheck(s, 'm1', true)
    simToggleCheck(s, 'm1', true)
    simDismiss(s, 'a1')
    expect(s.progress.c1!.status).toBe('concluido')
    expect(s.checks).toEqual(['m1'])
    simToggleCheck(s, 'm1', false)
    expect(s.checks).toEqual([])
    expect(s.dismissed).toEqual(['a1'])
    expect(simNeedsTerms(s, 'v1')).toBe(true)
    s.terms = { versionId: 'v1', at: 'agora' }
    expect(simNeedsTerms(s, 'v1')).toBe(false)
    expect(simNeedsTerms(s, 'v2')).toBe(true) // termo novo → aceitar de novo
  })
})

describe('o que o aluno da turma enxerga', () => {
  const now = new Date('2027-03-10T12:00:00Z')
  it('conteúdo: publicado, liberado e da turma', () => {
    expect(contentVisible({ status: 'publicado', availableFrom: null, cohortIds: [] }, COHORT, now)).toBe(true)
    expect(contentVisible({ status: 'rascunho', availableFrom: null, cohortIds: [] }, COHORT, now)).toBe(false)
    expect(contentVisible({ status: 'publicado', availableFrom: '2027-04-01T00:00:00Z', cohortIds: [] }, COHORT, now)).toBe(false)
    expect(contentVisible({ status: 'publicado', availableFrom: null, cohortIds: ['outra'] }, COHORT, now)).toBe(false)
    expect(contentVisible({ status: 'publicado', availableFrom: null, cohortIds: ['outra', COHORT] }, COHORT, now)).toBe(true)
  })
  it('recurso e aviso', () => {
    expect(resourceVisible({ status: 'publicado', availableFrom: '2027-04-01T00:00:00Z' }, now)).toBe(false)
    expect(resourceVisible({ status: 'rascunho', availableFrom: null }, now)).toBe(false)
    expect(announcementVisible({ status: 'publicado', cohortId: null, visibleFrom: '2027-03-01', visibleUntil: '2027-03-31' }, COHORT, '2027-03-10')).toBe(true)
    expect(announcementVisible({ status: 'publicado', cohortId: 'outra', visibleFrom: '2027-03-01', visibleUntil: '2027-03-31' }, COHORT, '2027-03-10')).toBe(false)
    expect(announcementVisible({ status: 'publicado', cohortId: COHORT, visibleFrom: '2027-03-11', visibleUntil: '2027-03-31' }, COHORT, '2027-03-10')).toBe(false)
  })
})

describe('lacre do rascunho', () => {
  const before = process.env.SUPABASE_SECRET_KEY
  beforeEach(() => {
    process.env.SUPABASE_SECRET_KEY = 'segredo-de-teste'
  })
  afterEach(() => {
    process.env.SUPABASE_SECRET_KEY = before
  })
  const payload: SimPayload = { v: 1, admin: 'a', cohort: COHORT, startedAt: 1, expiresAt: 2, state: emptyState() }

  it('abre o que lacrou; o conteúdo não fica legível no cookie', () => {
    const raw = seal({ ...payload, state: { ...emptyState(), dismissed: ['aviso-secreto'] } })
    expect(raw).not.toContain('aviso-secreto')
    expect(unseal(raw)?.state.dismissed).toEqual(['aviso-secreto'])
  })

  it('recusa cookie adulterado ou lacrado com outra chave', () => {
    const raw = seal(payload)
    const flipped = raw.slice(0, -2) + (raw.at(-2) === 'A' ? 'B' : 'A') + raw.at(-1)
    expect(unseal(flipped)).toBeNull()
    process.env.SUPABASE_SECRET_KEY = 'outra-chave'
    expect(unseal(raw)).toBeNull()
  })
})
