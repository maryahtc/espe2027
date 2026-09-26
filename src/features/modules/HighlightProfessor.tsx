'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Destaca as aulas de um professor quando a URL traz ?professor=slug
 * (link "Ver módulo completo" da página do professor). Mantém a página estática.
 */
export function HighlightProfessor() {
  const slug = useSearchParams().get('professor')

  useEffect(() => {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return
    const items = document.querySelectorAll<HTMLElement>(`[data-prof~="${slug}"]`)
    items.forEach((el) => el.setAttribute('data-highlight', 'true'))
    if (!window.location.hash) items[0]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return () => items.forEach((el) => el.removeAttribute('data-highlight'))
  }, [slug])

  return null
}
