/**
 * Planilha EM MEMÓRIA para prévia, desenvolvimento e testes.
 * A fonte de leitura (preview/mock) e o gravador compartilham o mesmo objeto,
 * então uma edição feita na área de edição aparece no portal — até o servidor reiniciar.
 * Nunca usado em produção.
 */
import 'server-only'
import type { CellValue } from '@/lib/normalize'
import type { RawWorkbook, SheetSource } from '../types'
import type { CellWrite, SheetWriter } from '../write/types'

/** Imita o Google Sheets com "USER_ENTERED": a aspa inicial força texto e não é guardada. */
function asTyped(value: CellValue): CellValue {
  return typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value
}

export class MemoryWorkbook implements SheetWriter {
  readonly kind = 'memory' as const
  private readonly tabs: Map<string, CellValue[][]>

  constructor(initial: Record<string, CellValue[][] | null>) {
    this.tabs = new Map(
      Object.entries(initial)
        .filter((entry): entry is [string, CellValue[][]] => entry[1] !== null)
        .map(([name, rows]) => [name, rows.map((r) => [...r])]),
    )
  }

  async readTab(tab: string) {
    const rows = this.tabs.get(tab)
    return rows ? rows.map((r) => [...r]) : null
  }

  async createTab(tab: string, header: string[]) {
    if (!this.tabs.has(tab)) this.tabs.set(tab, [[...header]])
  }

  async setCells(tab: string, cells: CellWrite[]) {
    const rows = this.tabs.get(tab)
    if (!rows) throw new Error(`Aba inexistente: ${tab}`)
    for (const { row, col, value } of cells) {
      while (rows.length < row) rows.push([])
      const line = rows[row - 1]!
      while (line.length < col) line.push(null)
      line[col - 1] = asTyped(value)
    }
  }

  async appendRow(tab: string, values: CellValue[]) {
    const rows = this.tabs.get(tab)
    if (!rows) throw new Error(`Aba inexistente: ${tab}`)
    rows.push(values.map(asTyped))
    return rows.length
  }

  async deleteRow(tab: string, row: number) {
    const rows = this.tabs.get(tab)
    if (!rows || row < 2 || row > rows.length) throw new Error(`Linha inexistente: ${tab}!${row}`)
    rows.splice(row - 1, 1)
  }

  /** Visão de leitura (mesmo formato da API do Google). */
  source(kind: 'mock' | 'preview'): SheetSource {
    return {
      kind,
      fetchTabs: async (names: string[]): Promise<RawWorkbook> =>
        Object.fromEntries(await Promise.all(names.map(async (n) => [n, await this.readTab(n)] as const))),
    }
  }
}
