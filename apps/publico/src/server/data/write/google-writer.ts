/**
 * Gravação na planilha real (Google Sheets API v4, Service Account com papel Editor).
 * Valores são enviados como "USER_ENTERED" — exatamente como se alguém digitasse.
 */
import 'server-only'
import { cacheConfig } from '@/config/cache'
import type { CellValue } from '@/lib/normalize'
import {
  quoteSheetName,
  readGoogleConfigFromEnv,
  serviceAccountToken,
  SHEETS_API,
  WRITE_SCOPE,
  type TokenProvider,
} from '../source/google-sheets'
import type { CellWrite, SheetWriter } from './types'

type FetchLike = typeof fetch

/** 1 → A, 27 → AA */
export function columnLetter(col: number): string {
  let n = col
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export class GoogleSheetsWriter implements SheetWriter {
  readonly kind = 'google-sheets' as const
  private sheetIds: Map<string, number> | null = null

  constructor(
    private readonly spreadsheetId: string,
    private readonly getToken: TokenProvider,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  static fromEnv(): GoogleSheetsWriter {
    const config = readGoogleConfigFromEnv()
    return new GoogleSheetsWriter(config.spreadsheetId, serviceAccountToken(config, WRITE_SCOPE))
  }

  private get base() {
    return `${SHEETS_API}/${encodeURIComponent(this.spreadsheetId)}`
  }

  private async request<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const token = await this.getToken()
    const response = await this.fetchImpl(url, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(cacheConfig.fetchTimeoutMs),
    })
    if (!response.ok) throw new Error(`Google Sheets API respondeu ${response.status}`)
    return (await response.json()) as T
  }

  private async loadSheetIds(): Promise<Map<string, number>> {
    const meta = await this.request<{ sheets?: { properties?: { title?: string; sheetId?: number } }[] }>(
      `${this.base}?fields=sheets.properties(title,sheetId)`,
    )
    this.sheetIds = new Map(
      (meta.sheets ?? [])
        .filter((s) => s.properties?.title !== undefined)
        .map((s) => [s.properties!.title!, s.properties!.sheetId ?? 0]),
    )
    return this.sheetIds
  }

  async readTab(tab: string): Promise<CellValue[][] | null> {
    const ids = await this.loadSheetIds()
    if (!ids.has(tab)) return null
    const params = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' })
    const data = await this.request<{ values?: CellValue[][] }>(
      `${this.base}/values/${encodeURIComponent(quoteSheetName(tab))}?${params}`,
    )
    return data.values ?? []
  }

  async createTab(tab: string, header: string[]) {
    const ids = this.sheetIds ?? (await this.loadSheetIds())
    if (!ids.has(tab)) {
      await this.request(`${this.base}:batchUpdate`, {
        method: 'POST',
        body: { requests: [{ addSheet: { properties: { title: tab } } }] },
      })
      this.sheetIds = null
    }
    await this.setCells(
      tab,
      header.map((value, i) => ({ row: 1, col: i + 1, value })),
    )
  }

  async setCells(tab: string, cells: CellWrite[]) {
    if (cells.length === 0) return
    await this.request(`${this.base}/values:batchUpdate`, {
      method: 'POST',
      body: {
        valueInputOption: 'USER_ENTERED',
        data: cells.map((c) => ({
          range: `${quoteSheetName(tab)}!${columnLetter(c.col)}${c.row}`,
          values: [[c.value ?? '']],
        })),
      },
    })
  }

  async appendRow(tab: string, values: CellValue[]): Promise<number> {
    const params = new URLSearchParams({ valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' })
    const result = await this.request<{ updates?: { updatedRange?: string } }>(
      `${this.base}/values/${encodeURIComponent(`${quoteSheetName(tab)}!A1`)}:append?${params}`,
      { method: 'POST', body: { values: [values.map((v) => v ?? '')] } },
    )
    const match = /![A-Z]+(\d+)/.exec(result.updates?.updatedRange ?? '')
    if (!match) throw new Error('Não foi possível identificar a linha gravada')
    return Number(match[1])
  }

  async deleteRow(tab: string, row: number) {
    const ids = await this.loadSheetIds()
    const sheetId = ids.get(tab)
    if (sheetId === undefined) throw new Error(`Aba inexistente: ${tab}`)
    await this.request(`${this.base}:batchUpdate`, {
      method: 'POST',
      body: {
        requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }],
      },
    })
  }
}
