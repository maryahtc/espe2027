/**
 * Fonte de DESENVOLVIMENTO. Devolve as fixtures em /fixtures no mesmo formato
 * bruto da API do Google, para que todo o pipeline seja exercitado.
 */
import 'server-only'
import { demoWorkbook } from '@fixtures/workbook'
import type { RawWorkbook, SheetSource } from '../types'

export class MockSheetSource implements SheetSource {
  readonly kind = 'mock' as const

  constructor(private readonly workbook: RawWorkbook = demoWorkbook) {}

  async fetchTabs(tabNames: string[]): Promise<RawWorkbook> {
    return Object.fromEntries(tabNames.map((name) => [name, this.workbook[name] ?? null]))
  }
}
