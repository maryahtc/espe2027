import type { CellValue } from '@/lib/normalize'

/** Uma célula a gravar. Linha e coluna começam em 1 (como na planilha). */
export type CellWrite = { row: number; col: number; value: CellValue }

/**
 * Gravação na planilha. Usado SOMENTE pela área de edição (/coordenacao), sempre
 * depois de verificar a sessão. Valores são gravados como se digitados por uma pessoa.
 */
export interface SheetWriter {
  readonly kind: 'memory' | 'google-sheets'
  /** Lê a aba inteira, sem cache (para localizar linhas antes de gravar). `null` = aba inexistente. */
  readTab(tab: string): Promise<CellValue[][] | null>
  createTab(tab: string, header: string[]): Promise<void>
  setCells(tab: string, cells: CellWrite[]): Promise<void>
  /** Acrescenta uma linha ao final e devolve o número dela. */
  appendRow(tab: string, values: CellValue[]): Promise<number>
  deleteRow(tab: string, row: number): Promise<void>
}
