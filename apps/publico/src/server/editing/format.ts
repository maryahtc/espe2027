/**
 * Conversão entre células da planilha e campos de formulário.
 *   cellToInput: o que a pessoa vê no formulário (fiel ao que está na planilha)
 *   inputToCell: o que é gravado (validado; nada é completado ou corrigido)
 */
import type { FieldDef } from '@/config/editing'
import { parseDate, parseMonth, parseTime, serialToISODate } from '@/lib/dates'
import { moduleNumbers, nameList, number, INVALID, type CellValue } from '@/lib/normalize'
import { cleanInline, normalizeText } from '@/lib/text'

function isoToBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function numberToText(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

export function cellToInput(field: FieldDef, value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    if (field.kind === 'date') return serialToISODate(value) ? isoToBr(serialToISODate(value)!) : String(value)
    if (field.kind === 'time') return parseTime(value) ?? String(value)
    return numberToText(value)
  }
  if (typeof value === 'boolean') return value ? 'VERDADEIRO' : 'FALSO'
  const text = value.replace(/\r\n/g, '\n').trim()
  // Datas legíveis aparecem sempre como DD/MM/AAAA; texto que não é data aparece como está.
  if (field.kind === 'date') {
    const iso = parseDate(text)
    if (iso) return isoToBr(iso)
  }
  return text
}

export type CellResult = { ok: true; value: CellValue } | { ok: false; error: string }

/** Impede que um texto seja interpretado como fórmula pela planilha. */
export function protectText(text: string): string {
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

export function inputToCell(field: FieldDef, raw: string): CellResult {
  const text = field.kind === 'textarea' ? raw.replace(/\r\n/g, '\n').trim() : cleanInline(raw)
  if (!text) return field.required ? { ok: false, error: 'Campo obrigatório.' } : { ok: true, value: '' }

  switch (field.kind) {
    case 'date': {
      const iso = parseDate(text)
      // ISO (AAAA-MM-DD) é reconhecido como data pela planilha em qualquer idioma.
      return iso ? { ok: true, value: iso } : { ok: false, error: 'Use o formato DD/MM/AAAA.' }
    }
    case 'time': {
      const time = parseTime(text)
      return time ? { ok: true, value: time } : { ok: false, error: 'Use o formato HH:MM (ex.: 14:00).' }
    }
    case 'number': {
      const n = number(text)
      return n === INVALID || n === null ? { ok: false, error: 'Informe um número.' } : { ok: true, value: n }
    }
    case 'month':
      return parseMonth(text) ? { ok: true, value: protectText(text) } : { ok: false, error: 'Use, por exemplo, ago/2027 ou AGO.' }
    case 'modules': {
      const list = moduleNumbers(text)
      return list === INVALID || list.length === 0
        ? { ok: false, error: 'Informe números de módulos separados por vírgula.' }
        : { ok: true, value: list.join(', ') }
    }
    default:
      return { ok: true, value: protectText(text) }
  }
}

/** Duas listas de professores são iguais se tiverem os mesmos nomes (ignorando ordem e separador). */
export function sameNames(a: string, b: string): boolean {
  const key = (s: string) =>
    nameList(s)
      .map((n) => normalizeText(n))
      .sort()
      .join('|')
  return key(a) === key(b)
}
