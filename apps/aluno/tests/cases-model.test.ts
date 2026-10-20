import { describe, expect, it } from 'vitest'
import {
  caseHeadline,
  filterCases,
  hasPersonalIdentifier,
  moduleForDate,
  parseTeeth,
  patientLabelError,
  type RecordVM,
  searchOptions,
  type StepOption,
  suggestTopics,
  timeline,
  topOptions,
  treatmentSummary,
} from '@/lib/cases/model'

const opt = (stepId: string, procedureId: string, procedureName: string, stepName: string, unit: StepOption['unit'], completes: boolean, position: number, synonyms = ''): StepOption => ({
  stepId,
  procedureId,
  procedureName,
  stepName,
  label: stepName === procedureName ? procedureName : `${procedureName} · ${stepName}`,
  unit,
  completes,
  requiresDescription: false,
  location: unit === 'arcada' ? 'arcada' : unit === 'caso' ? 'nenhuma' : 'dentes',
  categoryName: 'Cat',
  search: `${procedureName} ${stepName} ${synonyms}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase(),
  position,
  active: true,
})
const options = [
  opt('lp', 'lam', 'Laminado cerâmico', 'Preparo', 'dente', false, 1, 'lente de contato dental faceta ceramica'),
  opt('lv', 'lam', 'Laminado cerâmico', 'Provisório', 'peca', false, 2, 'lente de contato dental'),
  opt('lc', 'lam', 'Laminado cerâmico', 'Cimentação', 'peca', true, 3, 'lente de contato dental'),
  opt('ex', 'exo', 'Exodontia', 'Exodontia', 'dente', true, 4, 'extração'),
  opt('sc', 'esc', 'Escaneamento intraoral', 'Escaneamento intraoral', 'arcada', false, 5, 'scanner'),
]
const rec = (over: Partial<RecordVM>): RecordVM => ({
  id: Math.random().toString(36),
  stepId: 'lp',
  procedureId: 'lam',
  performedOn: '2027-04-06',
  quantity: 1,
  teeth: [],
  arch: null,
  moduleId: null,
  moduleAuto: true,
  note: null,
  description: null,
  removed: false,
  createdAt: '2027-04-06T10:00:00Z',
  ...over,
})

describe('privacidade (mesmas regras do banco)', () => {
  it('identificação: aceita iniciais e códigos; recusa nomes, CPF e telefone', () => {
    for (const ok of ['M.A.S.', 'MAS', 'SC-1023', 'R.C.T.', 'PAC 12']) expect(patientLabelError(ok)).toBeNull()
    for (const bad of ['Maria Silva', 'José Lima', 'MARIASILVA', '12345678909', '11987654321', '', 'ABCDEFGHIJKLM']) expect(patientLabelError(bad)).not.toBeNull()
  })
  it('textos: CPF e telefone detectados; listas de dentes e datas não', () => {
    expect(hasPersonalIdentifier('CPF 123.456.789-09')).toBe(true)
    expect(hasPersonalIdentifier('ligar (11) 98765-4321')).toBe(true)
    expect(hasPersonalIdentifier('dentes 12 11 21 22, retorno em 06/04/2027')).toBe(false)
  })
})

describe('busca e atalhos do registro', () => {
  it('busca por sinônimo leva ao procedimento oficial; todas as palavras precisam aparecer', () => {
    expect(searchOptions(options, 'lente').map((o) => o.stepId)).toEqual(['lp', 'lv', 'lc'])
    expect(searchOptions(options, 'lente cimenta').map((o) => o.stepId)).toEqual(['lc'])
    expect(searchOptions(options, 'extracao').map((o) => o.stepId)).toEqual(['ex'])
    expect(searchOptions(options, '')).toEqual([])
  })
  it('atalhos: as etapas mais registradas pelo aluno, empate pela mais recente', () => {
    const history = [
      { stepId: 'ex', createdAt: '2027-03-01' },
      { stepId: 'lp', createdAt: '2027-03-02' },
      { stepId: 'lp', createdAt: '2027-03-03' },
      { stepId: 'sc', createdAt: '2027-03-04' },
    ]
    expect(topOptions(options, history, 3).map((o) => o.stepId)).toEqual(['lp', 'sc', 'ex'])
    expect(topOptions(options, [])).toEqual([])
  })
})

describe('módulo pela data (mesma regra do banco)', () => {
  const mods = [
    { id: 'm1', label: '01', title: 'M1', start: '2027-02-11', end: '2027-02-13' },
    { id: 'm2', label: '02', title: 'M2', start: '2027-03-18', end: '2027-03-20' },
  ]
  it('durante → o módulo; entre módulos → o último que terminou; antes de todos → nenhum', () => {
    expect(moduleForDate(mods, '2027-02-12')?.id).toBe('m1')
    expect(moduleForDate(mods, '2027-03-01')?.id).toBe('m1')
    expect(moduleForDate(mods, '2027-04-01')?.id).toBe('m2')
    expect(moduleForDate(mods, '2027-01-01')).toBeNull()
  })
})

describe('caso, linha do tempo e andamento', () => {
  const records = [
    rec({ stepId: 'sc', procedureId: 'esc', performedOn: '2027-03-02', quantity: 2 }),
    rec({ stepId: 'ex', procedureId: 'exo', performedOn: '2027-03-16', teeth: [14] }),
    rec({ stepId: 'lp', performedOn: '2027-04-06', quantity: 3, teeth: [12, 11, 22] }),
    rec({ stepId: 'lv', performedOn: '2027-04-06', quantity: 3 }),
    rec({ stepId: 'lc', performedOn: '2027-04-27', quantity: 2, teeth: [12, 11] }),
    rec({ stepId: 'lc', performedOn: '2027-04-28', quantity: 1, teeth: [22], removed: true }),
  ]
  it('título do cartão: procedimentos na ordem em que apareceram (+n)', () => {
    expect(caseHeadline({ title: null, records }, options)).toBe('Escaneamento intraoral · Exodontia +1')
    expect(caseHeadline({ title: 'Reabilitação anterior', records }, options)).toBe('Reabilitação anterior')
  })
  it('linha do tempo: consultas por data, sem registros excluídos', () => {
    expect(timeline(records).map((g) => [g.date, g.records.length])).toEqual([
      ['2027-03-02', 1],
      ['2027-03-16', 1],
      ['2027-04-06', 2],
      ['2027-04-27', 1],
    ])
  })
  it('andamento: etapas somadas, concluídos só pela etapa que conclui, dentes ainda sem a etapa final', () => {
    const lam = treatmentSummary(records, options).find((s) => s.procedureId === 'lam')!
    expect(lam.steps.map((s) => [s.name, s.total])).toEqual([
      ['Preparo', 3],
      ['Provisório', 3],
      ['Cimentação', 2],
    ])
    expect(lam.concluded).toBe(2)
    expect(lam.pendingTeeth).toEqual([22])
    expect(treatmentSummary(records, options).some((s) => s.procedureId === 'esc')).toBe(false)
  })
  it('dentes digitados: só FDI válidos, sem repetidos', () => {
    expect(parseTeeth('12, 11 21 19 11 48')).toEqual([12, 11, 21, 48])
  })
})

describe('temas e filtros', () => {
  it('temas sugeridos pelo texto da dificuldade (nome ou sinônimo, sem acento)', () => {
    const topics = [
      { id: 'a', name: 'Isolamento do campo operatório', synonyms: ['isolamento absoluto', 'dique de borracha'] },
      { id: 'b', name: 'Adesão', synonyms: ['adesivo'] },
    ]
    expect(suggestTopics('Tive dificuldade no isolamento absoluto e com o adesivo', topics).map((t) => t.id)).toEqual(['a', 'b'])
    expect(suggestTopics('ok', topics)).toEqual([])
  })
  it('filtros: em andamento, concluídos, excluídos e busca pelo código', () => {
    const cs = [
      { status: 'em_andamento' as const, removed: false, patientLabel: 'M.A.S.', title: null },
      { status: 'concluido' as const, removed: false, patientLabel: 'R.C.T.', title: 'Reabilitação' },
      { status: 'em_andamento' as const, removed: true, patientLabel: 'X.Y.', title: null },
    ]
    expect(filterCases(cs, null, '').length).toBe(2)
    expect(filterCases(cs, 'andamento', '').map((c) => c.patientLabel)).toEqual(['M.A.S.'])
    expect(filterCases(cs, 'concluidos', '').map((c) => c.patientLabel)).toEqual(['R.C.T.'])
    expect(filterCases(cs, 'excluidos', '').map((c) => c.patientLabel)).toEqual(['X.Y.'])
    expect(filterCases(cs, null, 'reab').map((c) => c.patientLabel)).toEqual(['R.C.T.'])
    expect(filterCases(cs, null, 'rct').map((c) => c.patientLabel)).toEqual(['R.C.T.'])
  })
})
