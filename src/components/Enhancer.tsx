'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { browserLocation, enhanceChrome, enhanceRoot } from '@/client'

/** Cabeçalho: menu do celular e item ativo (a cada navegação). */
export function ChromeEnhancer() {
  const pathname = usePathname()
  useEffect(() => enhanceChrome(browserLocation), [pathname])
  return null
}

/**
 * Colocado como ÚLTIMO filho de uma área interativa: ativa a área só depois que o
 * React terminou de montá-la (evita conflito de hidratação).
 */
export function Activate() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = ref.current?.parentElement
    return root ? enhanceRoot(root, browserLocation) : undefined
  }, [])
  return <span ref={ref} hidden />
}
