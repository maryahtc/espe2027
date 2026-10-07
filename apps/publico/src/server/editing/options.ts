/**
 * Opções dos campos de escolha (módulos e professores) da área de logística.
 * Vêm do mesmo conjunto que o portal exibe — com o banco configurado, do Admin do Portal do Aluno.
 */
import 'server-only'
import { formatMonthShort, parseMonth } from '@/lib/dates'
import { padModuleNumber } from '@/lib/text'
import type { PublicDataset } from '@/schemas/public'
import { getDataset } from '@/server/data/repository'

export type Option = { value: string; label: string }
export type EditorOptions = { modules: Option[]; professors: string[] }

export function optionsFromDataset(dataset: Pick<PublicDataset, 'modules' | 'professors'>): EditorOptions {
  const count = new Map<number, number>()
  for (const m of dataset.modules) count.set(m.number, (count.get(m.number) ?? 0) + 1)
  const modules = dataset.modules.map((m) => {
    const month = m.month ? parseMonth(m.month) : null
    const mon = month ? formatMonthShort(month) : ''
    // Número repetido: o mês desempata ("9 (NOV)"), como na planilha.
    const value = (count.get(m.number) ?? 0) > 1 && mon ? `${m.number} (${mon})` : String(m.number)
    const label = [`Módulo ${padModuleNumber(m.number)}`, mon, m.title || 'tema a confirmar'].filter(Boolean).join(' · ')
    return { value, label }
  })
  return {
    modules: modules.filter((o, i) => modules.findIndex((x) => x.value === o.value) === i),
    professors: [...new Set(dataset.professors.map((p) => p.name))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }
}

export async function editorOptions(): Promise<EditorOptions> {
  return optionsFromDataset(await getDataset())
}
