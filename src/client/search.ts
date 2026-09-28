/**
 * Busca global no navegador, sobre o índice público embutido na página /busca.
 */
import { runSearch, type SearchEntry, type SearchGroup } from '@/lib/search'
import { all, el, plural } from './dom'
import type { PageLocation } from './location'

function renderGroup(group: SearchGroup, expanded: boolean, onExpand: () => void): HTMLElement {
  const list = el(
    'ul',
    { className: '-mt-2' },
    group.hits.map((hit) =>
      el('li', { className: 'border-b border-rule' }, [
        el('a', { className: 'group block py-3.5', attrs: { href: hit.href } }, [
          el('span', {
            className:
              'block text-[17px] font-semibold text-ink group-hover:underline group-hover:decoration-rule-strong group-hover:underline-offset-4',
            text: hit.title,
          }),
          ...(hit.subtitle ? [el('span', { className: 'mt-0.5 block text-sm text-muted', text: hit.subtitle })] : []),
        ]),
      ]),
    ),
  )
  const header = el('div', { className: 'mb-4 flex items-end justify-between gap-4 border-b border-ink pb-2' }, [
    el('h2', { className: 'label !text-ink' }, [group.label, el('span', { className: 'data ml-2 font-normal text-muted', text: String(group.total) })]),
  ])
  const section = el('section', { attrs: { 'aria-label': group.label } }, [header, list])
  if (!expanded && group.total > group.hits.length) {
    const more = el('button', {
      className: 'mt-3 inline-flex min-h-11 items-center text-sm font-medium link-underline',
      text: `Ver todos os ${group.total}`,
      attrs: { type: 'button' },
    })
    more.addEventListener('click', onExpand)
    section.append(more)
  }
  return section
}

export function initSearch(root: HTMLElement, location: PageLocation, signal: AbortSignal) {
  const indexNode = root.querySelector('script[data-search-index]')
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')
  const resultsNode = root.querySelector<HTMLElement>('[data-search-results]')
  if (!indexNode?.textContent || !input || !resultsNode) return
  const results: HTMLElement = resultsNode
  const index = JSON.parse(indexNode.textContent) as SearchEntry[]
  const count = root.querySelector<HTMLElement>('[data-search-count]')
  const hint = root.querySelector<HTMLElement>('[data-search-hint]')
  const expanded = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined

  function render(q: string) {
    const query = q.trim()
    if (hint) hint.hidden = !!query
    if (count) count.hidden = !query
    if (!query) {
      results.replaceChildren()
      return
    }
    const groups = runSearch(index, query, 5)
    const total = groups.reduce((n, g) => n + g.total, 0)
    if (count) count.textContent = plural(total, ['resultado', 'resultados'])
    if (groups.length === 0) {
      results.replaceChildren(
        el('div', { className: 'rounded-lg border border-dashed border-rule-strong px-5 py-8 text-center' }, [
          el('p', { className: 'font-display text-xl text-ink', text: `Nenhum resultado encontrado para “${query}”.` }),
          el('p', { className: 'mx-auto mt-2 max-w-sm text-sm text-muted', text: 'Tente outro termo, parte do nome ou sem abreviações.' }),
        ]),
      )
      return
    }
    results.replaceChildren(
      ...groups.map((g) => {
        const full = expanded.has(g.kind) ? runSearch(index, query, Number.POSITIVE_INFINITY).find((x) => x.kind === g.kind)! : g
        return renderGroup(full, expanded.has(g.kind), () => {
          expanded.add(g.kind)
          render(input!.value)
        })
      }),
    )
  }

  function apply() {
    expanded.clear()
    const params = new URLSearchParams()
    if (input!.value.trim()) params.set('q', input!.value.trim())
    location.setParams(params)
    render(input!.value)
  }

  input.value = location.getParams().get('q') ?? ''
  input.addEventListener(
    'input',
    () => {
      clearTimeout(timer)
      timer = setTimeout(apply, 150)
    },
    { signal },
  )
  root.querySelector('form')?.addEventListener(
    'submit',
    (e) => {
      e.preventDefault()
      apply()
    },
    { signal },
  )
  for (const link of all<HTMLAnchorElement>(root, 'a[data-search-example]')) {
    link.addEventListener(
      'click',
      (e) => {
        e.preventDefault()
        input.value = link.dataset.searchExample ?? ''
        apply()
      },
      { signal },
    )
  }
  render(input.value)
  if (!input.value) input.focus()
}
