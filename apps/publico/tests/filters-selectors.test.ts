import { describe, expect, it } from 'vitest'
import { demoWorkbook } from '@fixtures/workbook'
import { buildFromWorkbook } from '@/server/data/pipeline/build'
import { activeFilters, evaluate, filtersToParams, parseFilters } from '@/lib/filters'
import { scheduleFilterDefs, scheduleItems } from '@/features/modules/scheduleFilters'
import {
  getNextModule,
  getProfessorParticipations,
  getUpcomingModules,
  groupClassesByDay,
} from '@/lib/domain/selectors'

const { dataset } = buildFromWorkbook(demoWorkbook, 'mock', new Date('2026-09-26T12:00:00Z'))

const defs = scheduleFilterDefs(dataset)
const items = scheduleItems(dataset)
const visibleModules = (state: Record<string, string>) =>
  evaluate(items, defs, state)
    .map((r, i) => (r.visible ? items[i]!.key : null))
    .filter(Boolean)
const listedClasses = (state: Record<string, string>) =>
  evaluate(items, defs, state).flatMap((r, i) => {
    const own = dataset.classes.filter((c) => c.moduleSlug === items[i]!.key)
    return own.filter((_, j) => r.subs[j])
  })

describe('filtros combinados', () => {
  it('lê a URL e ignora valores inválidos', () => {
    expect(parseFilters({ ano: '2027', professor: 'nao-existe', tema: '  cerâmica ', x: '1' }, defs)).toEqual({
      ano: '2027',
      tema: 'cerâmica',
    })
    expect(parseFilters(new URLSearchParams('ano=2027&tipo=hands-on'), defs)).toEqual({ ano: '2027', tipo: 'hands-on' })
  })

  it('sem filtros mostra todos os módulos e nenhuma aula listada', () => {
    expect(visibleModules({})).toHaveLength(dataset.modules.length)
    expect(listedClasses({})).toEqual([])
  })

  it('combina filtros com E lógico: 2027 + João', () => {
    const classes = listedClasses({ ano: '2027', professor: 'joao-silva' })
    expect(classes.length).toBeGreaterThan(5)
    expect(classes.every((c) => c.professorSlugs.includes('joao-silva') && c.moduleNumber <= 10)).toBe(true)
    expect(visibleModules({ ano: '2027', professor: 'joao-silva' })).not.toContain('11')
  })

  it('tema “cerâmica” (sem acento/maiúsculas) acha aulas e o módulo pelo tema', () => {
    expect(listedClasses({ tema: 'CERAMICA' }).map((c) => c.title)).toContain('Seleção de cerâmicas')
    expect(visibleModules({ tema: 'ceramicas' })).toContain('10')
  })

  it('tema do módulo + professor lista as aulas do professor naquele módulo', () => {
    const titles = listedClasses({ tema: 'reabilitação', professor: 'luisa-martins' }).map((c) => c.title)
    expect(titles).toEqual(['Clínica', 'Provisórios e mock-up', 'Discussão de casos'])
  })

  it('tipo de aula', () => {
    expect(listedClasses({ tipo: 'discussao-de-caso' }).map((c) => c.title)).toEqual(['Discussão de casos'])
  })

  it('gera parâmetros compartilháveis e rótulos dos chips', () => {
    const state = { ano: '2027', professor: 'joao-silva' }
    expect(filtersToParams(state, defs).toString()).toBe('ano=2027&professor=joao-silva')
    expect(activeFilters(defs, state).map((c) => c.valueLabel)).toEqual(['2027', 'João Silva'])
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
    expect(upcoming[0]?.module.slug).toBe('07')
    expect(upcoming[0]?.classes.map((c) => c.title)).toContain('Preparos para restaurações indiretas')
    expect(past[0]?.module.slug).toBe('06')
  })

  it('agrupa programação por dia, inclusive sem data', () => {
    const days = groupClassesByDay(dataset.classes.filter((c) => c.moduleSlug === '07'))
    expect(days.map((d) => d.label)).toEqual(['Quarta · 18 AGO', 'Quinta · 19 AGO', 'Sexta · 20 AGO'])
    const undated = groupClassesByDay(dataset.classes.filter((c) => c.moduleSlug === '11'))
    expect(undated[0]?.label).toBe('Dia 1 · data a confirmar')
  })
})
