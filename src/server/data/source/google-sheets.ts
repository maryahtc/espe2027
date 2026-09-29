/**
 * Fonte real: Google Sheets API v4 com Service Account (somente leitura).
 *
 * - 1 chamada para listar as abas existentes (para que uma aba ausente não derrube as outras);
 * - 1 chamada values:batchGet com todas as abas usadas.
 * Datas chegam como número serial (sem ambiguidade de formato/idioma).
 */
import 'server-only'
import { JWT } from 'google-auth-library'
import { cacheConfig } from '@/config/cache'
import { errorMessage, log } from '@/lib/log'
import type { CellValue } from '@/lib/normalize'
import type { RawWorkbook, SheetSource } from '../types'

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const API = SHEETS_API
export const READ_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
export const WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

export type GoogleSheetsConfig = {
  spreadsheetId: string
  clientEmail: string
  privateKey: string
}

export type TokenProvider = () => Promise<string>
type FetchLike = typeof fetch

export function readGoogleConfigFromEnv(): GoogleSheetsConfig {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const missing = [
    !spreadsheetId && 'GOOGLE_SHEETS_SPREADSHEET_ID',
    !clientEmail && 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    !privateKey && 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  ].filter(Boolean)
  if (missing.length) throw new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`)
  return {
    spreadsheetId: spreadsheetId!,
    clientEmail: clientEmail!,
    // Painéis de deploy costumam guardar a chave com "\n" literal.
    privateKey: privateKey!.replace(/\\n/g, '\n'),
  }
}

export function serviceAccountToken(config: GoogleSheetsConfig, scope = READ_SCOPE): TokenProvider {
  const client = new JWT({ email: config.clientEmail, key: config.privateKey, scopes: [scope] })
  return async () => {
    const { token } = await client.getAccessToken()
    if (!token) throw new Error('Não foi possível obter token da Service Account')
    return token
  }
}

export function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`
}

export class GoogleSheetsSource implements SheetSource {
  readonly kind = 'google-sheets' as const

  constructor(
    private readonly spreadsheetId: string,
    private readonly getToken: TokenProvider,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  static fromEnv(): GoogleSheetsSource {
    const config = readGoogleConfigFromEnv()
    return new GoogleSheetsSource(config.spreadsheetId, serviceAccountToken(config))
  }

  private async getJson<T>(url: string): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= cacheConfig.retries; attempt++) {
      try {
        const token = await this.getToken()
        const response = await this.fetchImpl(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(cacheConfig.fetchTimeoutMs),
        })
        if (response.ok) return (await response.json()) as T
        // 4xx (permissão, planilha inexistente) não melhora com nova tentativa.
        const error = new Error(`Google Sheets API respondeu ${response.status}`)
        if (response.status < 500 && response.status !== 429) throw Object.assign(error, { fatal: true })
        lastError = error
      } catch (error) {
        if ((error as { fatal?: boolean }).fatal) throw error
        lastError = error
      }
      if (attempt < cacheConfig.retries) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
    throw lastError instanceof Error ? lastError : new Error(errorMessage(lastError))
  }

  async fetchTabs(tabNames: string[]): Promise<RawWorkbook> {
    const base = `${API}/${encodeURIComponent(this.spreadsheetId)}`
    const meta = await this.getJson<{ sheets?: { properties?: { title?: string } }[] }>(
      `${base}?fields=sheets.properties.title`,
    )
    const existing = new Set((meta.sheets ?? []).map((s) => s.properties?.title).filter(Boolean))
    const present = tabNames.filter((name) => existing.has(name))
    for (const name of tabNames) {
      if (!existing.has(name)) log.warn('sheets.tab_missing', { tab: name })
    }

    const workbook: RawWorkbook = Object.fromEntries(tabNames.map((name) => [name, null]))
    if (present.length === 0) return workbook

    const params = new URLSearchParams({
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
      majorDimension: 'ROWS',
    })
    for (const name of present) params.append('ranges', quoteSheetName(name))

    const data = await this.getJson<{ valueRanges?: { values?: CellValue[][] }[] }>(
      `${base}/values:batchGet?${params.toString()}`,
    )
    present.forEach((name, index) => {
      workbook[name] = data.valueRanges?.[index]?.values ?? []
    })
    return workbook
  }
}
