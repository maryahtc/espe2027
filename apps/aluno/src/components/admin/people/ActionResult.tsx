'use client'

import { useState } from 'react'
import { FormMessage } from '@/components/auth/forms'
import type { PeopleFormState } from '@/lib/admin/people-actions'

/** Resultado de uma ação do painel; quando há link de convite, mostra com botão de copiar. */
export function ActionResult({ state }: { state: PeopleFormState }) {
  const [copied, setCopied] = useState(false)
  if (!state) return null
  return (
    <div className="space-y-2">
      <FormMessage state={state} />
      {state.link ? (
        <div className="flex gap-2">
          <input readOnly value={state.link} aria-label="Link de convite" className="field min-h-10 w-full min-w-0 px-3 text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="glass glass-interactive shrink-0 rounded-full px-4 text-xs font-semibold"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link ?? '')
              setCopied(true)
            }}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
