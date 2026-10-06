/**
 * Datas civis ("2028-03-16"), sem fuso. Toda conta é feita em UTC para não depender do
 * fuso do servidor ou do navegador. "Hoje" vem de fora (servidor em America/Sao_Paulo;
 * na prévia, a data fictícia da demonstração).
 */
export type CivilDate = string

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function parts(date: CivilDate) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return { y, m, d }
}

function toUtc(date: CivilDate) {
  const { y, m, d } = parts(date)
  return Date.UTC(y, m - 1, d)
}

export function fromUtc(ms: number): CivilDate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromUtc(toUtc(date) + days * 86_400_000)
}

export function daysBetween(from: CivilDate, to: CivilDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

export function weekday(date: CivilDate): string {
  return WEEKDAYS[new Date(toUtc(date)).getUTCDay()]!
}

export function weekdayShort(date: CivilDate): string {
  return WEEKDAYS_SHORT[new Date(toUtc(date)).getUTCDay()]!
}

export function monthShort(date: CivilDate): string {
  return MONTHS[parts(date).m - 1]!
}

export function monthLong(date: CivilDate): string {
  return MONTHS_LONG[parts(date).m - 1]!
}

export function year(date: CivilDate): number {
  return parts(date).y
}

export function day(date: CivilDate): number {
  return parts(date).d
}

/** "16–18 mar 2028", "30 mar – 1 abr 2028", "16 mar 2028". */
export function formatRange(start: CivilDate, end: CivilDate, withYear = true): string {
  const a = parts(start)
  const b = parts(end)
  const y = withYear ? ` ${b.y}` : ''
  if (start === end) return `${a.d} ${MONTHS[a.m - 1]}${y}`
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]}${y}`
  return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}${y}`
}

/** "16/03" */
export function formatDayMonth(date: CivilDate): string {
  const { m, d } = parts(date)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** "sábado, 11 de março" */
export function formatLongDay(date: CivilDate): string {
  return `${weekday(date)}, ${day(date)} de ${monthLong(date)}`
}

/** "hoje", "amanhã", "em 5 dias", "há 3 dias" */
export function relativeDays(today: CivilDate, date: CivilDate): string {
  const n = daysBetween(today, date)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`
}

/** N-ésima quinta-feira do mês (os módulos acontecem de quinta a sábado). */
export function nthWeekdayOfMonth(y: number, month: number, weekdayIndex: number, n: number): CivilDate {
  const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay()
  const offset = (weekdayIndex - first + 7) % 7
  return fromUtc(Date.UTC(y, month - 1, 1 + offset + (n - 1) * 7))
}
