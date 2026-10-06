/**
 * Comportamentos gerais: menu do celular, item ativo da navegação, botão "limpar"
 * dos campos de busca e destaque das aulas de um professor (?professor=slug).
 */
import { all } from './dom'
import type { PageLocation } from './location'

export function markActiveNav(pathname: string) {
  for (const link of all<HTMLAnchorElement>(document, 'a[data-nav]')) {
    const href = link.getAttribute('href') ?? ''
    const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
}

export function initMenu(signal: AbortSignal) {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-menu]')
  if (!dialog) return
  for (const button of all(document, '[data-menu-open]')) {
    button.addEventListener('click', () => dialog.showModal(), { signal })
  }
  for (const button of all(dialog, '[data-menu-close], a')) {
    button.addEventListener('click', () => dialog.close(), { signal })
  }
  dialog.addEventListener(
    'click',
    (e) => {
      if (e.target === dialog) dialog.close()
    },
    { signal },
  )
}

export function initClearButtons(root: ParentNode, signal: AbortSignal) {
  for (const wrapper of all(root, '[data-clearable]')) {
    const input = wrapper.querySelector('input')
    const button = wrapper.querySelector<HTMLButtonElement>('[data-clear-input]')
    if (!input || !button) continue
    const sync = () => (button.hidden = !input.value)
    input.addEventListener('input', sync, { signal })
    button.addEventListener(
      'click',
      () => {
        input.value = ''
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.focus()
      },
      { signal },
    )
    sync()
  }
}

export function initHighlight(root: ParentNode, location: PageLocation) {
  const slug = location.getParams().get('professor')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return
  const items = all(root, `[data-prof~="${slug}"]`)
  items.forEach((item) => item.setAttribute('data-highlight', 'true'))
  items[0]?.scrollIntoView({ block: 'center' })
}
