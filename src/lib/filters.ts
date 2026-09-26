/**
 * Mecanismo ÚNICO de filtros. Cada página declara seus filtros (FilterDef[]),
 * e este módulo cuida de: leitura da URL, validação, combinação (E lógico),
 * chips de filtros ativos e links "remover"/"limpar".
 * O estado vive sempre na URL (?ano=2027&professor=joao-silva) → compartilhável.
 */
import { normalizeText, tokenize } from '@/lib/text'

export type FilterOption = { value: string; label: string }

export type FilterDef = {
  param: string
  label: string
  kind: 'select' | 'text'
  options?: FilterOption[]
  placeholder?: string
}

export type FilterState = Record<string, string>
export type SearchParams = Record<string, string | string[] | undefined>

const MAX_TEXT = 80

export function parseFilters(searchParams: SearchParams, defs: FilterDef[]): FilterState {
  const state: FilterState = {}
  for (const def of defs) {
    const raw = searchParams[def.param]
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, MAX_TEXT)
    if (!value) continue
    if (def.kind === 'select' && !def.options?.some((o) => o.value === value)) continue
    state[def.param] = value
  }
  return state
}

export function hasActiveFilters(state: FilterState): boolean {
  return Object.keys(state).length > 0
}

export function hrefWith(pathname: string, state: FilterState, patch: Record<string, string | null> = {}): string {
  const next = { ...state, ...patch }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(next)) if (value) params.set(key, value)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export type ActiveFilter = { param: string; label: string; valueLabel: string; removeHref: string }

export function activeFilters(pathname: string, defs: FilterDef[], state: FilterState): ActiveFilter[] {
  return defs
    .filter((def) => state[def.param])
    .map((def) => {
      const value = state[def.param]!
      const valueLabel = def.options?.find((o) => o.value === value)?.label ?? `“${value}”`
      return { param: def.param, label: def.label, valueLabel, removeHref: hrefWith(pathname, state, { [def.param]: null }) }
    })
}

export type Predicates<T> = Record<string, (item: T, value: string) => boolean>

/** Aplica todos os filtros ativos (E lógico). Filtros sem predicado são ignorados. */
export function applyFilters<T>(items: T[], state: FilterState, predicates: Predicates<T>): T[] {
  const active = Object.entries(state).filter(([param]) => predicates[param])
  if (active.length === 0) return items
  return items.filter((item) => active.every(([param, value]) => predicates[param]!(item, value)))
}

/** Texto contém todos os termos (ignorando acento/maiúsculas). */
export function textMatches(value: string, ...haystacks: (string | null | undefined)[]): boolean {
  const terms = tokenize(value)
  const text = normalizeText(haystacks.filter(Boolean).join(' '))
  return terms.every((term) => text.includes(term))
}

export function sortOptions(options: FilterOption[]): FilterOption[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

export function uniqueOptions(values: (string | null | undefined)[]): FilterOption[] {
  const map = new Map<string, string>()
  for (const value of values) {
    if (!value) continue
    const key = normalizeText(value).replace(/ /g, '-')
    if (!map.has(key)) map.set(key, value)
  }
  return sortOptions([...map].map(([value, label]) => ({ value, label })))
}

/** Compara um valor de dado com uma opção gerada por uniqueOptions. */
export function optionMatches(optionValue: string, dataValue: string | null | undefined): boolean {
  return !!dataValue && normalizeText(dataValue).replace(/ /g, '-') === optionValue
}
