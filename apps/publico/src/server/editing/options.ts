/** Opções dos campos de escolha (módulos e professores), lidas da planilha no momento. */
import 'server-only'
import { getEntity } from '@/config/editing'
import { formatMonthShort, parseMonth } from '@/lib/dates'
import type { SheetWriter } from '@/server/data/write/types'
import { listRecords, loadTable } from './records'

export type Option = { value: string; label: string }
export type EditorOptions = { modules: Option[]; professors: string[] }

export async function editorOptions(writer: SheetWriter): Promise<EditorOptions> {
  const moduleEntity = getEntity('modulos')!
  const professorEntity = getEntity('professores')!
  const modules = listRecords(moduleEntity, await loadTable(writer, moduleEntity))
  const professors = listRecords(professorEntity, await loadTable(writer, professorEntity))

  const count = new Map<string, number>()
  for (const m of modules) count.set(m.values.number!, (count.get(m.values.number!) ?? 0) + 1)
  const moduleOptions = modules
    .filter((m) => m.values.number)
    .map((m) => {
      const month = m.values.plannedMonth ? parseMonth(m.values.plannedMonth) : null
      const mon = month ? formatMonthShort(month) : ''
      const n = m.values.number!
      // Número repetido: o mês desempata ("9 (NOV)"), como na planilha.
      const value = (count.get(n) ?? 0) > 1 && mon ? `${n} (${mon})` : n
      const label = [`Módulo ${n.padStart(2, '0')}`, mon, m.values.title || 'tema a confirmar'].filter(Boolean).join(' · ')
      return { value, label }
    })
  return {
    modules: moduleOptions,
    professors: [...new Set(professors.map((p) => p.values.name!).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }
}
