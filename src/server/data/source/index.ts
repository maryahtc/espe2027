import 'server-only'
import { demoWorkbook } from '@fixtures/workbook'
import { MemoryWorkbook } from '../store/memory'
import type { SheetSource } from '../types'
import { GoogleSheetsWriter } from '../write/google-writer'
import type { SheetWriter } from '../write/types'
import { GoogleSheetsSource } from './google-sheets'
import { readPreviewWorkbook } from './preview'

type DataSourceKind = 'preview' | 'mock' | 'sheets'

/** Produção de verdade nunca pode exibir dados fictícios ou de prévia. */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.PORTAL_ENV === 'production'
}

function dataSourceKind(): DataSourceKind {
  const kind = process.env.DATA_SOURCE ?? 'preview'
  if (kind !== 'preview' && kind !== 'mock' && kind !== 'sheets') {
    throw new Error(`DATA_SOURCE inválido: "${kind}" (use "preview", "mock" ou "sheets")`)
  }
  if (kind !== 'sheets' && isProductionDeployment()) {
    throw new Error(`DATA_SOURCE=${kind} não é permitido em produção. Configure DATA_SOURCE=sheets.`)
  }
  return kind
}

/** Planilha em memória compartilhada entre leitura e gravação (prévia/mock). */
const globalStore = globalThis as unknown as { __portalMemory?: Partial<Record<'preview' | 'mock', MemoryWorkbook>> }

export function memoryWorkbook(kind: 'preview' | 'mock'): MemoryWorkbook {
  const stores = (globalStore.__portalMemory ??= {})
  return (stores[kind] ??= new MemoryWorkbook(kind === 'preview' ? readPreviewWorkbook() : demoWorkbook))
}

export function createSheetSource(): SheetSource {
  const kind = dataSourceKind()
  if (kind === 'sheets') return GoogleSheetsSource.fromEnv()
  return memoryWorkbook(kind).source(kind)
}

export function createSheetWriter(): SheetWriter {
  const kind = dataSourceKind()
  if (kind === 'sheets') return GoogleSheetsWriter.fromEnv()
  return memoryWorkbook(kind)
}
