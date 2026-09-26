import { describe, expect, it } from 'vitest'
import { demoWorkbook } from '@fixtures/workbook'
import { buildFromWorkbook } from '@/server/data/pipeline/build'
import { search } from '@/lib/search'

const { dataset } = buildFromWorkbook(demoWorkbook, 'mock', new Date('2026-09-26T12:00:00Z'))

describe('busca global', () => {
  it('encontra o professor com ou sem acento e em maiúsculas', () => {
    for (const q of ['João Silva', 'joao silva', 'JOÃO SILVA', 'silva joao']) {
      const groups = search(dataset, q)
      expect(groups[0]?.kind).toBe('professor')
      expect(groups[0]?.hits[0]?.title).toBe('João Silva')
    }
  })

  it('termos parciais', () => {
    const groups = search(dataset, 'ceram')
    const modules = groups.find((g) => g.kind === 'module')
    expect(modules?.hits.map((h) => h.title)).toContain('Módulo 10 · Cerâmicas')
  })

  it('agrupa aulas, módulos e materiais para "mock-up"', () => {
    const groups = search(dataset, 'mock-up')
    const kinds = groups.map((g) => g.kind)
    expect(kinds).toContain('class')
    expect(kinds).toContain('material')
    expect(groups.find((g) => g.kind === 'material')?.hits[0]).toMatchObject({ title: 'Silicone para mock-up' })
  })

  it('busca por número do módulo', () => {
    const groups = search(dataset, 'modulo 7')
    expect(groups[0]?.kind).toBe('module')
    expect(groups[0]?.hits[0]?.title).toContain('Módulo 07')
  })

  it('consulta vazia ou sem resultado', () => {
    expect(search(dataset, '   ')).toEqual([])
    expect(search(dataset, 'xyzxyz')).toEqual([])
  })
})
