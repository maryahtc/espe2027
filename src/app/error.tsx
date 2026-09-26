'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message)
  }, [error])

  return (
    <div className="py-20 md:py-32">
      <p className="label">Indisponível no momento</p>
      <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Não foi possível carregar os dados agora.</h1>
      <p className="mt-3 max-w-md text-muted">
        A fonte de dados está temporariamente indisponível. Tente novamente em alguns instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink-2"
      >
        Tentar novamente
      </button>
    </div>
  )
}
