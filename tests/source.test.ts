import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSheetSource } from '@/server/data/source'

afterEach(() => vi.unstubAllEnvs())

describe('seleção da fonte de dados', () => {
  it('usa mock em desenvolvimento', () => {
    vi.stubEnv('DATA_SOURCE', 'mock')
    expect(createSheetSource().kind).toBe('mock')
  })

  it('recusa dados fictícios em produção', () => {
    vi.stubEnv('DATA_SOURCE', 'mock')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(() => createSheetSource()).toThrow(/não é permitido em produção/)
  })

  it('exige as credenciais quando DATA_SOURCE=sheets', () => {
    vi.stubEnv('DATA_SOURCE', 'sheets')
    vi.stubEnv('GOOGLE_SHEETS_SPREADSHEET_ID', '')
    expect(() => createSheetSource()).toThrow(/GOOGLE_SHEETS_SPREADSHEET_ID/)
  })
})
