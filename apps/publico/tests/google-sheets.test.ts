import { describe, expect, it, vi } from 'vitest'
import { GoogleSheetsSource } from '@/server/data/source/google-sheets'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('GoogleSheetsSource', () => {
  it('pede só as abas existentes, com datas como serial, e marca ausentes como null', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      const u = String(url)
      if (u.includes('fields=sheets.properties.title')) {
        return jsonResponse({ sheets: [{ properties: { title: 'AULAS' } }, { properties: { title: 'PENDÊNCIAS' } }] })
      }
      return jsonResponse({ valueRanges: [{ values: [['Módulo'], [1]] }] })
    })
    const source = new GoogleSheetsSource('abc', async () => 'token', fetchMock as unknown as typeof fetch)
    const workbook = await source.fetchTabs(['AULAS', 'ESTOQUE'])

    expect(workbook).toEqual({ AULAS: [['Módulo'], [1]], ESTOQUE: null })
    const batchUrl = new URL(String(fetchMock.mock.calls[1]![0]))
    expect(batchUrl.searchParams.getAll('ranges')).toEqual(["'AULAS'"])
    expect(batchUrl.searchParams.get('valueRenderOption')).toBe('UNFORMATTED_VALUE')
    expect(batchUrl.searchParams.get('dateTimeRenderOption')).toBe('SERIAL_NUMBER')
    // Nenhuma aba fora da lista é pedida (ex.: PENDÊNCIAS)
    expect(batchUrl.toString()).not.toContain('PEND')
    const init = fetchMock.mock.calls[0]![1]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token')
  })

  it('erro de permissão (403) falha imediatamente, sem nova tentativa', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'forbidden' }, 403))
    const source = new GoogleSheetsSource('abc', async () => 'token', fetchMock as unknown as typeof fetch)
    await expect(source.fetchTabs(['AULAS'])).rejects.toThrow('403')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('erro 5xx tenta novamente antes de falhar', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 503))
    const source = new GoogleSheetsSource('abc', async () => 'token', fetchMock as unknown as typeof fetch)
    await expect(source.fetchTabs(['AULAS'])).rejects.toThrow('503')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
