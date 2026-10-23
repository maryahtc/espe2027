import { describe, expect, it } from 'vitest'
import type { RecordVM, StepOption } from '@/lib/cases/model'
import { compareVisit, displayOrder, missingDraft, type PlanItem, type PlanVisit, prefillLines } from '@/lib/plans/model'

let pos = 0
const opt = (stepId: string, procedureName: string, stepName: string, unit: StepOption['unit'], extra: Partial<StepOption> = {}): StepOption => ({
  stepId,
  procedureId: `p-${procedureName}`,
  procedureSlug: procedureName,
  procedureName,
  stepName,
  label: stepName === procedureName ? procedureName : `${procedureName} · ${stepName}`,
  unit,
  completes: false,
  requiresDescription: false,
  location: unit === 'arcada' ? 'arcada' : unit === 'caso' ? 'nenhuma' : 'dentes',
  categoryName: 'Cat',
  search: '',
  position: ++pos,
  active: true,
  ...extra,
})
const options = [
  opt('lp', 'Laminado cerâmico', 'Preparo', 'dente'),
  opt('lv', 'Laminado cerâmico', 'Provisório', 'peca'),
  opt('lc', 'Laminado cerâmico', 'Cimentação', 'peca', { completes: true }),
  opt('esc', 'Escaneamento intraoral', 'Escaneamento intraoral', 'arcada'),
  opt('ajuste', 'Ajuste oclusal', 'Ajuste', 'caso', { completes: true }),
  opt('res', 'Restauração em resina — anterior', 'Restauração em resina — anterior', 'dente', { completes: true }),
  opt('exo', 'Exodontia', 'Exodontia', 'dente', { active: false }),
  opt('placa', 'Placa oclusal', 'Instalação', 'peca', { location: 'arcada', completes: true }),
]

let seq = 0
const item = (stepId: string, over: Partial<PlanItem> = {}): PlanItem => ({
  id: `i${++seq}`,
  stepId,
  procedureId: options.find((o) => o.stepId === stepId)!.procedureId,
  teeth: [],
  arch: null,
  quantity: 1,
  description: null,
  position: seq,
  ...over,
})
const rec = (stepId: string, performedOn: string, over: Partial<RecordVM> = {}): RecordVM => ({
  id: `r${++seq}`,
  stepId,
  procedureId: options.find((o) => o.stepId === stepId)!.procedureId,
  performedOn,
  quantity: over.teeth?.length || 1,
  teeth: [],
  arch: null,
  moduleId: null,
  moduleAuto: true,
  note: null,
  description: null,
  removed: false,
  createdAt: `${performedOn}T10:00:00Z`,
  ...over,
})
const visit = (items: PlanItem[], realizedOn: string | null = '2027-03-12', over: Partial<PlanVisit> = {}): PlanVisit => ({ id: `v${++seq}`, position: 1, note: null, realizedOn, items, ...over })
const T = [11, 12, 21, 22]
const D = '2027-03-12'

describe('comparação planejado × realizado (calculada dos registros reais)', () => {
  it('consulta planejada (sem vínculo) não tem comparação', () => {
    expect(compareVisit(visit([item('lp', { teeth: T })], null), [rec('lp', D, { teeth: T })], options)).toBeNull()
  })
  it('✓ registrado como planejado: mesma etapa, todos os dentes', () => {
    const c = compareVisit(visit([item('lp', { teeth: T }), item('lv', { teeth: T })]), [rec('lp', D, { teeth: T }), rec('lv', D, { teeth: [11, 12] }), rec('lv', D, { teeth: [21, 22] })], options)!
    expect(c.items.map((i) => i.status)).toEqual(['planejado', 'planejado'])
    expect(c.extras).toEqual([])
    expect(c.noRecords).toBe(false)
  })
  it('◐ registrado em parte: só alguns dentes', () => {
    const c = compareVisit(visit([item('lc', { teeth: T })]), [rec('lc', D, { teeth: [11, 21] })], options)!
    expect(c.items[0]).toMatchObject({ status: 'parcial', planned: ['d11', 'd12', 'd21', 'd22'], registered: ['d11', 'd21'] })
  })
  it('○ não registrado + "também realizado" quando aconteceu outra coisa', () => {
    const r = rec('res', D, { teeth: [11] })
    const c = compareVisit(visit([item('lc', { teeth: T }), item('ajuste')]), [r], options)!
    expect(c.items.map((i) => i.status)).toEqual(['nao_registrado', 'nao_registrado'])
    expect(c.extras).toEqual([{ record: r, positions: [] }])
  })
  it('mesma etapa em outros dentes: ○ nos planejados e o dente extra em "também realizado"', () => {
    const r = rec('lp', D, { teeth: [13] })
    const c = compareVisit(visit([item('lp', { teeth: [11] })]), [r], options)!
    expect(c.items[0]!.status).toBe('nao_registrado')
    expect(c.extras).toEqual([{ record: r, positions: ['d13'] }])
  })
  it('arcada: "ambas" planejada × "superior" registrada = em parte; × "ambas" = como planejado', () => {
    expect(compareVisit(visit([item('esc', { arch: 'ambas', quantity: 2 })]), [rec('esc', D, { arch: 'superior' })], options)!.items[0]!.status).toBe('parcial')
    expect(compareVisit(visit([item('esc', { arch: 'ambas', quantity: 2 })]), [rec('esc', D, { arch: 'ambas', quantity: 2 })], options)!.items[0]!.status).toBe('planejado')
  })
  it('unidade caso: registrada na consulta = como planejado', () => {
    expect(compareVisit(visit([item('ajuste')]), [rec('ajuste', D)], options)!.items[0]!.status).toBe('planejado')
  })
  it('sem dentes informados: compara a quantidade da mesma etapa', () => {
    const v = visit([item('res', { quantity: 3 })])
    expect(compareVisit(v, [rec('res', D, { quantity: 2 })], options)!.items[0]).toMatchObject({ status: 'parcial', plannedQuantity: 3, registeredQuantity: 2 })
    expect(compareVisit(v, [rec('res', D, { quantity: 3 })], options)!.items[0]!.status).toBe('planejado')
    expect(compareVisit(v, [rec('res', D, { teeth: [11, 21, 22] })], options)!.items[0]!.status).toBe('planejado')
  })
  it('só registros ATIVOS daquela data: removido ou de outra data não conta; sem nenhum → aviso', () => {
    const v = visit([item('lp', { teeth: [11] })])
    const c = compareVisit(v, [rec('lp', D, { teeth: [11], removed: true }), rec('lp', '2027-03-13', { teeth: [11] })], options)!
    expect(c.noRecords).toBe(true)
    expect(c.items[0]!.status).toBe('nao_registrado')
  })
  it('recalcula quando o registro real muda (sem estado guardado)', () => {
    const v = visit([item('lp', { teeth: [11, 21] })])
    const r = rec('lp', D, { teeth: [11] })
    expect(compareVisit(v, [r], options)!.items[0]!.status).toBe('parcial')
    expect(compareVisit(v, [{ ...r, teeth: [11, 21] }], options)!.items[0]!.status).toBe('planejado')
  })
})

describe('posições que faltaram (só quando o aluno pede)', () => {
  it('dentes que faltaram viram um item novo só com eles', () => {
    const c = compareVisit(visit([item('lc', { teeth: T })]), [rec('lc', D, { teeth: [11, 21] })], options)!
    expect(missingDraft(c.items[0]!)).toEqual({ stepId: 'lc', teeth: [12, 22], arch: null, quantity: 2, description: null })
  })
  it('arcada que faltou; as duas → "ambas"; caso → 1; quantidade restante sem posição', () => {
    const v = visit([item('esc', { arch: 'ambas', quantity: 2 }), item('ajuste'), item('res', { quantity: 3 })])
    const c = compareVisit(v, [rec('esc', D, { arch: 'superior' }), rec('res', D, { quantity: 1 })], options)!
    expect(missingDraft(c.items[0]!)).toMatchObject({ arch: 'inferior', quantity: 1 })
    expect(missingDraft(c.items[1]!)).toMatchObject({ teeth: [], arch: null, quantity: 1 })
    expect(missingDraft(c.items[2]!)).toMatchObject({ quantity: 2 })
    const none = compareVisit(visit([item('esc', { arch: 'ambas', quantity: 2 })]), [], options)!
    expect(missingDraft(none.items[0]!)).toMatchObject({ arch: 'ambas', quantity: 2 })
  })
  it('registrado como planejado: nada falta', () => {
    const c = compareVisit(visit([item('lp', { teeth: [11] })]), [rec('lp', D, { teeth: [11] })], options)!
    expect(missingDraft(c.items[0]!)).toBeNull()
  })
})

describe('pré-preenchimento do registro real', () => {
  it('itens viram linhas (dentes, arcada, quantidade pela mesma regra); nada é gravado', () => {
    const v = visit([item('lp', { teeth: T, quantity: 9 }), item('esc', { arch: 'ambas', quantity: 2 }), item('ajuste')], null)
    const { lines, skipped } = prefillLines(v, options)
    expect(lines.map((l) => [l.option.stepId, l.teeth, l.arch, l.quantity, l.warning])).toEqual([
      ['lp', T, null, 4, null],
      ['esc', [], 'ambas', 2, null],
      ['ajuste', [], null, 1, null],
    ])
    expect(skipped).toEqual([])
  })
  it('etapa desativada fica de fora, com aviso', () => {
    const { lines, skipped } = prefillLines(visit([item('exo', { teeth: [36] }), item('ajuste')], null), options)
    expect(lines.map((l) => l.option.stepId)).toEqual(['ajuste'])
    expect(skipped).toEqual(['Exodontia'])
  })
  it('regra do catálogo mudou (peça passou a arcada): linha entra em branco, com "Revise"', () => {
    const changed = options.map((o) => (o.stepId === 'lv' ? { ...o, location: 'arcada' as const } : o))
    const { lines } = prefillLines(visit([item('lv', { teeth: [11] })], null), changed)
    expect(lines[0]).toMatchObject({ teeth: [], arch: null, warning: expect.stringContaining('Revise') })
  })
})

describe('ordem de exibição', () => {
  it('vinculadas pela data real; depois as planejadas pela ordem do aluno, numeradas', () => {
    const a = visit([], '2027-04-01', { position: 1 })
    const b = visit([], null, { position: 3 })
    const c = visit([], '2027-03-01', { position: 2 })
    const d = visit([], null, { position: 1 })
    expect(displayOrder([a, b, c, d]).map((v) => [v.id, v.number])).toEqual([
      [c.id, null],
      [a.id, null],
      [d.id, 1],
      [b.id, 2],
    ])
  })
})
