/**
 * Validação linha a linha. Uma linha ruim nunca derruba a aba:
 *  - campo obrigatório inválido → linha descartada (erro no relatório);
 *  - campo opcional inválido    → campo vira null (aviso no relatório).
 */
import type { z } from 'zod'
import type { DataIssue } from '../types'
import type { RawRecord } from './read'

export type Parsed<T> = T & { row: number }

export function parseRecords<S extends z.ZodObject>(
  schema: S,
  records: RawRecord[],
  requiredFields: readonly string[],
  tab: string,
): { rows: Parsed<z.infer<S>>[]; issues: DataIssue[] } {
  const rows: Parsed<z.infer<S>>[] = []
  const issues: DataIssue[] = []

  for (const record of records) {
    let input = record.values
    let result = schema.safeParse(input)

    if (!result.success) {
      const failed = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? '')))]
      const hardFailures = failed.filter((field) => requiredFields.includes(field))
      if (hardFailures.length > 0) {
        issues.push({ severity: 'error', code: 'row_invalid', tab, row: record.row, field: hardFailures.join(', ') })
        continue
      }
      input = { ...input }
      for (const field of failed) {
        input[field] = null
        issues.push({ severity: 'warning', code: 'field_invalid', tab, row: record.row, field })
      }
      result = schema.safeParse(input)
      if (!result.success) {
        issues.push({ severity: 'error', code: 'row_invalid', tab, row: record.row })
        continue
      }
    }
    rows.push({ ...(result.data as z.infer<S>), row: record.row })
  }
  return { rows, issues }
}
