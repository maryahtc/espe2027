import { describe, expect, it } from 'vitest'
import type { CaseVM, ModuleSpan, RecordVM, StepOption } from '@/lib/cases/model'
import {
  byModule,
  categoryTree,
  courseYears,
  currentCourseYear,
  effectiveModule,
  evolution,
  exploreAreas,
  offMap,
  type Period,
  productionBase,
  slice,
  summary,
  toothMap,
} from '@/lib/production/model'

// ─── Catálogo de teste (mesma forma do real) ─────────────────────────────────────────────────────
let pos = 0
const opt = (stepId: string, procedureId: string, procedureName: string, stepName: string, unit: StepOption['unit'], completes: boolean, categoryName: string, extra: Partial<StepOption> = {}): StepOption => ({
  stepId,
  procedureId,
  procedureSlug: procedureId,
  procedureName,
  stepName,
  label: stepName === procedureName ? procedureName : `${procedureName} · ${stepName}`,
  unit,
  completes,
  requiresDescription: false,
  location: unit === 'arcada' ? 'arcada' : unit === 'caso' ? 'nenhuma' : 'dentes',
  categoryName,
  search: '',
  position: ++pos,
  active: true,
  ...extra,
})
const options: StepOption[] = [
  opt('esc', 'escaneamento', 'Escaneamento intraoral', 'Escaneamento intraoral', 'arcada', false, 'Diagnóstico'),
  opt('mock', 'mock-up', 'Mock-up', 'Mock-up', 'caso', false, 'Diagnóstico'),
  opt('res', 'resina', 'Restauração em resina — anterior', 'Restauração em resina — anterior', 'dente', true, 'Dentística direta'),
  opt('fac', 'faceta', 'Faceta direta em resina', 'Faceta direta em resina', 'dente', true, 'Dentística direta'),
  opt('lp', 'laminado', 'Laminado cerâmico', 'Preparo', 'dente', false, 'Restaurações indiretas'),
  opt('lv', 'laminado', 'Laminado cerâmico', 'Provisório', 'peca', false, 'Restaurações indiretas'),
  opt('lc', 'laminado', 'Laminado cerâmico', 'Cimentação', 'peca', true, 'Restaurações indiretas'),
  opt('placa', 'placa', 'Placa oclusal', 'Instalação', 'peca', true, 'Oclusão', { location: 'arcada' }),
  opt('ajuste', 'ajuste', 'Ajuste oclusal', 'Ajuste', 'caso', true, 'Oclusão'),
  opt('exo', 'exodontia', 'Exodontia', 'Exodontia', 'dente', true, 'Cirurgia', { active: false }),
  opt('outro', 'outro', 'Outro procedimento', 'Outro procedimento', 'caso', false, 'Outros', { requiresDescription: true }),
]
const byId = new Map(options.map((o) => [o.stepId, o]))

let seq = 0
const rec = (stepId: string, performedOn: string, over: Partial<RecordVM> = {}): RecordVM => {
  const o = byId.get(stepId)!
  const teeth = over.teeth ?? []
  const arch = over.arch ?? null
  return {
    id: `r${++seq}`,
    stepId,
    procedureId: o.procedureId,
    performedOn,
    quantity: teeth.length || (arch ? (arch === 'ambas' ? 2 : 1) : 1),
    teeth,
    arch,
    moduleId: null,
    moduleAuto: true,
    note: null,
    description: null,
    removed: false,
    createdAt: `${performedOn}T10:00:${String(seq).padStart(2, '0')}Z`,
    ...over,
  }
}
const kase = (id: string, records: RecordVM[], over: Partial<CaseVM> = {}): CaseVM => ({
  id,
  cohortId: 'T1',
  patientLabel: id.toUpperCase(),
  title: null,
  status: 'em_andamento',
  startedOn: null,
  lastActivityOn: null,
  concludedOn: null,
  supervisorId: null,
  smileCloudUrl: null,
  difficulty: null,
  ease: null,
  differently: null,
  coverPath: null,
  removed: false,
  createdAt: '2027-01-01T00:00:00Z',
  topicIds: [],
  records,
  ...over,
})
const modules: ModuleSpan[] = [
  { id: 'M1', label: '01', title: 'Módulo 1', start: '2027-03-01', end: '2027-03-05' },
  { id: 'M2', label: '02', title: 'Módulo 2', start: '2027-05-03', end: '2027-05-07' },
  { id: 'M3', label: '03', title: 'Módulo 3', start: '2028-03-06', end: '2028-03-10' },
]
const cohort = { id: 'T1', startsOn: '2027-02-01', endsOn: '2029-07-31' }
const curso: Period = { kind: 'curso' }
const base = (cases: CaseVM[], spans = modules) => productionBase(cases, 'T1', spans, options)
const T = [11, 12, 21, 22]

describe('experiências e tratamentos concluídos (exemplos aprovados)', () => {
  const laminado = () => [
    rec('lp', '2027-03-02', { teeth: T }),
    rec('lv', '2027-03-02', { teeth: T }),
    rec('lc', '2027-03-09', { teeth: [11, 21] }),
    rec('lc', '2027-03-16', { teeth: [12, 22] }),
  ]
  it('laminado em 4 dentes: 12 experiências e 4 concluídos', () => {
    const s = summary(base([kase('a', laminado())]))
    expect([s.experiences, s.completions, s.visits, s.cases, s.distinctProcedures]).toEqual([12, 4, 3, 1, 1])
  })
  it('a cimentação do 11 lançada de novo no mesmo dia não conta duas vezes', () => {
    const s = summary(base([kase('a', [...laminado(), rec('lc', '2027-03-09', { teeth: [11] })])]))
    expect([s.experiences, s.completions]).toEqual([12, 4])
  })
  it('recimentação do 11 em outra data: nova experiência, mesmos concluídos', () => {
    const s = summary(base([kase('a', [...laminado(), rec('lc', '2027-04-20', { teeth: [11] })])]))
    expect([s.experiences, s.completions]).toEqual([13, 4])
  })
  it('1 linha com 4 dentes = 4 linhas com 1 dente (não depende de como foi lançado)', () => {
    const one = summary(base([kase('a', [rec('res', '2027-03-02', { teeth: T })])]))
    const four = summary(base([kase('a', T.map((t) => rec('res', '2027-03-02', { teeth: [t] })))]))
    expect(one).toEqual(four)
    expect([one.experiences, one.completions, one.visits]).toEqual([4, 4, 1])
  })
  it('arcada: escaneamento "ambas" = 2 experiências; "superior" no mesmo dia não duplica; nenhum concluído', () => {
    const s = summary(base([kase('a', [rec('esc', '2027-03-02', { arch: 'ambas' }), rec('esc', '2027-03-02', { arch: 'superior' })])]))
    expect([s.experiences, s.completions]).toEqual([2, 0])
  })
  it('peça por arcada: placa oclusal superior = 1 experiência e 1 concluído; "ambas" depois só acrescenta a inferior', () => {
    expect(summary(base([kase('a', [rec('placa', '2027-03-02', { arch: 'superior' })])])).completions).toBe(1)
    const s = summary(base([kase('a', [rec('placa', '2027-03-02', { arch: 'superior' }), rec('placa', '2027-06-01', { arch: 'ambas' })])]))
    expect([s.experiences, s.completions]).toEqual([3, 2])
  })
  it('unidade caso: ajuste oclusal duas vezes no mesmo caso = 2 experiências, 1 concluído; em outro caso, mais 1', () => {
    const s = summary(base([kase('a', [rec('ajuste', '2027-03-02'), rec('ajuste', '2027-04-02')]), kase('b', [rec('ajuste', '2027-04-02')])]))
    expect([s.experiences, s.completions, s.cases, s.visits]).toEqual([3, 2, 2, 3])
  })
  it('mock-up (caso, sem conclusão) e "Outro procedimento": só experiência', () => {
    const s = summary(base([kase('a', [rec('mock', '2027-03-02'), rec('outro', '2027-03-02', { description: 'Remoção de bráquetes' })])]))
    expect([s.experiences, s.completions, s.visits, s.distinctProcedures]).toEqual([2, 0, 1, 2])
  })
  it('sem dente informado: a quantidade conta (anônima) e fica fora do mapa', () => {
    const b = base([kase('a', [rec('res', '2027-03-02', { quantity: 3 })])])
    expect([summary(b).experiences, summary(b).completions]).toEqual([3, 3])
    expect(toothMap(b, options).size).toBe(0)
    expect(offMap(b).unpositioned).toBe(3)
  })
  it('etapa desativada no catálogo continua contando', () => {
    expect(summary(base([kase('a', [rec('exo', '2027-03-02', { teeth: [36] })])])).completions).toBe(1)
  })
})

describe('registros e casos removidos/restaurados; turma', () => {
  it('registro removido não conta; caso removido não conta; restaurar devolve', () => {
    const r = rec('res', '2027-03-02', { teeth: [11] })
    const removedRecord = summary(base([kase('a', [{ ...r, removed: true }, rec('res', '2027-03-02', { teeth: [21] })])]))
    expect([removedRecord.experiences, removedRecord.cases]).toEqual([1, 1])
    expect(summary(base([kase('a', [r], { removed: true })])).cases).toBe(0)
    expect(summary(base([kase('a', [r], { removed: false })])).experiences).toBe(1)
  })
  it('caso sem registro válido não conta como caso; caso de outra turma fica fora', () => {
    const s = summary(base([kase('a', []), kase('b', [rec('res', '2027-03-02', { teeth: [11] })], { cohortId: 'OUTRA' })]))
    expect(s.cases).toBe(0)
  })
  it('casos: em andamento × concluídos pelo status atual', () => {
    const s = summary(base([kase('a', [rec('mock', '2027-03-02')]), kase('b', [rec('mock', '2027-03-02')], { status: 'concluido' })]))
    expect([s.cases, s.casesInProgress, s.casesConcluded]).toEqual([2, 1, 1])
  })
})

describe('módulo efetivo', () => {
  it('automático: recalculado pelo cronograma atual; manual: o gravado', () => {
    expect(effectiveModule({ moduleAuto: true, moduleId: 'VELHO', performedOn: '2027-03-03' }, modules)).toBe('M1')
    expect(effectiveModule({ moduleAuto: true, moduleId: null, performedOn: '2027-04-10' }, modules)).toBe('M1') // último que já terminou
    expect(effectiveModule({ moduleAuto: true, moduleId: 'M1', performedOn: '2027-02-10' }, modules)).toBeNull()
    expect(effectiveModule({ moduleAuto: false, moduleId: 'M2', performedOn: '2027-03-03' }, modules)).toBe('M2')
    expect(effectiveModule({ moduleAuto: false, moduleId: null, performedOn: '2027-03-03' }, modules)).toBeNull()
  })
  it('mudar o cronograma move só os automáticos', () => {
    const cases = [kase('a', [rec('res', '2027-03-03', { teeth: [11] }), rec('res', '2027-03-03', { teeth: [21], moduleAuto: false, moduleId: 'M1' })])]
    const moved = modules.map((m) => (m.id === 'M1' ? { ...m, start: '2027-03-10', end: '2027-03-12' } : m))
    const rows = byModule(base(cases, moved), options, moved, '2027-12-01')
    expect(rows.find((r) => r.moduleId === 'M1')?.experiences).toBe(1)
    expect(rows.find((r) => r.moduleId === null)?.experiences).toBe(1)
  })
  it('por módulo: experiências, concluídos e categorias principais; "Sem módulo" só se houver', () => {
    const cases = [kase('a', [rec('res', '2027-03-02', { teeth: [11, 21] }), rec('esc', '2027-05-04', { arch: 'superior' })])]
    const rows = byModule(base(cases), options, modules, '2027-06-01')
    expect(rows.map((r) => [r.moduleId, r.experiences, r.completions, r.topCategories[0]?.name ?? null])).toEqual([
      ['M1', 2, 2, 'Dentística direta'],
      ['M2', 1, 0, 'Diagnóstico'],
    ])
  })
})

describe('anos do curso e filtros', () => {
  it('três anos a partir das datas reais da turma (o último é mais curto)', () => {
    expect(courseYears(cohort)).toEqual([
      { index: 1, start: '2027-02-01', end: '2028-01-31' },
      { index: 2, start: '2028-02-01', end: '2029-01-31' },
      { index: 3, start: '2029-02-01', end: '2029-07-31' },
    ])
  })
  it('início em 29/02: anos seguintes começam em 28/02', () => {
    expect(courseYears({ startsOn: '2028-02-29', endsOn: '2030-06-30' }).map((y) => [y.start, y.end])).toEqual([
      ['2028-02-29', '2029-02-27'],
      ['2029-02-28', '2030-02-27'],
      ['2030-02-28', '2030-06-30'],
    ])
  })
  it('ano atual: contém hoje; antes do início = 1º; depois do fim = último', () => {
    const y = courseYears(cohort)
    expect(currentCourseYear(y, '2028-01-31')?.index).toBe(1)
    expect(currentCourseYear(y, '2028-02-01')?.index).toBe(2)
    expect(currentCourseYear(y, '2026-10-21')?.index).toBe(1)
    expect(currentCourseYear(y, '2030-01-01')?.index).toBe(3)
  })
  it('filtro de ano, período e módulo; concluído entra pela primeira conclusão', () => {
    const cases = [kase('a', [rec('res', '2027-03-02', { teeth: [11] }), rec('res', '2028-03-07', { teeth: [11] }), rec('res', '2028-03-07', { teeth: [21] })])]
    const b = base(cases)
    const y2 = { kind: 'ano', year: courseYears(cohort)[1]! } as const
    expect(summary(slice(b, y2))).toMatchObject({ experiences: 2, completions: 1, visits: 1 })
    expect(summary(slice(b, { kind: 'periodo', from: '2027-01-01', to: '2027-12-31' }))).toMatchObject({ experiences: 1, completions: 1 })
    expect(summary(slice(b, { kind: 'modulo', moduleId: 'M3' }))).toMatchObject({ experiences: 2, completions: 1 })
    expect(summary(slice(b, curso))).toMatchObject({ experiences: 3, completions: 2, visits: 2 })
  })
})

describe('evolução, categorias, mapa e áreas para explorar', () => {
  const cases = [
    kase('a', [rec('lp', '2027-03-02', { teeth: T }), rec('lc', '2027-04-06', { teeth: [11, 21] }), rec('esc', '2027-03-02', { arch: 'ambas' })]),
    kase('b', [rec('res', '2027-04-06', { teeth: [11] }), rec('mock', '2027-04-06')]),
  ]
  const b = base(cases)
  it('evolução mensal do início da turma até hoje, com o filtro destacado', () => {
    const ev = evolution(b, slice(b, { kind: 'periodo', from: '2027-04-01', to: '2027-04-30' }), cohort, '2027-05-15')
    expect(ev.map((m) => [m.month, m.experiences, m.completions, m.inFilter])).toEqual([
      ['2027-02', 0, 0, false],
      ['2027-03', 6, 0, false],
      ['2027-04', 4, 3, true],
      ['2027-05', 0, 0, false],
    ])
  })
  it('categoria → procedimento → etapas, com experiências e concluídos', () => {
    const tree = categoryTree(b, options)
    expect(tree.map((c) => [c.name, c.experiences, c.completions])).toEqual([
      ['Restaurações indiretas', 6, 2],
      ['Diagnóstico', 3, 0],
      ['Dentística direta', 1, 1],
    ])
    const lam = tree[0]!.procedures[0]!
    expect([lam.name, lam.experiences, lam.completions, lam.hasCompletion]).toEqual(['Laminado cerâmico', 6, 2, true])
    expect(lam.steps.map((s) => [s.name, s.experiences, s.completes])).toEqual([
      ['Preparo', 4],
      ['Cimentação', 2],
    ].map(([n, e]) => [n, e, n === 'Cimentação']))
  })
  it('mapa: só quantidade por dente, faixas relativas ao próprio máximo; arcadas e caso fora do mapa', () => {
    const map = toothMap(b, options)
    expect(map.get(11)).toMatchObject({ experiences: 3, level: 4, cases: 2, visits: 3 })
    expect(map.get(12)).toMatchObject({ experiences: 1, level: 2 })
    expect(map.get(11)!.procedures.map((p) => [p.name, p.experiences])).toEqual([
      ['Laminado cerâmico', 2],
      ['Restauração em resina — anterior', 1],
    ])
    const off = offMap(b)
    expect(off.arch.ambas).toEqual({ records: 1, experiences: 2 })
    expect(off.caseLevel).toBe(1)
  })
  it('áreas para explorar: categorias e procedimentos ativos ainda sem registro (sem "Outro procedimento")', () => {
    const ex = exploreAreas(b, options)
    expect(ex.categories.map((c) => [c.name, c.procedures.map((p) => p.name)])).toEqual([['Oclusão', ['Placa oclusal', 'Ajuste oclusal']]])
    expect(ex.procedures.map((p) => p.name)).toEqual(['Faceta direta em resina'])
  })
  it('sem nenhum registro: tudo zerado, sem erro', () => {
    const empty = base([])
    expect(summary(empty)).toMatchObject({ cases: 0, visits: 0, experiences: 0, completions: 0 })
    expect(categoryTree(empty, options)).toEqual([])
    expect(toothMap(empty, options).size).toBe(0)
  })
})
