/**
 * Mecanismo ÚNICO de filtros (lógica pura — sem DOM).
 *
 * Cada página declara seus filtros (FilterDef[]) e descreve cada item filtrável
 * (FilterableItem). O navegador aplica os filtros instantaneamente
 * (src/client/filters.ts) e mantém o estado na URL (?ano=2027&professor=joao-silva),
 * então uma consulta pode ser compartilhada.
 *
 * Dois níveis: "item" (ex.: módulo) e "sub" (ex.: aula dentro do módulo).
 * Filtros de nível "sub" mostram o item quando pelo menos uma sub-linha casa.
 */
import { normalizeText, tokenize } from '@/lib/text'

export type FilterOption = { value: string; label: string }

export type FilterDef = {
  param: string
  label: string
  kind: 'select' | 'text'
  level: 'item' | 'sub'
  options?: FilterOption[]
  placeholder?: string
  /** Destaca as sub-linhas que casam (ex.: "Sua aula" ao filtrar por professor). */
  highlight?: boolean
}

export type FilterState = Record<string, string>

/** Atributos de filtro: cada parâmetro → lista de valores (tokens). */
export type FilterAttrs = Record<string, string[]>

export type FilterableSub = { attrs: FilterAttrs; text: string }
export type FilterableItem = { key: string; attrs: FilterAttrs; text: string; subs: FilterableSub[] }

export type ItemResult = { visible: boolean; subs: boolean[] }

const MAX_TEXT = 80

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(source: ParamSource, name: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(name) ?? undefined
  const raw = source[name]
  return Array.isArray(raw) ? raw[0] : raw
}

/** Lê o estado da URL, ignorando parâmetros desconhecidos e valores inválidos. */
export function parseFilters(source: ParamSource, defs: FilterDef[]): FilterState {
  const state: FilterState = {}
  for (const def of defs) {
    const value = readParam(source, def.param)?.trim().slice(0, MAX_TEXT)
    if (!value) continue
    if (def.kind === 'select' && !def.options?.some((o) => o.value === value)) continue
    state[def.param] = value
  }
  return state
}

export function filtersToParams(state: FilterState, defs: FilterDef[]): URLSearchParams {
  const params = new URLSearchParams()
  for (const def of defs) if (state[def.param]) params.set(def.param, state[def.param]!)
  return params
}

/** Texto (já normalizado) contém todos os termos da consulta. */
export function textMatches(query: string, normalizedText: string): boolean {
  return tokenize(query).every((term) => normalizedText.includes(term))
}

function matches(def: FilterDef, value: string, attrs: FilterAttrs, text: string): boolean {
  if (def.kind === 'text') return textMatches(value, text)
  return (attrs[def.param] ?? []).includes(value)
}

/**
 * Aplica os filtros (E lógico entre eles).
 * - Filtros de nível "item" precisam casar com o item.
 * - Filtros de nível "sub" listam as sub-linhas que casam; o item aparece se listar alguma.
 * - Filtro de texto de nível "sub" também aceita o texto do item-pai (ex.: tema do módulo):
 *   sozinho, mostra o módulo sem listar aulas; combinado com outro filtro, lista as aulas
 *   que casam com esse outro filtro.
 */
export function evaluate(items: FilterableItem[], defs: FilterDef[], state: FilterState): ItemResult[] {
  const active = defs.filter((d) => state[d.param])
  const itemDefs = active.filter((d) => d.level === 'item')
  const subDefs = active.filter((d) => d.level === 'sub')
  const subText = subDefs.filter((d) => d.kind === 'text')
  const subSelect = subDefs.filter((d) => d.kind === 'select')

  return items.map((item) => {
    const none = item.subs.map(() => false)
    if (!itemDefs.every((d) => matches(d, state[d.param]!, item.attrs, item.text))) return { visible: false, subs: none }
    if (subDefs.length === 0) return { visible: true, subs: none }

    const textOnItem = subText.length > 0 && subText.every((d) => textMatches(state[d.param]!, item.text))
    const subs = item.subs.map(
      (sub) =>
        subSelect.every((d) => matches(d, state[d.param]!, sub.attrs, sub.text)) &&
        subText.every((d) => textMatches(state[d.param]!, sub.text) || (textOnItem && subSelect.length > 0)),
    )
    const visible = subs.some(Boolean) || (textOnItem && subSelect.length === 0)
    return { visible, subs }
  })
}

export function hasSubFilters(defs: FilterDef[], state: FilterState): boolean {
  return defs.some((d) => d.level === 'sub' && state[d.param])
}

export type ActiveFilter = { param: string; label: string; valueLabel: string }

export function activeFilters(defs: FilterDef[], state: FilterState): ActiveFilter[] {
  return defs
    .filter((def) => state[def.param])
    .map((def) => {
      const value = state[def.param]!
      return { param: def.param, label: def.label, valueLabel: def.options?.find((o) => o.value === value)?.label ?? `“${value}”` }
    })
}

// ── Utilitários para montar opções e atributos ──────────────────────────────

export function optionKey(value: string): string {
  return normalizeText(value).replace(/ /g, '-')
}

export function uniqueOptions(values: (string | null | undefined)[]): FilterOption[] {
  const map = new Map<string, string>()
  for (const value of values) {
    if (!value) continue
    const key = optionKey(value)
    if (!map.has(key)) map.set(key, value)
  }
  return [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

/** Texto normalizado para busca, a partir de vários campos. */
export function searchText(...parts: (string | null | undefined)[]): string {
  return normalizeText(parts.filter(Boolean).join(' '))
}

/** Serializa atributos de filtro para data-attributes (data-f-<param>="a b c"). */
export function filterDataAttrs(attrs: FilterAttrs, text: string): Record<string, string> {
  const out: Record<string, string> = { 'data-text': text }
  for (const [param, values] of Object.entries(attrs)) out[`data-f-${param}`] = values.join(' ')
  return out
}
