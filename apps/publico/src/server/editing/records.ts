/**
 * Leitura para a área de edição: localiza colunas e linhas na planilha (sem cache)
 * e devolve somente os campos editáveis — nunca colunas internas.
 */
import 'server-only'
import { createHash } from 'node:crypto'
import { ID_HEADER, type EntityDef } from '@/config/editing'
import { SHEET_TABS } from '@/config/sheets'
import type { CellValue } from '@/lib/normalize'
import { normalizeText } from '@/lib/text'
import type { SheetWriter } from '@/server/data/write/types'
import { cellToInput } from './format'

export type Table = {
  tabName: string
  rows: CellValue[][] | null
  /** Coluna (1-based) de cada campo editável; undefined = coluna ainda não existe. */
  columns: Record<string, number | undefined>
  idColumn: number | undefined
  headerLength: number
}

export type EditorRecord = {
  ref: string
  id: string | null
  row: number
  values: Record<string, string>
  version: string
}

export function headersOf(entity: EntityDef, key: string): readonly string[] {
  const columns = SHEET_TABS[entity.tab].columns as Record<string, { headers: readonly string[] }>
  return columns[key]!.headers
}

export async function loadTable(writer: SheetWriter, entity: EntityDef): Promise<Table> {
  const tabName = SHEET_TABS[entity.tab].name
  const rows = await writer.readTab(tabName)
  const header = (rows?.[0] ?? []).map((h) => normalizeText(String(h ?? '')))
  const find = (names: readonly string[]) => {
    for (const name of names) {
      const i = header.indexOf(normalizeText(name))
      if (i >= 0) return i + 1
    }
    return undefined
  }
  return {
    tabName,
    rows,
    columns: Object.fromEntries(entity.fields.map((f) => [f.key, find(headersOf(entity, f.key))])),
    idColumn: find([ID_HEADER]),
    headerLength: rows?.[0]?.length ?? 0,
  }
}

export function cellAt(table: Table, row: number, col: number | undefined): CellValue {
  if (!col || !table.rows) return null
  return table.rows[row - 1]?.[col - 1] ?? null
}

function valuesOf(entity: EntityDef, table: Table, row: number): Record<string, string> {
  return Object.fromEntries(entity.fields.map((f) => [f.key, cellToInput(f, cellAt(table, row, table.columns[f.key]))]))
}

export function versionOf(id: string | null, values: Record<string, string>): string {
  return createHash('sha256').update(JSON.stringify([id, values])).digest('hex').slice(0, 16)
}

function recordAt(entity: EntityDef, table: Table, row: number): EditorRecord | null {
  const values = valuesOf(entity, table, row)
  const idCell = cellAt(table, row, table.idColumn)
  const id = idCell !== null && String(idCell).trim() ? String(idCell).trim() : null
  if (!id && Object.values(values).every((v) => v === '')) return null
  return { ref: id ? `id-${id}` : `linha-${row}`, id, row, values, version: versionOf(id, values) }
}

export function listRecords(entity: EntityDef, table: Table): EditorRecord[] {
  if (!table.rows) return []
  const out: EditorRecord[] = []
  for (let row = 2; row <= table.rows.length; row++) {
    const record = recordAt(entity, table, row)
    if (record) out.push(record)
  }
  return out
}

export const REF_PATTERN = /^(id-[A-Za-z0-9-]{1,40}|linha-\d{1,6})$/

export function findRecord(entity: EntityDef, table: Table, ref: string): EditorRecord | null {
  if (!REF_PATTERN.test(ref) || !table.rows) return null
  if (ref.startsWith('linha-')) return recordAt(entity, table, Number(ref.slice(6)))
  const id = ref.slice(3)
  for (let row = 2; row <= table.rows.length; row++) {
    if (String(cellAt(table, row, table.idColumn) ?? '').trim() === id) return recordAt(entity, table, row)
  }
  return null
}
