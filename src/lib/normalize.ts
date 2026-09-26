/**
 * Normalizadores de células da planilha. Cada função recebe o valor bruto
 * (string | number | boolean | null) e devolve:
 *   - null      → célula vazia
 *   - valor     → valor normalizado
 *   - INVALID   → valor presente mas ilegível (o schema transforma isso em erro)
 */
import { cleanInline, cleanMultiline, normalizeText } from '@/lib/text'
import { parseDate, parseMonth, parseTime } from '@/lib/dates'

export type CellValue = string | number | boolean | null | undefined

export const INVALID = Symbol('invalid')
export type Invalid = typeof INVALID

function isEmpty(value: CellValue): value is null | undefined | '' {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

export function text(value: CellValue): string | null {
  if (isEmpty(value)) return null
  const result = cleanInline(String(value))
  return result || null
}

export function multilineText(value: CellValue): string | null {
  if (isEmpty(value)) return null
  const result = cleanMultiline(String(value))
  return result || null
}

/** Números em formato brasileiro ou não: "1.234,5", "20", "20 un", 20. */
export function number(value: CellValue): number | null | Invalid {
  if (isEmpty(value)) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : INVALID
  if (typeof value === 'boolean') return INVALID
  const match = /^-?[\d.,]+/.exec(value.trim())
  if (!match) return INVALID
  let raw = match[0]
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '')
  const n = Number(raw)
  return Number.isFinite(n) ? n : INVALID
}

/** "Módulo 05", "M5", "05", 5 → 5 */
export function moduleNumber(value: CellValue): number | null | Invalid {
  if (isEmpty(value)) return null
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : INVALID
  const match = /(\d{1,3})/.exec(String(value))
  if (!match) return INVALID
  const n = Number(match[1])
  return n > 0 ? n : INVALID
}

/** "4, 5", "4 e 5", "Módulos 4/5" → [4, 5]. */
export function moduleNumbers(value: CellValue): number[] | Invalid {
  if (isEmpty(value)) return []
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? [value] : INVALID
  const found = String(value).match(/\d{1,3}/g)
  if (!found) return INVALID
  return [...new Set(found.map(Number).filter((n) => n > 0))].sort((a, b) => a - b)
}

export function date(value: CellValue): string | null | Invalid {
  if (isEmpty(value)) return null
  return parseDate(value) ?? INVALID
}

export function month(value: CellValue): string | null | Invalid {
  if (isEmpty(value)) return null
  return parseMonth(value) ?? INVALID
}

export function time(value: CellValue): string | null | Invalid {
  if (isEmpty(value)) return null
  return parseTime(value) ?? INVALID
}

/**
 * Lista de nomes: "Maryah e Victor e Elber", "João; Maria", "João / Maria",
 * "João + Maria", "Prof. João, Dra. Maria", uma pessoa por linha.
 */
export function nameList(value: CellValue): string[] {
  if (isEmpty(value)) return []
  return String(value)
    .split(/\s*(?:[,;/+&\n]|\s+e\s+)\s*/i)
    .map((name) => cleanInline(name.replace(/^(prof(a|essora|essor)?|dr(a)?)\.?\s+/i, '')))
    .filter(Boolean)
}

/** Mapeia texto livre para uma chave de vocabulário controlado (via aliases). */
export function vocab<K extends string>(
  value: CellValue,
  table: Record<K, { aliases: readonly string[] }>,
): K | null | Invalid {
  if (isEmpty(value)) return null
  const key = normalizeText(String(value))
  for (const [k, def] of Object.entries(table) as [K, { aliases: readonly string[] }][]) {
    if (k === key || def.aliases.includes(key)) return k
  }
  return INVALID
}
