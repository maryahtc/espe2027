import { describe, expect, it } from 'vitest'
import { demoWorkbook } from '@fixtures/workbook'
import { buildFromWorkbook } from '@/server/data/pipeline/build'
import { activeFilters, applyFilters, hrefWith, parseFilters, textMatches, type FilterDef } from '@/lib/filters'
import {
  getNextModule,
  getProfessorParticipations,
  getUpcomingModules,
  groupClassesByDay,
  moduleYear,
} from '@/lib/domain/selectors'
import type { PublicClass } from '@/schemas/public'

const { dataset } = buildFromWorkbook(demoWorkbook, 'mock', new Date('2026-09-26T12:00:00Z'))

const defs: FilterDef[] = [
  { param: 'ano', label: 'Ano', kind: 'select', options: [{ value: '2027', label: '2027' }, { value: '2028', label: '2028' }] },
  { param: 'professor', label: 'Professor', kind: 'select', options: dataset.professors.map((p) => ({ value: p.slug, label: p.name })) },
  { param: 'tema', label: 'Tema', kind: 'text' },
]

describe('filtros combinados', () => {
  it('lê a URL e ignora valores inválidos', () => {
    expect(parseFilters({ ano: '2027', professor: 'nao-existe', tema: '  cerâmica ', x: '1' }, defs)).toEqual({
      ano: '2027',
      tema: 'cerâmica',
    })
  })

  it('combina filtros com E lógico: 2027 + João', () => {
    const state = parseFilters({ ano: '2027', professor: 'joao-silva' }, defs)
    const moduleYearOf = (c: PublicClass) => moduleYear(dataset.modules.find((m) => m.number === c.moduleNumber)!)
    const result = applyFilters(dataset.classes, state, {
      ano: (c, v) => String(moduleYearOf(c)) === v,
      professor: (c, v) => c.professorSlugs.includes(v),
    })
    expect(result.length).toBeGreaterThan(5)
    expect(result.every((c) => c.professorSlugs.includes('joao-silva') && moduleYearOf(c) === 2027)).toBe(true)
  })

  it('tema contém “cerâmica” (sem acento/maiúsculas)', () => {
    const result = applyFilters(dataset.classes, { tema: 'CERAMICA' }, { tema: (c, v) => textMatches(v, c.title, c.description) })
    expect(result.map((c) => c.title)).toContain('Seleção de cerâmicas')
  })

  it('gera links compartilháveis e chips removíveis', () => {
    const state = { ano: '2027', professor: 'joao-silva' }
    expect(hrefWith('/cronograma', state)).toBe('/cronograma?ano=2027&professor=joao-silva')
    const chips = activeFilters('/cronograma', defs, state)
    expect(chips.map((c) => c.valueLabel)).toEqual(['2027', 'João Silva'])
    expect(chips[1]!.removeHref).toBe('/cronograma?ano=2027')
  })
})

describe('seletores de datas', () => {
  it('antes do curso, o próximo módulo é o 01', () => {
    expect(getNextModule(dataset, '2026-09-26')?.number).toBe(1)
    expect(getUpcomingModules(dataset, '2026-09-26', 3).map((m) => m.number)).toEqual([2, 3, 4])
  })

  it('durante um módulo, ele continua sendo o "próximo"', () => {
    expect(getNextModule(dataset, '2027-08-19')?.number).toBe(7)
    expect(getNextModule(dataset, '2027-08-21')?.number).toBe(8)
  })

  it('módulo só com mês previsto entra depois dos datados', () => {
    expect(getNextModule(dataset, '2027-12-01')?.number).toBe(11)
    expect(getNextModule(dataset, '2028-12-01')).toBeNull()
  })

  it('participações do professor: futuras primeiro, passadas depois', () => {
    const { upcoming, past } = getProfessorParticipations(dataset, 'joao-silva', '2027-08-01')
    expect(upcoming[0]?.module.number).toBe(7)
    expect(upcoming[0]?.classes.map((c) => c.title)).toContain('Preparos para restaurações indiretas')
    expect(past[0]?.module.number).toBe(6)
  })

  it('agrupa programação por dia, inclusive sem data', () => {
    const days = groupClassesByDay(dataset.classes.filter((c) => c.moduleNumber === 7))
    expect(days.map((d) => d.label)).toEqual(['Quarta · 18 AGO', 'Quinta · 19 AGO', 'Sexta · 20 AGO'])
    const undated = groupClassesByDay(dataset.classes.filter((c) => c.moduleNumber === 11))
    expect(undated[0]?.label).toBe('Dia 1 · data a definir')
  })
})
