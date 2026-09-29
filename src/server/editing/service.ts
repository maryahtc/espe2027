/**
 * Criação, edição e remoção de registros na planilha.
 *
 * Regras (a planilha é soberana):
 *  - só campos editáveis declarados em config/editing.ts são gravados;
 *  - só o que a pessoa ALTEROU é gravado — campos intocados ficam exatamente como estão;
 *  - se a linha mudou na planilha desde que o formulário foi aberto, nada é gravado (conflito);
 *  - toda gravação é registrada na aba HISTÓRICO (quem, quando, o quê).
 */
import 'server-only'
import { randomBytes } from 'node:crypto'
import { HISTORY_HEADER, HISTORY_TAB, ID_HEADER, type EditorRole, type EntityDef, type FieldDef } from '@/config/editing'
import { siteConfig } from '@/config/site'
import { todayISO } from '@/lib/dates'
import type { CellValue } from '@/lib/normalize'
import type { CellWrite, SheetWriter } from '@/server/data/write/types'
import { inputToCell, protectText, sameNames } from './format'
import { cellAt, findRecord, headersOf, loadTable, type Table } from './records'

export type Editor = { email: string; role: EditorRole }

/** Valores vindos do formulário: um texto por campo ("professors" já combinado). */
export type FormValues = Record<string, string>

export type SaveResult =
  | { ok: true; ref: string; message: string }
  | { ok: false; message: string; errors?: Record<string, string> }

const CONFLICT = 'Esta linha foi alterada na planilha depois que você abriu o formulário. Recarregue a página e tente de novo.'
const NOT_FOUND = 'Registro não encontrado. Ele pode ter sido removido da planilha.'

function newId(entity: EntityDef): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = randomBytes(6)
  return `${entity.idPrefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`
}

function changed(field: FieldDef, before: string, after: string): boolean {
  if (field.kind === 'professors') return !sameNames(before, after)
  return before.replace(/\r\n/g, '\n').trim() !== after.replace(/\r\n/g, '\n').trim()
}

function timestamp(now: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: siteConfig.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)
}

function short(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 117)}…` : flat || '(vazio)'
}

/** Garante a coluna ID e as colunas dos campos que serão gravados (acrescentadas ao final do cabeçalho). */
async function ensureColumns(writer: SheetWriter, entity: EntityDef, table: Table, keys: string[]): Promise<Table> {
  const header: CellWrite[] = []
  let next = table.headerLength + 1
  const columns = { ...table.columns }
  let idColumn = table.idColumn
  if (!idColumn) {
    idColumn = next++
    header.push({ row: 1, col: idColumn, value: ID_HEADER })
  }
  for (const key of keys) {
    if (!columns[key]) {
      columns[key] = next++
      header.push({ row: 1, col: columns[key]!, value: headersOf(entity, key)[0]! })
    }
  }
  if (header.length) await writer.setCells(table.tabName, header)
  return { ...table, columns, idColumn, headerLength: next - 1 }
}

async function logHistory(
  writer: SheetWriter,
  editor: Editor,
  action: string,
  table: Table,
  id: string | null,
  row: number,
  changes: string[],
  now: Date,
) {
  const existing = await writer.readTab(HISTORY_TAB)
  if (!existing) await writer.createTab(HISTORY_TAB, HISTORY_HEADER)
  await writer.appendRow(HISTORY_TAB, [
    timestamp(now),
    editor.email,
    editor.role === 'coordenacao' ? 'Coordenação' : 'Professor',
    action,
    table.tabName,
    id ?? '',
    row,
    protectText(changes.join(' | ')),
  ])
}

type Planned = { key: string; field: FieldDef; before: string; value: CellValue; after: string }

function plan(entity: EntityDef, current: FormValues, input: FormValues, onlyChanged: boolean) {
  const errors: Record<string, string> = {}
  const writes: Planned[] = []
  for (const field of entity.fields) {
    const before = current[field.key] ?? ''
    const after = input[field.key] ?? before
    if (onlyChanged && !changed(field, before, after)) continue
    const result = inputToCell(field, after)
    if (!result.ok) errors[field.key] = result.error
    else if (!onlyChanged && result.value === '') continue
    else writes.push({ key: field.key, field, before, value: result.value, after })
  }
  return { errors, writes }
}

export async function createRecord(
  writer: SheetWriter,
  entity: EntityDef,
  input: FormValues,
  editor: Editor,
  now = new Date(),
): Promise<SaveResult> {
  const { errors, writes } = plan(entity, {}, input, false)
  if (Object.keys(errors).length) return { ok: false, message: 'Revise os campos destacados.', errors }

  let table = await loadTable(writer, entity)
  if (!table.rows) {
    await writer.createTab(table.tabName, [ID_HEADER, ...entity.fields.map((f) => headersOf(entity, f.key)[0]!)])
    table = await loadTable(writer, entity)
  }
  if (entity.tab === 'inventory' && writes.some((w) => w.key === 'current') && !writes.some((w) => w.key === 'updatedAt')) {
    const today = todayISO(now)
    writes.push({ key: 'updatedAt', field: entity.fields.find((f) => f.key === 'updatedAt')!, before: '', value: today, after: today })
  }
  table = await ensureColumns(writer, entity, table, writes.map((w) => w.key))

  const id = newId(entity)
  const line: CellValue[] = Array.from({ length: table.headerLength }, () => '')
  line[table.idColumn! - 1] = id
  for (const w of writes) line[table.columns[w.key]! - 1] = w.value

  const row = await writer.appendRow(table.tabName, line)
  await logHistory(writer, editor, 'Criação', table, id, row, writes.map((w) => `${w.field.label}: ${short(w.after)}`), now)
  return { ok: true, ref: `id-${id}`, message: 'Registro criado na planilha.' }
}

export async function updateRecord(
  writer: SheetWriter,
  entity: EntityDef,
  ref: string,
  version: string,
  input: FormValues,
  editor: Editor,
  now = new Date(),
): Promise<SaveResult> {
  let table = await loadTable(writer, entity)
  const record = findRecord(entity, table, ref)
  if (!record) return { ok: false, message: NOT_FOUND }
  if (record.version !== version) return { ok: false, message: CONFLICT }

  const { errors, writes } = plan(entity, record.values, input, true)
  if (Object.keys(errors).length) return { ok: false, message: 'Revise os campos destacados.', errors }

  if (entity.tab === 'inventory' && writes.some((w) => w.key === 'current') && !writes.some((w) => w.key === 'updatedAt')) {
    writes.push({
      key: 'updatedAt',
      field: entity.fields.find((f) => f.key === 'updatedAt')!,
      before: record.values.updatedAt ?? '',
      value: todayISO(now),
      after: todayISO(now).split('-').reverse().join('/'),
    })
  }
  if (writes.length === 0 && record.id) return { ok: true, ref: record.ref, message: 'Nenhuma alteração.' }

  table = await ensureColumns(writer, entity, table, writes.map((w) => w.key))
  const id = record.id ?? newId(entity)
  const cells: CellWrite[] = writes.map((w) => ({ row: record.row, col: table.columns[w.key]!, value: w.value }))
  if (!record.id) cells.push({ row: record.row, col: table.idColumn!, value: id })
  await writer.setCells(table.tabName, cells)

  const changes = writes.map((w) => `${w.field.label}: ${short(w.before)} → ${short(w.after)}`)
  if (!record.id) changes.push(`ID atribuído: ${id}`)
  await logHistory(writer, editor, 'Edição', table, id, record.row, changes, now)
  return { ok: true, ref: `id-${id}`, message: writes.length ? 'Alterações salvas na planilha.' : 'ID atribuído à linha.' }
}

export async function removeRecord(
  writer: SheetWriter,
  entity: EntityDef,
  ref: string,
  version: string,
  editor: Editor,
  now = new Date(),
): Promise<SaveResult> {
  let table = await loadTable(writer, entity)
  const record = findRecord(entity, table, ref)
  if (!record) return { ok: false, message: NOT_FOUND }
  if (record.version !== version) return { ok: false, message: CONFLICT }

  const snapshot = entity.fields.filter((f) => record.values[f.key]).map((f) => `${f.label}: ${short(record.values[f.key]!)}`)

  if (entity.archiveByStatus) {
    table = await ensureColumns(writer, entity, table, ['status'])
    const id = record.id ?? newId(entity)
    const cells: CellWrite[] = [{ row: record.row, col: table.columns.status!, value: 'Rascunho' }]
    if (!record.id) cells.push({ row: record.row, col: table.idColumn!, value: id })
    await writer.setCells(table.tabName, cells)
    await logHistory(writer, editor, 'Arquivamento (Status → Rascunho)', table, id, record.row, snapshot, now)
    return { ok: true, ref: `id-${id}`, message: 'Arquivado: não aparece mais no portal. Para voltar, mude o Status.' }
  }

  // Confere de novo, imediatamente antes de apagar, que a linha é a mesma.
  const fresh = await loadTable(writer, entity)
  const again = findRecord(entity, fresh, record.ref)
  if (!again || again.row !== record.row || again.version !== version) return { ok: false, message: CONFLICT }
  if (cellAt(fresh, record.row, fresh.idColumn) !== cellAt(table, record.row, table.idColumn)) return { ok: false, message: CONFLICT }

  await writer.deleteRow(table.tabName, record.row)
  await logHistory(writer, editor, 'Remoção', table, record.id, record.row, snapshot, now)
  return { ok: true, ref: record.ref, message: 'Removido da planilha. Os dados ficaram registrados no HISTÓRICO.' }
}
