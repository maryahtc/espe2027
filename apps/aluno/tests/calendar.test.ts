import { describe, expect, it } from 'vitest'
import { eachDay, monthGrid, monthRange, shiftMonth } from '@/lib/calendar'

describe('calendário', () => {
  it('monta semanas de segunda a domingo cobrindo o mês', () => {
    const weeks = monthGrid('2028-03') // 1º de março de 2028 é quarta
    expect(weeks[0]!.map((c) => c.date)[0]).toBe('2028-02-28')
    expect(weeks[0]![2]).toEqual({ date: '2028-03-01', inMonth: true })
    expect(weeks.at(-1)!.at(-1)!.date).toBe('2028-04-02')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
  it('navega entre meses e lista intervalos', () => {
    expect(shiftMonth('2027-12', 1)).toBe('2028-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(monthRange('2027-11', '2028-02')).toEqual(['2027-11', '2027-12', '2028-01', '2028-02'])
    expect(eachDay('2028-03-30', '2028-04-01')).toEqual(['2028-03-30', '2028-03-31', '2028-04-01'])
  })
})
