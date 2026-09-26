import { describe, expect, it } from 'vitest'
import { demoWorkbook, PRIVATE_SENTINEL } from '@fixtures/workbook'
import { SHEET_TABS } from '@/config/sheets'
import { buildFromWorkbook } from '@/server/data/pipeline/build'
import { readTab } from '@/server/data/pipeline/read'
import { CriticalDataError } from '@/server/data/types'

const NOW = new Date('2026-09-26T12:00:00Z')

function build(workbook = demoWorkbook) {
  return buildFromWorkbook(workbook, 'mock', NOW)
}

describe('leitura por whitelist', () => {
  it('encontra colunas pelo nome, em qualquer ordem, e descarta as demais', () => {
    const rows = [
      ['Cachê', 'ESPECIALIDADE', 'professor', 'Telefone'],
      ['R$ 1', 'Prótese', 'Ana', '999'],
    ]
    const result = readTab(SHEET_TABS.professors, rows)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.records).toHaveLength(1)
    expect(Object.keys(result.records[0]!.values).sort()).toEqual(['aliases', 'bio', 'name', 'specialty'])
    expect(result.records[0]!.values.name).toBe('Ana')
    expect(JSON.stringify(result.records)).not.toContain('R$ 1')
    expect(JSON.stringify(result.records)).not.toContain('999')
  })

  it('coluna obrigatória ausente invalida a aba', () => {
    const result = readTab(SHEET_TABS.professors, [['Especialidade'], ['Prótese']])
    expect(result.ok).toBe(false)
    expect(result.issues[0]).toMatchObject({ code: 'column_missing', severity: 'error' })
  })

  it('ignora linhas vazias e informa o número real da linha', () => {
    const result = readTab(SHEET_TABS.professors, [['Professor'], [''], [null], ['Ana']])
    expect(result.ok && result.records.map((r) => r.row)).toEqual([4])
  })
})

describe('privacidade — nenhum campo interno chega aos dados públicos', () => {
  it('o PublicDataset não contém nenhum valor de coluna privada', () => {
    const { dataset } = build()
    const json = JSON.stringify(dataset)
    expect(json).not.toMatch(PRIVATE_SENTINEL)
  })

  it('o relatório de saúde não contém valores de células', () => {
    const { report } = build()
    expect(JSON.stringify(report)).not.toMatch(PRIVATE_SENTINEL)
  })

  it('DTOs têm exatamente as chaves públicas declaradas', () => {
    const { dataset } = build()
    expect(Object.keys(dataset.professors[0]!).sort()).toEqual(['bio', 'name', 'slug', 'specialty'])
  })

  it('não publica professor sem aula nem conteúdo marcado como rascunho', () => {
    const { dataset } = build()
    expect(dataset.professors.map((p) => p.name)).not.toContain('SENTINELA Professor Sem Aula')
    expect(dataset.modules.map((m) => m.number)).not.toContain(12)
    expect(dataset.classes.some((c) => c.title.includes('RASCUNHO'))).toBe(false)
  })
})

describe('transformação da planilha', () => {
  it('monta módulos, aulas e vínculos', () => {
    const { dataset } = build()
    expect(dataset.modules).toHaveLength(11)
    const m7 = dataset.modules.find((m) => m.number === 7)!
    expect(m7).toMatchObject({ slug: '07', startDate: '2027-08-18', endDate: '2027-08-20', title: 'Reabilitação estética' })

    const aula = dataset.classes.find((c) => c.title === 'Preparos para restaurações indiretas')!
    expect(aula).toMatchObject({
      moduleNumber: 7,
      date: '2027-08-19',
      start: '14:00',
      end: '18:00',
      type: 'hands-on',
      professorSlugs: ['joao-silva'],
    })
  })

  it('aceita datas e horários como número serial', () => {
    const { dataset } = build()
    const m4 = dataset.classes.find((c) => c.title === 'Marketing e gestão do consultório')!
    expect(m4).toMatchObject({ date: '2027-05-20', start: '08:00', end: '12:00' })
  })

  it('vincula apelidos e primeiro nome único ao professor cadastrado', () => {
    const { dataset } = build()
    const doc = dataset.classes.find((c) => c.title === 'Documentação complementar')!
    expect(doc.professorSlugs).toEqual(['rafael-duarte', 'maria-souza'])
    const resina = dataset.classes.find((c) => c.title === 'Resina composta: composição e indicações')!
    expect(resina.professorSlugs).toEqual(['joao-silva'])
  })

  it('professor não cadastrado vira implícito e gera aviso', () => {
    const { dataset, report } = build()
    expect(dataset.professors.find((p) => p.slug === 'marcos-teixeira')).toMatchObject({ specialty: null })
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'professor_unregistered', tab: 'AULAS' }))
  })

  it('ordena aulas por data e horário, com período como fallback', () => {
    const { dataset } = build()
    const titles = dataset.classes.filter((c) => c.moduleNumber === 7).map((c) => c.title)
    expect(titles).toEqual([
      'Fundamentos do planejamento estético',
      'Fotografia e análise facial',
      'Planejamento digital',
      'Clínica',
      'Preparos para restaurações indiretas',
      'Provisórios e mock-up',
      'Discussão de casos',
    ])
  })

  it('módulo sem datas usa o mês previsto e aulas sem data', () => {
    const { dataset } = build()
    const m11 = dataset.modules.find((m) => m.number === 11)!
    expect(m11).toMatchObject({ startDate: null, month: '2028-02', status: 'a-confirmar' })
    expect(dataset.classes.filter((c) => c.moduleNumber === 11).every((c) => c.date === null)).toBe(true)
  })

  it('calcula material × estoque de forma centralizada', () => {
    const { dataset } = build()
    const resinaM5 = dataset.materials.find((m) => m.moduleNumber === 5 && m.name === 'Resina composta A2')!
    expect(resinaM5).toMatchObject({ required: 20, available: 8, missing: 12, status: 'atencao', category: 'Restauradores' })
    const pontas = dataset.materials.find((m) => m.moduleNumber === 7 && m.name === 'Ponta diamantada 4138')!
    expect(pontas).toMatchObject({ required: 30, available: 40, missing: 0, status: 'ok' })
  })

  it('status de estoque e módulos que usam cada item', () => {
    const { dataset } = build()
    const byName = Object.fromEntries(dataset.inventory.map((i) => [i.name, i]))
    expect(byName['Lençol de borracha']!.status).toBe('insuficiente')
    expect(byName['Espelho intraoral']!.status).toBe('baixo')
    expect(byName['Resina composta A2']!.moduleNumbers).toEqual([3, 5])
  })

  it('linha com campo opcional ilegível é mantida com aviso', () => {
    const { dataset, report } = build()
    const acido = dataset.materials.find((m) => m.name === 'Ácido fluorídrico 10%')!
    expect(acido.required).toBeNull()
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'field_invalid', tab: 'MATERIAIS POR MÓDULO', field: 'required' }))
  })

  it('linha com campo obrigatório inválido é descartada sem derrubar a aba', () => {
    const workbook = { ...demoWorkbook, AULAS: [...demoWorkbook.AULAS!, [null, 1, '01/01/2027', null, null, null, 'Sem módulo']] }
    const { dataset, report } = build(workbook)
    expect(dataset.classes.some((c) => c.title === 'Sem módulo')).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'row_invalid', tab: 'AULAS' }))
    expect(dataset.classes.length).toBeGreaterThan(30)
  })

  it('aba crítica ausente lança erro (para manter o último dado válido)', () => {
    const { AULAS: _removed, ...rest } = demoWorkbook
    expect(() => build(rest)).toThrow(CriticalDataError)
  })

  it('aba não crítica ausente só esvazia a seção', () => {
    const { ESTOQUE: _removed, ...rest } = demoWorkbook
    const { dataset, report } = build(rest)
    expect(dataset.inventory).toEqual([])
    expect(dataset.modules.length).toBe(11)
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'tab_missing', tab: 'ESTOQUE' }))
  })

  it('aponta datas fora do período do curso', () => {
    const workbook = {
      ...demoWorkbook,
      AULAS: [...demoWorkbook.AULAS!, [4, 3, '22/05/2026', null, null, null, 'Isolamento (data errada)']],
    }
    const { report } = build(workbook)
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'date_out_of_course', tab: 'AULAS', field: 'Data' }))
  })
})
