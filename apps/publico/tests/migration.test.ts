/**
 * A prévia usa a grade atual da planilha convertida SEM deduções.
 * Estes testes garantem que nada foi completado, corrigido ou renumerado.
 */
import { describe, expect, it } from 'vitest'
import { PRIVATE_SENTINEL } from '@fixtures/workbook'
import { buildFromWorkbook } from '@/server/data/pipeline/build'
import { readPreviewWorkbook } from '@/server/data/source/preview'

const { dataset, report } = buildFromWorkbook(readPreviewWorkbook(), 'preview', new Date('2026-09-28T12:00:00Z'))
const bySlug = (slug: string) => dataset.modules.find((m) => m.slug === slug)!
const classesOf = (slug: string) => dataset.classes.filter((c) => c.moduleSlug === slug)

describe('prévia com a grade atual (planilha soberana)', () => {
  it('não gera erros de linha', () => {
    expect(report.issues.filter((i) => i.severity === 'error')).toEqual([])
  })

  it('não renumera: o número 9 repetido vira dois módulos sinalizados', () => {
    expect(dataset.modules.map((m) => m.slug)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '09-2'])
    expect(bySlug('09')).toMatchObject({ number: 9, month: '--10', notices: ['numero-repetido'] })
    expect(bySlug('09-2')).toMatchObject({ number: 9, month: '--11', notices: ['numero-repetido'] })
    expect(classesOf('09').map((c) => c.title)).toEqual(['Pino e', 'CLINICA'])
    expect(classesOf('09-2').map((c) => c.title)).toEqual(['CLINICA'])
  })

  it('módulo 4: não deduz datas e mantém 22/05/2026 sinalizada', () => {
    expect(bySlug('04')).toMatchObject({ startDate: null, endDate: null, month: '--05' })
    const isolamento = classesOf('04').find((c) => c.title === 'isolamento absoluto')!
    expect(isolamento).toMatchObject({ date: '2026-05-22', notices: ['data-inconsistente'] })
    expect(classesOf('04').filter((c) => c.day !== 3).every((c) => c.date === null)).toBe(true)
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'date_out_of_course', tab: 'AULAS' }))
  })

  it('não inventa temas nem ano para módulos sem data', () => {
    expect(dataset.modules.every((m) => m.title === null)).toBe(true)
    expect(bySlug('07')).toMatchObject({ startDate: null, month: '--08' })
    expect(bySlug('01')).toMatchObject({ startDate: '2027-02-11', endDate: '2027-02-13' })
  })

  it('mantém textos incompletos como estão, marcados "a confirmar"', () => {
    expect(classesOf('09').find((c) => c.title === 'Pino e')).toMatchObject({ status: 'a-confirmar' })
  })

  it('nomes de professores aparecem como estão na planilha', () => {
    const names = dataset.professors.map((p) => p.name)
    expect(names).toContain('CALAMITA')
    expect(names).toContain('Gi Borelli')
    expect(classesOf('03')[0]!.professorSlugs).toEqual(['calamita'])
    expect(report.issues.some((i) => i.code === 'professor_unregistered')).toBe(false)
  })

  it('equipamentos reais sem quantidade aparecem como "sem dados"; colunas internas não vazam', () => {
    expect(dataset.equipment.map((e) => [e.name, e.status])).toEqual([
      ['Microscópio', 'sem-dados'],
      ['Mocho', 'sem-dados'],
    ])
    const json = JSON.stringify(dataset)
    for (const internal of ['Victor / Thiago', 'Mapear', 'Ricardo', 'Luciano', 'Verificar']) expect(json).not.toContain(internal)
    expect(json).not.toMatch(PRIVATE_SENTINEL)
  })
})
