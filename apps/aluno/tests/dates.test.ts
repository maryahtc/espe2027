import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  formatLongDay,
  formatRange,
  nthWeekdayOfMonth,
  relativeDays,
  weekdayShort,
} from '@/lib/dates'

describe('datas civis', () => {
  it('formata intervalos no mesmo mês, entre meses e de um dia', () => {
    expect(formatRange('2028-03-16', '2028-03-18')).toBe('16–18 mar 2028')
    expect(formatRange('2028-03-30', '2028-04-01')).toBe('30 mar – 1 abr 2028')
    expect(formatRange('2028-03-16', '2028-03-16', false)).toBe('16 mar')
  })
  it('calcula distâncias e textos relativos', () => {
    expect(daysBetween('2028-03-11', '2028-03-16')).toBe(5)
    expect(relativeDays('2028-03-11', '2028-03-16')).toBe('em 5 dias')
    expect(relativeDays('2028-03-11', '2028-03-12')).toBe('amanhã')
    expect(relativeDays('2028-03-11', '2028-03-08')).toBe('há 3 dias')
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01')
  })
  it('nomeia dias da semana sem depender do fuso', () => {
    expect(weekdayShort('2028-03-16')).toBe('qui')
    expect(formatLongDay('2028-03-11')).toBe('sábado, 11 de março')
  })
  it('encontra a terceira quinta-feira do mês', () => {
    expect(nthWeekdayOfMonth(2028, 3, 4, 3)).toBe('2028-03-16')
    expect(nthWeekdayOfMonth(2027, 2, 4, 3)).toBe('2027-02-18')
  })
})
