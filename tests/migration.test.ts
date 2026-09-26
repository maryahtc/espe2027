/**
 * Garante que os CSVs de migração (grade antiga → formato novo) passam pelo
 * pipeline do portal sem erros e produzem o que esperamos.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildFromWorkbook } from '@/server/data/pipeline/build'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') endField()
    else if (ch === '\n') endRow()
    else if (ch !== '\r') field += ch
  }
  if (field || row.length) endRow()
  return rows
}

const read = (name: string) => parseCsv(readFileSync(new URL(`../docs/migracao/${name}`, import.meta.url), 'utf8'))

describe('migração da grade antiga', () => {
  const { dataset, report } = buildFromWorkbook(
    { 'MÓDULOS': read('MODULOS.csv'), AULAS: read('AULAS.csv'), PROFESSORES: read('PROFESSORES_novas_colunas.csv') },
    'mock',
  )

  it('não gera erros de linha', () => {
    expect(report.issues.filter((i) => i.severity === 'error' && i.code !== 'tab_missing')).toEqual([])
  })

  it('publica os 10 módulos e esconde o tema incompleto', () => {
    expect(dataset.modules.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(dataset.classes.some((c) => c.title.startsWith('Pino'))).toBe(false)
  })

  it('vincula os professores pelo nome curto', () => {
    const m2 = dataset.classes.filter((c) => c.moduleNumber === 2).map((c) => c.professorSlugs[0])
    expect(m2).toEqual(['caio', 'thiago', 'thiago', 'clecila', 'clecila'])
    expect(report.issues.some((i) => i.code === 'professor_unregistered')).toBe(false)
  })

  it('módulos sem data aparecem pelo mês previsto', () => {
    expect(dataset.modules.find((m) => m.number === 7)).toMatchObject({ startDate: null, month: '2027-08' })
  })
})
