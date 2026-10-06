/**
 * Datas "civis" (sem fuso horário) no formato ISO "YYYY-MM-DD" e horários "HH:mm".
 *
 * Nada aqui depende do fuso do navegador ou do servidor: toda aritmética usa UTC
 * sobre datas civis, e "hoje" é calculado explicitamente em America/Sao_Paulo.
 */
import { siteConfig } from '@/config/site'

export type ISODate = string // "2027-08-19"
export type ClockTime = string // "14:00"

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isValidCivilDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function toISO(y: number, m: number, d: number): ISODate | null {
  return isValidCivilDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null
}

export function isISODate(value: string): boolean {
  const match = ISO_RE.exec(value)
  return !!match && isValidCivilDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

/** Número serial do Google Sheets/Excel (dias desde 30/12/1899) → ISO. */
export function serialToISODate(serial: number): ISODate | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000
  const date = new Date(ms)
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/**
 * Aceita: número serial, "19/08/2027", "19/8/27", "19-08-2027", "19.08.2027",
 * "2027-08-19" (e com horário depois). Sempre DD/MM (padrão brasileiro).
 */
export function parseDate(value: unknown): ISODate | null {
  if (typeof value === 'number') return serialToISODate(value)
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text)
  if (iso) return toISO(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(text)
  if (br) {
    let year = Number(br[3])
    if (br[3]!.length === 2) year += 2000
    return toISO(year, Number(br[2]), Number(br[1]))
  }
  return null
}

/**
 * Aceita: fração de dia (0.5833 = 14:00), "14:00", "14:00:00", "8:00", "14h", "14h30", "14H30".
 */
export function parseTime(value: unknown): ClockTime | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null
    const minutes = Math.round((value % 1) * 24 * 60)
    return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
  }
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2})\s*(?::|h)\s*(\d{2})?(?::\d{2})?\s*(?:h|hs|min)?$/i.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = match[2] ? Number(match[2]) : 0
  if (h > 23 || m > 59) return null
  return `${pad(h)}:${pad(m)}`
}

export type MonthValue = string // "2027-06" (mês e ano) ou "--06" (só o mês, ano não informado)

function monthFromName(word: string): number | null {
  const key = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3).toUpperCase()
  const index = MONTHS_SHORT.indexOf(key)
  return index >= 0 ? index + 1 : null
}

/**
 * "06/2027", "2027-06", "jun/2027", "Junho 2027", data completa → "2027-06".
 * Só o nome do mês ("MAI", "fev (11.12.13)") → "--05": o ano NÃO é deduzido.
 */
export function parseMonth(value: unknown): MonthValue | null {
  if (typeof value === 'number') return parseDate(value)?.slice(0, 7) ?? null
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  const full = parseDate(text)
  if (full) return full.slice(0, 7)

  const numeric = /^(\d{1,2})[/.-](\d{4})$/.exec(text) ?? null
  if (numeric) {
    const m = Number(numeric[1])
    return m >= 1 && m <= 12 ? `${numeric[2]}-${pad(m)}` : null
  }
  const isoMonth = /^(\d{4})-(\d{1,2})$/.exec(text)
  if (isoMonth) {
    const m = Number(isoMonth[2])
    return m >= 1 && m <= 12 ? `${isoMonth[1]}-${pad(m)}` : null
  }
  const named = /^([a-zA-ZçÇ]+)\.?\s*(?:\/|de|-)?\s*(\d{4})$/.exec(text)
  if (named) {
    const m = monthFromName(named[1]!)
    return m ? `${named[2]}-${pad(m)}` : null
  }
  const onlyName = /^([a-zA-ZçÇ]{3,})\.?(?:\s|\(|$)/.exec(text)
  if (onlyName) {
    const m = monthFromName(onlyName[1]!)
    return m ? `--${pad(m)}` : null
  }
  return null
}

export function monthHasYear(month: MonthValue): boolean {
  return /^\d{4}-\d{2}$/.test(month)
}

function monthNumber(month: MonthValue): number {
  return Number(month.slice(-2))
}

function parts(date: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return { y, m, d }
}

/** "Hoje" no fuso da especialização, independentemente do servidor. */
export function todayISO(now: Date = new Date()): ISODate {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: siteConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function yearOf(date: ISODate): number {
  return parts(date).y
}

export function weekdayOf(date: ISODate): string {
  const { y, m, d } = parts(date)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!
}

/** "19 AGO" */
export function formatDayMonth(date: ISODate): string {
  const { m, d } = parts(date)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

/** "19 AGO 2027" */
export function formatDate(date: ISODate): string {
  const { y } = parts(date)
  return `${formatDayMonth(date)} ${y}`
}

/** "19/08/2027" */
export function formatNumericDate(date: ISODate): string {
  const { y, m, d } = parts(date)
  return `${pad(d)}/${pad(m)}/${y}`
}

/** "QUINTA · 19 AGO" (caixa alta aplicada via CSS quando necessário) */
export function formatWeekdayDate(date: ISODate): string {
  return `${weekdayOf(date)} · ${formatDayMonth(date)}`
}

/** "18–20 AGO 2027", "30 MAI – 1 JUN 2027", "30 DEZ 2027 – 2 JAN 2028" */
export function formatDateRange(start: ISODate, end: ISODate | null): string {
  if (!end || end === start) return formatDate(start)
  const a = parts(start)
  const b = parts(end)
  if (a.y !== b.y) return `${formatDate(start)} – ${formatDate(end)}`
  if (a.m !== b.m) return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${b.y}`
  return `${a.d}–${b.d} ${MONTHS_SHORT[a.m - 1]} ${a.y}`
}

/** "2027-08" → "Agosto 2027"; "--08" → "Agosto" (ano não informado) */
export function formatMonthYear(month: MonthValue): string {
  const name = MONTHS_LONG[monthNumber(month) - 1] ?? ''
  return monthHasYear(month) ? `${name} ${month.slice(0, 4)}` : name
}

/** "2027-08" / "--08" → "AGO" */
export function formatMonthShort(month: MonthValue): string {
  return MONTHS_SHORT[monthNumber(month) - 1] ?? ''
}

/** "14:00–18:00" / "14:00" / null */
export function formatTimeRange(start: ClockTime | null, end: ClockTime | null): string | null {
  if (start && end) return `${start}–${end}`
  return start ?? null
}

export function compareISO(a: ISODate | null, b: ISODate | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}
