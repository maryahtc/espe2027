import { describe, expect, it } from 'vitest'
import {
  caseHeadline,
  caseJourney,
  filterCases,
  hasPersonalIdentifier,
  moduleForDate,
  parseTeeth,
  patientLabelError,
  type RecordVM,
  searchOptions,
  type StepOption,
  suggestTopics,
  groupByProcedure,
  quickAccess,
  sortTeeth,
  teethCount,
  timeline,
  TOOTH_SHORTCUTS,
  topOptions,
  treatmentSummary,
  usesPositions,
} from '@/lib/cases/model'

const opt = (stepId: string, procedureId: string, procedureName: string, stepName: string, unit: StepOption['unit'], completes: boolean, position: number, synonyms = ''): StepOption => ({
  stepId,
  procedureId,
  procedureSlug: ({ lam: 'laminado-ceramico', exo: 'exodontia', esc: 'escaneamento-intraoral', ppf: 'protese-parcial-fixa-dentossuportada', res: 'restauracao-em-resina-anterior' } as Record<string, string>)[procedureId] ?? procedureId,
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

describe('polimento do registro: acesso rápido, procedimento → etapa e linguagem', () => {
  const pool = [
    ...options,
    opt('rs', 'res', 'Restauração em resina — anterior', 'Restauração em resina — anterior', 'dente', true, 6),
    opt('pp', 'ppf', 'Prótese parcial fixa (dentossuportada)', 'Preparo de pilar', 'dente', false, 7),
  ]
  const at = (stepId: string, createdAt: string) => ({ stepId, createdAt })
  it('sem histórico: atalhos padrão do catálogo (procedimento inteiro), na ordem aprovada e só os compatíveis', () => {
    const q = quickAccess(pool, [])
    expect(q.map((i) => (i.kind === 'procedimento' ? i.group.procedureName : i.option.label))).toEqual([
      'Laminado cerâmico',
      'Restauração em resina — anterior',
      'Escaneamento intraoral',
    ])
    expect(q.every((i) => i.source === 'padrao')).toBe(true)
    const teethOnly = pool.filter((o) => o.location === 'dentes')
    expect(quickAccess(teethOnly, []).some((i) => i.kind === 'procedimento' && i.group.procedureName === 'Escaneamento intraoral')).toBe(false)
  })
  it('com histórico: recentes primeiro (3 distintas), depois frequentes (2+), no máximo 6', () => {
    const history = [at('ex', '2027-04-01'), at('ex', '2027-04-02'), at('ex', '2027-04-03'), at('lc', '2027-04-10'), at('lp', '2027-04-09'), at('rs', '2027-04-08'), at('sc', '2027-03-01'), at('sc', '2027-03-02')]
    const q = quickAccess(pool, history)
    expect(q.map((i) => (i.kind === 'etapa' ? `${i.option.stepId}:${i.source}` : 'padrao'))).toEqual(['lc:recente', 'lp:recente', 'rs:recente', 'ex:frequente', 'sc:frequente'])
    expect(quickAccess(pool, history, 4)).toHaveLength(4)
  })
  it('pouco histórico: completa com padrão sem repetir o procedimento já sugerido', () => {
    const q = quickAccess(pool, [at('lc', '2027-04-10')])
    // 1 recente + os padrão compatíveis restantes (resina anterior, escaneamento) — sem repetir o laminado.
    expect(q).toHaveLength(3)
    expect(q[0]).toMatchObject({ kind: 'etapa', source: 'recente' })
    expect(q.filter((i) => i.kind === 'procedimento' && i.group.procedureName === 'Laminado cerâmico')).toHaveLength(0)
  })
  it('histórico de etapa incompatível com o caminho é ignorado', () => {
    const teethOnly = pool.filter((o) => o.location === 'dentes')
    expect(quickAccess(teethOnly, [at('sc', '2027-04-10')]).every((i) => i.source === 'padrao')).toBe(true)
  })
  it('agrupa etapas pelo procedimento, mantendo a ordem', () => {
    expect(groupByProcedure(pool).map((g) => [g.procedureName, g.steps.map((s) => s.stepName)])).toEqual([
      ['Laminado cerâmico', ['Preparo', 'Provisório', 'Cimentação']],
      ['Exodontia', ['Exodontia']],
      ['Escaneamento intraoral', ['Escaneamento intraoral']],
      ['Restauração em resina — anterior', ['Restauração em resina — anterior']],
      ['Prótese parcial fixa (dentossuportada)', ['Preparo de pilar']],
    ])
  })
  it('dentes × posições: "posição" só onde pode não haver dente (PPF, implante)', () => {
    expect(usesPositions(pool.find((o) => o.stepId === 'pp'))).toBe(true)
    expect(usesPositions(pool.find((o) => o.stepId === 'lc'))).toBe(false)
    expect(teethCount(3, false, true)).toBe('3 dentes selecionados')
    expect(teethCount(1, false, true)).toBe('1 dente selecionado')
    expect(teethCount(2, true)).toBe('2 posições')
  })
  it('ordem FDI consistente, qualquer que seja a ordem dos toques', () => {
    expect(sortTeeth([21, 11, 31, 18, 41, 12])).toEqual([18, 12, 11, 21, 41, 31])
    expect(sortTeeth([12, 21, 11])).toEqual(sortTeeth([11, 12, 21]))
  })
  it('atalhos do odontograma falam em dentes (arcada é localização de etapa)', () => {
    expect(TOOTH_SHORTCUTS.map((s) => s.label)).toEqual(['Anteriores sup.', 'Anteriores inf.', 'Todos superiores', 'Todos inferiores'])
  })
})

describe('jornada do caso (só apresentação)', () => {
  const records = [
    rec({ stepId: 'lc', performedOn: '2027-04-09', teeth: [11, 12, 21, 22], quantity: 4, createdAt: '2027-04-09T10:00:00Z' }),
    rec({ stepId: 'lv', performedOn: '2027-03-12', teeth: [22, 11, 12, 21], quantity: 4, createdAt: '2027-03-12T10:05:00Z' }),
    rec({ stepId: 'lp', performedOn: '2027-03-12', teeth: [11, 12, 21, 22], quantity: 4, createdAt: '2027-03-12T10:10:00Z' }),
    rec({ stepId: 'sc', procedureId: 'esc', performedOn: '2027-03-12', quantity: 2, createdAt: '2027-03-12T09:00:00Z' }),
    rec({ stepId: 'ex', procedureId: 'exo', performedOn: '2027-05-01', teeth: [36], createdAt: '2027-05-01T09:00:00Z' }),
    rec({ stepId: 'lc', performedOn: '2027-05-02', teeth: [11], removed: true }),
  ]
  it('consultas por data, numeradas em ordem cronológica; procedimentos e etapas na ordem do catálogo', () => {
    const j = caseJourney(records, options)
    expect(j.map((v) => [v.date, v.number])).toEqual([
      ['2027-03-12', 1],
      ['2027-04-09', 2],
      ['2027-05-01', 3],
    ])
    expect(j[0]!.procedures.map((p) => [p.procedureName, p.records.map((r) => r.stepId)])).toEqual([
      ['Escaneamento intraoral', ['sc']],
      ['Laminado cerâmico', ['lp', 'lv']],
    ])
  })
  it('filtro por dente: só as consultas e registros daquele dente, mantendo a numeração real', () => {
    const j = caseJourney(records, options, 36)
    expect(j.map((v) => [v.date, v.number, v.procedures.map((p) => p.procedureName)])).toEqual([['2027-05-01', 3, ['Exodontia']]])
    const j11 = caseJourney(records, options, 11)
    expect(j11.map((v) => v.number)).toEqual([1, 2])
    expect(j11[0]!.procedures.map((p) => p.procedureName)).toEqual(['Laminado cerâmico'])
  })
  it('registros excluídos não entram na jornada', () => {
    expect(caseJourney(records, options).some((v) => v.date === '2027-05-02')).toBe(false)
  })
})
