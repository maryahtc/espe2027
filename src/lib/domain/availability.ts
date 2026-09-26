/**
 * Regras centrais de disponibilidade. Toda a aplicação usa estas funções —
 * nenhum componente recalcula "faltante" ou status por conta própria.
 */
import type { AvailabilityStatus, InventoryStatus } from '@/config/vocab'

export type Availability = {
  required: number | null
  available: number | null
  missing: number | null
  status: AvailabilityStatus
}

/**
 * Necessário × disponível.
 *   necessário 20, disponível 8  → faltam 12, "atencao"
 *   necessário 20, disponível 25 → faltam 0,  "ok"
 *   qualquer lado desconhecido   → "sem-dados"
 */
export function computeAvailability(required: number | null, available: number | null): Availability {
  if (required === null || available === null) {
    return { required, available, missing: null, status: 'sem-dados' }
  }
  const missing = Math.max(0, required - available)
  return { required, available, missing, status: missing > 0 ? 'atencao' : 'ok' }
}

/**
 * Situação de um item de estoque.
 *   atual ≤ 0                  → "insuficiente"
 *   atual < mínimo             → "baixo"
 *   caso contrário             → "ok"
 *   atual desconhecido         → "sem-dados"
 */
export function computeInventoryStatus(current: number | null, minimum: number | null): InventoryStatus {
  if (current === null) return 'sem-dados'
  if (current <= 0) return 'insuficiente'
  if (minimum !== null && current < minimum) return 'baixo'
  return 'ok'
}

/**
 * Demanda acumulada: soma do que os módulos AINDA NÃO REALIZADOS pedem de cada
 * item, comparada ao estoque atual. Revela faltas que a visão por módulo esconde
 * (ex.: M05 pede 20, M06 pede 15, estoque 25 → cada um "OK", mas faltam 10).
 */
export function aggregateDemand<T extends { inventoryKey: string | null; moduleNumber: number; required: number | null }>(
  materials: T[],
  stock: Map<string, number | null>,
  isUpcoming: (moduleNumber: number) => boolean,
): Map<string, Availability & { modules: number[] }> {
  const totals = new Map<string, { required: number; modules: Set<number> }>()
  for (const m of materials) {
    if (!m.inventoryKey || m.required === null || !isUpcoming(m.moduleNumber)) continue
    const entry = totals.get(m.inventoryKey) ?? { required: 0, modules: new Set<number>() }
    entry.required += m.required
    entry.modules.add(m.moduleNumber)
    totals.set(m.inventoryKey, entry)
  }
  const result = new Map<string, Availability & { modules: number[] }>()
  for (const [key, { required, modules }] of totals) {
    result.set(key, { ...computeAvailability(required, stock.get(key) ?? null), modules: [...modules].sort((a, b) => a - b) })
  }
  return result
}
