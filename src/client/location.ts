/**
 * Onde o estado da página (filtros, busca) é lido e gravado.
 * No portal: a URL real (?ano=2027). Na prévia de página única: o trecho após "#".
 */
export interface PageLocation {
  pathname(): string
  getParams(): URLSearchParams
  setParams(params: URLSearchParams): void
  /** Navega para outra página do portal. */
  go(href: string): void
}

export const browserLocation: PageLocation = {
  pathname: () => window.location.pathname,
  getParams: () => new URLSearchParams(window.location.search),
  setParams(params) {
    const query = params.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', url)
  },
  go(href) {
    window.location.assign(href)
  },
}
