/**
 * Filtros no navegador. Lê a marcação gerada no servidor (src/components/filters/FilterPanel.tsx)
 * e aplica a lógica pura de src/lib/filters.ts. Estado sempre refletido na URL.
 *
 * Contrato de marcação (dentro de [data-filters]):
 *   script[data-filter-defs]       JSON com FilterDef[]
 *   [data-filter-control=param]    select/input de cada filtro
 *   [data-item][data-key]          item filtrável (data-f-<param>, data-text)
 *     [data-sub-list] > [data-sub-item]   sub-linhas (mostradas só com filtro de nível "sub")
 *   [data-filter-group]            agrupador escondido quando fica vazio
 *   [data-filter-count]            texto "7 módulos · 13 aulas" (data-count-item / data-count-sub no root)
 *   [data-filter-chips]            chips dos filtros ativos
 *   [data-filter-clear]            botão "Limpar filtros"
 *   [data-filter-empty]            estado vazio
 *   [data-filter-echo=param]       repete o valor do filtro (ex.: termo buscado)
 *   [data-when-idle]               visível só sem filtros
 *   [data-filter-toggle]           abre/fecha o painel no celular
 *   a[data-carry=param]            links que levam o valor do filtro adiante
 */
import {
  activeFilters,
  evaluate,
  filtersToParams,
  hasSubFilters,
  parseFilters,
  type FilterableItem,
  type FilterDef,
  type FilterState,
} from '@/lib/filters'
import { all, el, plural } from './dom'
import type { PageLocation } from './location'

function readItem(node: HTMLElement, defs: FilterDef[]): FilterableItem {
  const attrsOf = (n: HTMLElement) =>
    Object.fromEntries(defs.map((d) => [d.param, (n.getAttribute(`data-f-${d.param}`) ?? '').split(' ').filter(Boolean)]))
  return {
    key: node.dataset.key ?? '',
    attrs: attrsOf(node),
    text: node.dataset.text ?? '',
    subs: all(node, '[data-sub-item]').map((sub) => ({ attrs: attrsOf(sub), text: sub.dataset.text ?? '' })),
  }
}

export function initFilters(root: HTMLElement, location: PageLocation, signal: AbortSignal) {
  const defsNode = root.querySelector('script[data-filter-defs]')
  if (!defsNode?.textContent) return
  const defs = JSON.parse(defsNode.textContent) as FilterDef[]
  const nodes = all(root, '[data-item]')
  const items = nodes.map((n) => readItem(n, defs))
  const controls = new Map(
    defs.map((d) => [d.param, root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-filter-control="${d.param}"]`)]),
  )
  const countItem = (root.dataset.countItem ?? 'item|itens').split('|') as [string, string]
  const countSub = (root.dataset.countSub ?? 'item|itens').split('|') as [string, string]
  let state: FilterState = parseFilters(location.getParams(), defs)
  let timer: ReturnType<typeof setTimeout> | undefined

  function render() {
    const results = evaluate(items, defs, state)
    const subActive = hasSubFilters(defs, state)
    const active = Object.keys(state).length > 0
    const highlightParams = defs.filter((d) => d.highlight && state[d.param]).map((d) => d.param)

    const visibleKeys = new Set<string>()
    let subCount = 0
    nodes.forEach((node, i) => {
      const result = results[i]!
      node.hidden = !result.visible
      if (result.visible) visibleKeys.add(items[i]!.key)
      const list = node.querySelector<HTMLElement>('[data-sub-list]')
      if (list) list.hidden = !subActive || !result.subs.some(Boolean)
      all(node, '[data-sub-item]').forEach((sub, j) => {
        const shown = subActive && !!result.subs[j]
        sub.hidden = !shown
        if (shown && result.visible) subCount++
        const highlight = shown && highlightParams.length > 0
        if (highlight) sub.setAttribute('data-highlight', 'true')
        else sub.removeAttribute('data-highlight')
      })
    })
    root.toggleAttribute('data-filtering', active)
    root.setAttribute('data-filtering-level', subActive ? 'sub' : active ? 'item' : 'none')

    for (const group of all(root, '[data-filter-group]')) {
      group.hidden = !all(group, '[data-item]').some((n) => !n.hidden)
    }
    for (const node of all(root, '[data-filter-empty]')) node.hidden = visibleKeys.size > 0
    for (const node of all(root, '[data-when-idle]')) node.hidden = active
    for (const node of all(root, '[data-filter-clear]')) node.hidden = !active
    for (const node of all(root, '[data-filter-echo]')) node.textContent = state[node.dataset.filterEcho ?? ''] ?? ''

    const label = plural(visibleKeys.size, countItem) + (subActive ? ` · ${plural(subCount, countSub)}` : '')
    for (const node of all(root, '[data-filter-count]')) node.textContent = label
    for (const node of all(root, '[data-filter-badge]')) {
      node.textContent = String(Object.keys(state).length)
      node.hidden = !active
    }

    for (const chips of all(root, '[data-filter-chips]')) {
      chips.replaceChildren(
        ...activeFilters(defs, state).map((f) => {
          const button = el(
            'button',
            {
              className:
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink bg-ink px-3 text-[13px] text-paper',
              attrs: { type: 'button', 'aria-label': `Remover filtro ${f.label}: ${f.valueLabel}` },
            },
            [f.valueLabel, el('span', { text: '×', attrs: { 'aria-hidden': 'true' }, className: 'text-base leading-none' })],
          )
          button.addEventListener('click', () => update({ ...state, [f.param]: '' }), { signal })
          return button
        }),
      )
      chips.hidden = !active
    }

    for (const link of all<HTMLAnchorElement>(root, 'a[data-carry]')) {
      const base = link.dataset.baseHref ?? link.getAttribute('href') ?? ''
      link.dataset.baseHref = base
      const value = state[link.dataset.carry ?? '']
      const [path, hash] = base.split('#')
      link.setAttribute('href', value ? `${path}?${link.dataset.carry}=${encodeURIComponent(value)}${hash ? `#${hash}` : ''}` : base)
    }
  }

  function syncControls() {
    for (const def of defs) {
      const control = controls.get(def.param)
      if (control && document.activeElement !== control) control.value = state[def.param] ?? ''
    }
  }

  function update(next: FilterState) {
    state = parseFilters(filtersToParams(next, defs), defs)
    location.setParams(filtersToParams(state, defs))
    syncControls()
    render()
  }

  for (const def of defs) {
    const control = controls.get(def.param)
    if (!control) continue
    const event = def.kind === 'text' ? 'input' : 'change'
    control.addEventListener(
      event,
      () => {
        clearTimeout(timer)
        const apply = () => update({ ...state, [def.param]: control.value })
        if (def.kind === 'text') timer = setTimeout(apply, 200)
        else apply()
      },
      { signal },
    )
  }
  root.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault(), { signal })
  for (const button of all(root, '[data-filter-clear]')) {
    button.addEventListener('click', () => update({}), { signal })
  }
  for (const toggle of all(root, '[data-filter-toggle]')) {
    toggle.addEventListener(
      'click',
      () => {
        const open = root.toggleAttribute('data-open')
        toggle.setAttribute('aria-expanded', String(open))
      },
      { signal },
    )
  }
  window.addEventListener(
    'popstate',
    () => {
      state = parseFilters(location.getParams(), defs)
      syncControls()
      render()
    },
    { signal },
  )

  syncControls()
  render()
  root.setAttribute('data-ready', '')
}
