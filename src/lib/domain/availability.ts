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
