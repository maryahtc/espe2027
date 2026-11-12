import { describe, expect, it } from 'vitest'
import type { CaseVM, ModuleSpan, RecordVM, StepOption } from '@/lib/cases/model'
import {
  cohortEvolution,
  cohortSummary,
  coverage,
  difficulties,
  modulesContext,
  type OwnedCase,
  panorama,
  sortRows,
  studentProductions,
  studentRows,
} from '@/lib/cohort/model'
import { evolution, type Period, productionBase, slice, summary } from '@/lib/production/model'

// Catálogo de teste (mesma forma do real)
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
  opt('mock', 'mock-up', 'Mock-up', 'Mock-up', 'caso', false, 'Diagnóstico'),
  opt('res', 'resina', 'Restauração em resina — anterior', 'Restauração em resina — anterior', 'dente', true, 'Dentística direta'),
  opt('lp', 'laminado', 'Laminado cerâmico', 'Preparo', 'dente', false, 'Restaurações indiretas'),
  opt('lc', 'laminado', 'Laminado cerâmico', 'Cimentação', 'peca', true, 'Restaurações indiretas'),
  opt('placa', 'placa', 'Placa oclusal', 'Instalação', 'peca', true, 'Oclusão'),
  opt('exo', 'exodontia', 'Exodontia', 'Exodontia', 'dente', true, 'Cirurgia', { active: false }),
]
const byId = new Map(options.map((o) => [o.stepId, o]))
let seq = 0
const rec = (stepId: string, performedOn: string, over: Partial<RecordVM> = {}): RecordVM => {
  const teeth = over.teeth ?? []
  return {
    id: `r${++seq}`,
    stepId,
    procedureId: byId.get(stepId)!.procedureId,
    performedOn,
    quantity: teeth.length || 1,
    teeth,
    arch: null,
    moduleId: null,
    moduleAuto: true,
    note: null,
    description: null,
    removed: false,
    createdAt: `${performedOn}T10:00:${String(seq % 60).padStart(2, '0')}Z`,
    ...over,
  }
}
const kase = (id: string, ownerId: string, records: RecordVM[], over: Partial<CaseVM> = {}): OwnedCase => ({
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
  ownerId,
  ...over,
})
const spans: ModuleSpan[] = [
  { id: 'M1', label: '01', title: 'Módulo 1', start: '2027-03-01', end: '2027-03-05' },
  { id: 'M2', label: '02', title: 'Módulo 2', start: '2027-05-03', end: '2027-05-07' },
]
const cohort = { startsOn: '2027-02-01', endsOn: '2029-07-31' }
const curso: Period = { kind: 'curso' }
const today = '2027-06-15'

// Turma: Ana (ativa), Bruno (ativo), Carla (inativa), Davi (ativo, sem nenhum registro)
const students = [
  { id: 'ana', name: 'Ana', active: true },
  { id: 'bruno', name: 'Bruno', active: true },
  { id: 'carla', name: 'Carla', active: false },
  { id: 'davi', name: 'Davi', active: true },
]
const cases: OwnedCase[] = [
  kase('a1', 'ana', [rec('mock', '2027-03-02'), rec('lp', '2027-03-02', { teeth: [11, 21] }), rec('lc', '2027-05-04', { teeth: [11, 21] })], { topicIds: ['cor'] }),
  kase('a2', 'ana', [rec('res', '2027-05-05', { teeth: [12] }), rec('res', '2027-05-05', { teeth: [12] })]),
  kase('b1', 'bruno', [rec('lp', '2027-03-03', { teeth: [11] }), rec('lp', '2027-03-04', { teeth: [11] })], { topicIds: ['cor', 'isolamento'] }),
  kase('b2', 'bruno', [rec('res', '2027-03-03', { teeth: [21] })], { removed: true, topicIds: ['isolamento'] }),
  kase('c1', 'carla', [rec('mock', '2027-05-04'), rec('placa', '2027-05-06', { removed: true })], { status: 'concluido' }),
  kase('x1', 'fora', [rec('mock', '2027-03-02')]), // dono não é aluno matriculado nesta turma
  kase('a3', 'ana', [rec('mock', '2027-03-02')], { cohortId: 'T2' }), // caso de outra turma
]
const list = (p: Period = curso) => studentProductions(students, cases, 'T1', spans, options, p)

describe('Visão da turma (Etapa 10) — mesmas definições da Etapa 7', () => {
  it('números da turma = soma da Minha Produção de cada aluno (sem dupla contagem)', () => {
    const turma = cohortSummary(list())
    const individual = students.map((s) => summary(productionBase(cases.filter((c) => c.ownerId === s.id), 'T1', spans, options)))
    const sum = (k: 'cases' | 'visits' | 'experiences' | 'completions') => individual.reduce((n, x) => n + x[k], 0)
    expect([turma.cases, turma.visits, turma.experiences, turma.completions]).toEqual([sum('cases'), sum('visits'), sum('experiences'), sum('completions')])
    // Ana: a1 (mock 1 + preparo 2 + cimentação 2) + a2 (resina 12 duplicada no mesmo dia = 1) · Bruno: preparo 11 em 2 datas = 2 · Carla: mock 1
    expect(turma).toMatchObject({ cases: 4, visits: 6, experiences: 9, completions: 3 })
  })

  it('caso excluído, registro excluído, outra turma e quem não é aluno matriculado não entram', () => {
    const rows = studentRows(list())
    expect(rows.find((r) => r.id === 'bruno')).toMatchObject({ cases: 1, experiences: 2 })
    expect(rows.find((r) => r.id === 'carla')).toMatchObject({ cases: 1, experiences: 1, completions: 0 })
    expect(rows.map((r) => r.id)).toEqual(['ana', 'bruno', 'carla', 'davi'])
  })

  it('cobertura: matriculados, com e sem registro no período (ativos e inativos separados)', () => {
    expect(coverage(list())).toEqual({
      enrolled: { total: 4, active: 3, inactive: 1 },
      withRecords: { total: 3, active: 2, inactive: 1 },
      withoutRecords: { total: 1, active: 1, inactive: 0 },
    })
    // Módulo 1 (01–05/03): só Ana e Bruno registraram; Carla (maio) e Davi ficam sem registro
    expect(coverage(list({ kind: 'modulo', moduleId: 'M1' }))).toEqual({
      enrolled: { total: 4, active: 3, inactive: 1 },
      withRecords: { total: 2, active: 2, inactive: 0 },
      withoutRecords: { total: 2, active: 1, inactive: 1 },
    })
  })

  it('filtros iguais aos da Etapa 7 (período por data; concluídos pela primeira conclusão)', () => {
    const p: Period = { kind: 'periodo', from: '2027-05-01', to: '2027-05-31' }
    const turma = cohortSummary(list(p))
    const esperado = students.map((s) => summary(slice(productionBase(cases.filter((c) => c.ownerId === s.id), 'T1', spans, options), p)))
    expect(turma.experiences).toBe(esperado.reduce((n, x) => n + x.experiences, 0))
    expect(turma).toMatchObject({ cases: 3, experiences: 4, completions: 3 })
  })

  it('evolução mensal da turma = soma das evoluções individuais', () => {
    const turma = cohortEvolution(list(), cohort, today)
    const may = turma.find((m) => m.month === '2027-05')!
    const soma = students
      .map((s) => {
        const b = productionBase(cases.filter((c) => c.ownerId === s.id), 'T1', spans, options)
        return evolution(b, b, cohort, today).find((m) => m.month === '2027-05')
      })
      .reduce((n, m) => n + (m?.experiences ?? 0), 0)
    expect(may.experiences).toBe(soma)
    expect(turma[0]!.month).toBe('2027-02')
    expect(turma.at(-1)!.month).toBe('2027-06')
  })

  it('panorama: quantos alunos registraram cada procedimento/etapa, na ordem do catálogo, sem classificação', () => {
    const pan = panorama(list(), options)
    expect(pan.categories.map((c) => c.name)).toEqual(['Diagnóstico', 'Dentística direta', 'Restaurações indiretas'])
    const lam = pan.categories.find((c) => c.name === 'Restaurações indiretas')!.procedures[0]!
    expect(lam).toMatchObject({ name: 'Laminado cerâmico', students: 2, experiences: 6, completions: 2 })
    expect(lam.steps.map((s) => [s.name, s.students, s.experiences])).toEqual([
      ['Preparo', 2, 4],
      ['Cimentação', 1, 2],
    ])
    expect(pan.categories.find((c) => c.name === 'Diagnóstico')!.procedures[0]).toMatchObject({ name: 'Mock-up', students: 2 })
  })

  it('"Sem registros neste período": só procedimentos ATIVOS do catálogo, agrupados e na ordem do catálogo', () => {
    const pan = panorama(list(), options)
    // Placa: só registro excluído → sem registro. Exodontia: desativada → não aparece.
    expect(pan.withoutRecords).toEqual([{ category: 'Oclusão', procedures: [{ procedureId: 'placa', name: 'Placa oclusal' }] }])
    const m1 = panorama(list({ kind: 'modulo', moduleId: 'M1' }), options)
    expect(m1.withoutRecords.flatMap((g) => g.procedures.map((p) => p.name))).toEqual(['Restauração em resina — anterior', 'Placa oclusal'])
  })

  it('dificuldades por tema: casos com registro válido no período; caso excluído não conta', () => {
    const rows = difficulties(list(), new Map(cases.map((c) => [c.id, c.topicIds])), new Map([['cor', 'Cor'], ['isolamento', 'Isolamento']]))
    expect(rows).toEqual([
      { topicId: 'cor', name: 'Cor', cases: 2, students: 2 },
      { topicId: 'isolamento', name: 'Isolamento', cases: 1, students: 1 },
    ])
  })

  it('tabela: último registro do curso inteiro, mesmo sem registro no período', () => {
    const rows = studentRows(list({ kind: 'modulo', moduleId: 'M2' }))
    expect(rows.find((r) => r.id === 'bruno')).toMatchObject({ experiences: 0, lastRecord: '2027-03-04' })
    expect(rows.find((r) => r.id === 'davi')).toMatchObject({ experiences: 0, lastRecord: null })
  })

  it('ordenação: padrão alfabético; qualquer coluna; empates sempre por nome', () => {
    const rows = studentRows(list())
    expect(sortRows(rows).map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Carla', 'Davi'])
    expect(sortRows(rows, 'experiencias', 'desc').map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Carla', 'Davi'])
    expect(sortRows(rows, 'casos', 'asc').map((r) => r.name)).toEqual(['Davi', 'Bruno', 'Carla', 'Ana'])
    expect(sortRows(rows, 'situacao', 'asc').map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Davi', 'Carla'])
    expect(sortRows(rows, 'ultimo', 'desc').map((r) => r.name)).toEqual(['Ana', 'Carla', 'Bruno', 'Davi'])
    expect(sortRows(rows, 'nome', 'desc').map((r) => r.name)).toEqual(['Davi', 'Carla', 'Bruno', 'Ana'])
  })

  it('a linha da tabela não traz nada além dos totais (sem ranking nem posição)', () => {
    expect(Object.keys(studentRows(list())[0]!).sort()).toEqual(['active', 'cases', 'completions', 'experiences', 'id', 'lastRecord', 'name', 'visits'])
  })

  it('contexto do cronograma: só quantos módulos já terminaram', () => {
    expect(modulesContext([{ end: '2027-03-05' }, { end: '2027-05-07' }, { end: null }], today)).toEqual({ done: 2, total: 3 })
  })
})
