import 'server-only'
import type { SheetSource } from '../types'
import { GoogleSheetsSource } from './google-sheets'
import { MockSheetSource } from './mock'

/** Produção de verdade nunca pode exibir dados fictícios. */
function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.PORTAL_ENV === 'production'
}

export function createSheetSource(): SheetSource {
  const kind = process.env.DATA_SOURCE ?? 'mock'
  if (kind === 'sheets') return GoogleSheetsSource.fromEnv()
  if (kind === 'mock') {
    if (isProductionDeployment()) {
      throw new Error('DATA_SOURCE=mock não é permitido em produção. Configure DATA_SOURCE=sheets.')
    }
    return new MockSheetSource()
  }
  throw new Error(`DATA_SOURCE inválido: "${kind}" (use "mock" ou "sheets")`)
}
