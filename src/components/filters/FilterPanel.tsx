'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { FilterIcon } from '@/components/ui/icons'
import type { FilterDef, FilterState } from '@/lib/filters'

/**
 * Painel de filtros. Funciona sem JavaScript (formulário GET); com JS, aplica
 * cada mudança imediatamente, atualizando a URL (compartilhável).
 * No celular fica recolhido atrás do botão "Filtros".
 */
export function FilterPanel({
  pathname,
  defs,
  state,
  resultLabel,
}: {
  pathname: string
  defs: FilterDef[]
  state: FilterState
  resultLabel: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [values, setValues] = useState<FilterState>(state)
  const activeCount = Object.keys(state).length
  const stateKey = JSON.stringify(state)

  /* eslint-disable react-hooks/set-state-in-effect -- sincroniza com a URL (ex.: chip removido, voltar do navegador) */
  useEffect(() => setHydrated(true), [])
  useEffect(() => {
    const focused = document.activeElement
    setValues((current) => {
      const next: FilterState = { ...state }
      // Não sobrescreve o campo de texto que a pessoa está digitando.
      for (const def of defs) {
        if (def.kind === 'text' && focused instanceof HTMLInputElement && focused.name === def.param) {
          if (current[def.param]) next[def.param] = current[def.param]!
          else delete next[def.param]
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  function apply(next: FilterState) {
    const params = new URLSearchParams()
    for (const def of defs) {
      const value = next[def.param]?.trim()
      if (value) params.set(def.param, value)
    }
    const query = params.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function update(param: string, value: string, delay = 0) {
    const next = { ...values, [param]: value }
    setValues(next)
    if (timer.current) clearTimeout(timer.current)
    if (delay) timer.current = setTimeout(() => apply(next), delay)
    else apply(next)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="painel-filtros"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-rule-strong bg-surface px-4 text-sm font-medium"
        >
          <FilterIcon width={16} height={16} />
          Filtros
          {activeCount ? <span className="data rounded-full bg-ink px-1.5 text-[11px] text-paper">{activeCount}</span> : null}
        </button>
        <p className={`data text-xs text-muted transition-opacity ${pending ? 'opacity-40' : ''}`} aria-live="polite">
          {resultLabel}
        </p>
      </div>

      <form
        id="painel-filtros"
        action={pathname}
        method="get"
        onSubmit={(e) => {
          e.preventDefault()
          apply(values)
        }}
        className={`${open ? 'mt-3 grid' : 'hidden'} grid-cols-1 gap-3 rounded-lg border border-rule bg-surface p-4 md:mt-0 md:grid md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] md:border-0 md:bg-transparent md:p-0`}
      >
        {defs.map((def) => (
          <label key={def.param} className="flex flex-col gap-1.5">
            <span className="label">{def.label}</span>
            {def.kind === 'select' ? (
              <select
                name={def.param}
                value={values[def.param] ?? ''}
                onChange={(e) => update(def.param, e.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-rule-strong bg-surface bg-[length:10px] bg-[right_0.9rem_center] bg-no-repeat pr-8 pl-3 text-[15px] text-ink outline-none focus:border-ink"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236b6a66' stroke-width='1.4'/%3E%3C/svg%3E\")",
                }}
              >
                <option value="">Todos</option>
                {def.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="search"
                name={def.param}
                value={values[def.param] ?? ''}
                placeholder={def.placeholder}
                onChange={(e) => update(def.param, e.target.value, 350)}
                autoComplete="off"
                className="h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-[15px] text-ink placeholder:text-faint outline-none focus:border-ink"
              />
            )}
          </label>
        ))}
        {!hydrated ? (
          <button type="submit" className="h-11 self-end rounded-md bg-ink px-4 text-sm font-semibold text-paper">
            Aplicar
          </button>
        ) : null}
      </form>

      <div className="mt-3 hidden items-center justify-between md:flex">
        <p className={`data text-xs text-muted transition-opacity ${pending ? 'opacity-40' : ''}`} aria-live="polite">
          {resultLabel}
        </p>
        {activeCount ? (
          <Link href={pathname} className="link-underline text-sm" scroll={false}>
            Limpar filtros
          </Link>
        ) : null}
      </div>
    </div>
  )
}
