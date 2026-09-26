/**
 * Leitura por WHITELIST: localiza as colunas declaradas em config/sheets.ts pelo
 * nome do cabeçalho e devolve registros contendo SOMENTE essas colunas.
 * Colunas não declaradas (cachê, telefone, observações internas…) são descartadas aqui.
 */
import type { TabDef } from '@/config/sheets'
import type { CellValue } from '@/lib/normalize'
import { normalizeText } from '@/lib/text'
import type { DataIssue } from '../types'

export type RawRecord = { row: number; values: Record<string, CellValue> }

export type ReadResult =
  | { ok: true; records: RawRecord[]; issues: DataIssue[] }
  | { ok: false; issues: DataIssue[] }

export function readTab(def: TabDef, rows: CellValue[][] | null | undefined): ReadResult {
  if (!rows) {
    return { ok: false, issues: [{ severity: 'error', code: 'tab_missing', tab: def.name }] }
  }

  const headerIndex = def.headerRow - 1
  const header = rows[headerIndex] ?? []
  const positions = new Map<string, number>()
  header.forEach((cell, index) => {
    if (cell === null || cell === undefined) return
    const key = normalizeText(String(cell))
    if (key && !positions.has(key)) positions.set(key, index)
  })

  const issues: DataIssue[] = []
  const columnIndex: Record<string, number> = {}
  for (const [key, column] of Object.entries(def.columns)) {
    const found = column.headers.map((h) => positions.get(normalizeText(h))).find((i) => i !== undefined)
    if (found !== undefined) {
      columnIndex[key] = found
    } else {
      issues.push({
        severity: column.required ? 'error' : 'warning',
        code: 'column_missing',
        tab: def.name,
        field: column.headers[0],
      })
    }
  }
  if (issues.some((issue) => issue.severity === 'error')) return { ok: false, issues }

  const records: RawRecord[] = []
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const source = rows[i] ?? []
    const values: Record<string, CellValue> = {}
    let hasContent = false
    for (const key of Object.keys(def.columns)) {
      const index = columnIndex[key]
      const value = index === undefined ? null : (source[index] ?? null)
      values[key] = value
      if (value !== null && !(typeof value === 'string' && value.trim() === '')) hasContent = true
    }
    if (hasContent) records.push({ row: i + 1, values })
  }
  return { ok: true, records, issues }
}
