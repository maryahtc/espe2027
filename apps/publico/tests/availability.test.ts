import { describe, expect, it } from 'vitest'
import { computeAvailability, computeInventoryStatus } from '@/lib/domain/availability'

describe('material × estoque', () => {
  it('necessário 20, disponível 8 → faltam 12, atenção', () => {
    expect(computeAvailability(20, 8)).toEqual({ required: 20, available: 8, missing: 12, status: 'atencao' })
  })
  it('necessário 20, disponível 25 → OK', () => {
    expect(computeAvailability(20, 25)).toEqual({ required: 20, available: 25, missing: 0, status: 'ok' })
  })
  it('exatamente o necessário → OK', () => {
    expect(computeAvailability(10, 10).status).toBe('ok')
  })
  it('sem dados em qualquer lado → sem-dados', () => {
    expect(computeAvailability(null, 8).status).toBe('sem-dados')
    expect(computeAvailability(20, null)).toEqual({ required: 20, available: null, missing: null, status: 'sem-dados' })
  })
})

describe('status de estoque', () => {
  it('classifica OK / BAIXO / INSUFICIENTE', () => {
    expect(computeInventoryStatus(25, 10)).toBe('ok')
    expect(computeInventoryStatus(10, 10)).toBe('ok')
    expect(computeInventoryStatus(6, 10)).toBe('baixo')
    expect(computeInventoryStatus(0, 10)).toBe('insuficiente')
    expect(computeInventoryStatus(5, null)).toBe('ok')
    expect(computeInventoryStatus(null, 10)).toBe('sem-dados')
  })
})

import { aggregateDemand } from '@/lib/domain/availability'

describe('demanda acumulada', () => {
  it('soma módulos futuros e compara com o estoque', () => {
    const materials = [
      { inventoryKey: 'resina', moduleNumber: 5, required: 20 },
      { inventoryKey: 'resina', moduleNumber: 6, required: 15 },
      { inventoryKey: 'resina', moduleNumber: 2, required: 50 }, // já realizado
      { inventoryKey: null, moduleNumber: 5, required: 3 },
    ]
    const result = aggregateDemand(materials, new Map([['resina', 25]]), (n) => n >= 5)
    expect(result.get('resina')).toEqual({ required: 35, available: 25, missing: 10, status: 'atencao', modules: [5, 6] })
    expect(result.size).toBe(1)
  })
})
