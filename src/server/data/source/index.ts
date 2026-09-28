import 'server-only'
import type { SheetSource } from '../types'
import { GoogleSheetsSource } from './google-sheets'
import { MockSheetSource } from './mock'
import { PreviewSheetSource } from './preview'

/** Produção de verdade nunca pode exibir dados fictícios. */
function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.PORTAL_ENV === 'production'
}

export function createSheetSource(): SheetSource {
  const kind = process.env.DATA_SOURCE ?? 'preview'
  if (kind === 'sheets') return GoogleSheetsSource.fromEnv()
  if (kind === 'mock' || kind === 'preview') {
    if (isProductionDeployment()) {
      throw new Error(`DATA_SOURCE=${kind} não é permitido em produção. Configure DATA_SOURCE=sheets.`)
    }
    return kind === 'mock' ? new MockSheetSource() : new PreviewSheetSource()
  }
  throw new Error(`DATA_SOURCE inválido: "${kind}" (use "preview", "mock" ou "sheets")`)
}
