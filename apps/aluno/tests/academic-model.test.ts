import { describe, expect, it } from 'vitest'
import { assignStates, courseMonth, datesChangedRecently, focusModule, inDefinition, moduleLabel, sessionTime, type ModuleState } from '@/lib/academic/model'

const mk = (start: string | null, end: string | null) => ({ start, end, state: 'upcoming' as ModuleState })

describe('estados dos módulos', () => {
  it('antes do curso: todos futuros e o primeiro é o próximo', () => {
    const ms = assignStates([mk('2027-02-11', '2027-02-13'), mk('2027-03-18', '2027-03-20')], '2026-10-07')
    expect(ms.map((m) => m.state)).toEqual(['next', 'upcoming'])
  })
  it('durante um módulo: em andamento, e nenhum outro é "próximo"', () => {
    const ms = assignStates([mk('2027-02-11', '2027-02-13'), mk('2027-03-18', '2027-03-20')], '2027-02-12')
    expect(ms.map((m) => m.state)).toEqual(['ongoing', 'upcoming'])
    expect(focusModule(ms)).toBe(ms[0])
  })
  it('depois: concluído; sem datas: sem data', () => {
    const ms = assignStates([mk('2027-02-11', '2027-02-13'), mk('2027-03-18', '2027-03-20'), mk(null, null)], '2027-02-20')
    expect(ms.map((m) => m.state)).toEqual(['done', 'next', 'undated'])
  })
  it('o próximo é o de data mais cedo, mesmo fora de ordem', () => {
    const ms = assignStates([mk('2027-05-20', '2027-05-22'), mk('2027-04-22', '2027-04-24')], '2027-03-01')
    expect(ms.map((m) => m.state)).toEqual(['upcoming', 'next'])
  })
})

describe('mês do curso', () => {
  const turma = { startsOn: '2027-02-01', endsOn: '2029-07-31' }
  it('30 meses, de fevereiro/2027 a julho/2029', () => {
    expect(courseMonth(turma, '2027-02-15')).toEqual({ current: 1, total: 30 })
    expect(courseMonth(turma, '2029-07-01')).toEqual({ current: 30, total: 30 })
  })
  it('antes do início: 0; depois do fim: limitado ao total', () => {
    expect(courseMonth(turma, '2026-10-07').current).toBe(0)
    expect(courseMonth(turma, '2030-01-01').current).toBe(30)
  })
})

describe('selos e rótulos', () => {
  it('programação em definição quando falta dia ou atividade', () => {
    expect(inDefinition({ days: [] })).toBe(true)
    expect(inDefinition({ days: [{ sessions: [1] }, { sessions: [] }] })).toBe(true)
    expect(inDefinition({ days: [{ sessions: [1] }] })).toBe(false)
  })
  it('"data alterada" só nos últimos 30 dias', () => {
    expect(datesChangedRecently('2027-01-20T12:00:00Z', '2027-02-01')).toBe(true)
    expect(datesChangedRecently('2026-12-01T12:00:00Z', '2027-02-01')).toBe(false)
    expect(datesChangedRecently(null, '2027-02-01')).toBe(false)
  })
  it('horário: exato quando houver, senão o turno', () => {
    expect(sessionTime({ startsAt: '08:30:00', endsAt: '12:00:00', period: 'manha' })).toBe('08:30–12:00')
    expect(sessionTime({ startsAt: null, endsAt: null, period: 'noite' })).toBe('Noite')
    expect(moduleLabel(3)).toBe('03')
    expect(moduleLabel(null)).toBe('—')
  })
})
