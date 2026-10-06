/**
 * Grade de calendário mensal (semana começando na segunda-feira), em datas civis.
 */
import { addDays, type CivilDate, fromUtc } from './dates'

export type MonthKey = string // "2028-03"

export function monthKey(date: CivilDate): MonthKey {
  return date.slice(0, 7)
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return fromUtc(d.getTime()).slice(0, 7)
}

/** Lista de meses de `from` até `to`, inclusive. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let k = from; k <= to; k = shiftMonth(k, 1)) out.push(k)
  return out
}

export type CalendarCell = { date: CivilDate; inMonth: boolean }

/** Semanas completas (segunda a domingo) que cobrem o mês. */
export function monthGrid(key: MonthKey): CalendarCell[][] {
  const first = `${key}-01`
  const firstWeekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7 // 0 = segunda
  let cursor = addDays(first, -firstWeekday)
  const weeks: CalendarCell[][] = []
  do {
    const week: CalendarCell[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ date: cursor, inMonth: monthKey(cursor) === key })
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  } while (monthKey(cursor) === key)
  return weeks
}

/** Todas as datas de start a end, inclusive. */
export function eachDay(start: CivilDate, end: CivilDate): CivilDate[] {
  const out: CivilDate[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}
