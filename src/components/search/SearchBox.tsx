'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { CloseIcon, SearchIcon } from '@/components/ui/icons'

/**
 * Campo de busca. Sem JavaScript funciona como formulário GET comum.
 * Com `live`, atualiza ?q= enquanto a pessoa digita (a busca roda no servidor).
 */
export function SearchBox({
  action,
  defaultValue = '',
  placeholder,
  label,
  live = false,
  autoFocus = false,
  size = 'md',
}: {
  action: string
  defaultValue?: string
  placeholder: string
  label: string
  live?: boolean
  autoFocus?: boolean
  size?: 'md' | 'lg'
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function navigate(next: string) {
    const query = next.trim()
    startTransition(() => {
      router.replace(query ? `${action}?q=${encodeURIComponent(query)}` : action, { scroll: false })
    })
  }

  function onChange(next: string) {
    setValue(next)
    if (!live) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => navigate(next), 220)
  }

  const large = size === 'lg'
  return (
    <form action={action} method="get" role="search" className="relative" onSubmit={(e) => {
      if (!live) return
      e.preventDefault()
      navigate(value)
    }}>
      <label htmlFor={`busca-${action}`} className="sr-only">
        {label}
      </label>
      <SearchIcon
        className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted transition-opacity ${pending ? 'animate-pulse' : ''}`}
        width={large ? 22 : 18}
        height={large ? 22 : 18}
      />
      <input
        ref={inputRef}
        id={`busca-${action}`}
        name="q"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className={`w-full rounded-lg border border-rule-strong bg-surface text-ink placeholder:text-faint transition-[border-color,box-shadow] outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(22,22,26,0.08)] [&::-webkit-search-cancel-button]:hidden ${
          large ? 'h-16 pr-14 pl-13 text-[17px] md:text-xl' : 'h-12 pr-12 pl-11 text-base'
        }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            if (live) navigate('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink"
          aria-label="Limpar busca"
        >
          <CloseIcon width={16} height={16} />
        </button>
      ) : null}
    </form>
  )
}
