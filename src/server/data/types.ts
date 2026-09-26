import type { CellValue } from '@/lib/normalize'
import type { PublicDataset } from '@/schemas/public'

/** Linhas brutas de uma aba, exatamente como a API do Google devolve. `null` = aba inexistente. */
export type RawWorkbook = Record<string, CellValue[][] | null>

export interface SheetSource {
  readonly kind: PublicDataset['source']
  /** Busca as abas pedidas. Deve LANÇAR erro em falha de rede/autenticação. */
  fetchTabs(tabNames: string[]): Promise<RawWorkbook>
}

export type IssueCode =
  | 'tab_missing'
  | 'column_missing'
  | 'row_invalid'
  | 'field_invalid'
  | 'duplicate_module'
  | 'module_implicit'
  | 'professor_unregistered'
  | 'professor_alias_ambiguous'
  | 'slug_collision'
  | 'date_out_of_course'
  | 'date_out_of_module'
  | 'date_range_inverted'
  | 'material_not_in_inventory'

/** Problema de dados. NUNCA contém valores de células — só localização. */
export type DataIssue = {
  severity: 'warning' | 'error'
  code: IssueCode
  tab: string
  row?: number
  field?: string
}

export type DataReport = {
  generatedAt: string
  source: PublicDataset['source']
  counts: Record<'modules' | 'classes' | 'professors' | 'materials' | 'inventory' | 'equipment', number>
  issues: DataIssue[]
}

export type PortalData = { dataset: PublicDataset; report: DataReport }

export class CriticalDataError extends Error {
  constructor(
    message: string,
    readonly issues: DataIssue[],
  ) {
    super(message)
    this.name = 'CriticalDataError'
  }
}
