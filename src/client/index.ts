/**
 * Ponto de entrada do JavaScript do portal (progressive enhancement).
 * O HTML chega completo do servidor; aqui só adicionamos interatividade.
 * Usado pelo portal (componentes Activate/ChromeEnhancer) e pela prévia de página única.
 */
import { initClearButtons, initHighlight, initMenu, markActiveNav } from './chrome'
import { initFilters } from './filters'
import type { PageLocation } from './location'
import { initSearch } from './search'

export type { PageLocation } from './location'
export { browserLocation } from './location'

/** Cabeçalho: menu do celular e item ativo da navegação. */
export function enhanceChrome(location: PageLocation): () => void {
  const controller = new AbortController()
  markActiveNav(location.pathname())
  initMenu(controller.signal)
  return () => controller.abort()
}

/** Ativa uma área da página (filtros, busca, destaque de professor). Retorna a limpeza. */
export function enhanceRoot(root: HTMLElement, location: PageLocation): () => void {
  const controller = new AbortController()
  const { signal } = controller
  initClearButtons(root, signal)
  if (root.hasAttribute('data-filters')) initFilters(root, location, signal)
  if (root.hasAttribute('data-search')) initSearch(root, location, signal)
  if (root.hasAttribute('data-highlight-root')) initHighlight(root, location)
  return () => controller.abort()
}

/** Ativa todas as áreas dentro de um container (usado pela prévia de página única). */
export function enhanceAll(container: ParentNode, location: PageLocation): () => void {
  const selector = '[data-filters], [data-search], [data-highlight-root], [data-enhance]'
  const cleanups = Array.from(container.querySelectorAll<HTMLElement>(selector)).map((root) => enhanceRoot(root, location))
  return () => cleanups.forEach((fn) => fn())
}
