'use client'

import { cn } from '@portal/ui/cn'
import { startTransition, useActionState } from 'react'
import type { ActionState } from '@/lib/cases/actions'

/** Botão de uma ação do Planejamento (área de toque ≥ 44 px no celular; erro visível; confirmação opcional). */
export function PlanAction({
  action,
  fields,
  label,
  ariaLabel,
  className,
  confirmText,
  data,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>
  fields: Record<string, string>
  label: string
  ariaLabel?: string
  className?: string
  confirmText?: string
  data?: string
}) {
  const [state, run, pending] = useActionState(action, undefined)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (confirmText && !window.confirm(confirmText)) return
        const fd = new FormData(e.currentTarget)
        startTransition(() => run(fd))
      }}
      className="inline-flex flex-wrap items-center gap-2"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-label={ariaLabel}
        data-acao={data}
        className={cn('inline-flex min-h-11 items-center text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-45', className)}
      >
        {pending ? 'Aguarde…' : label}
      </button>
      {state?.erro ? (
        <span role="alert" className="text-xs font-semibold text-danger">
          ⚠ {state.erro}
        </span>
      ) : null}
    </form>
  )
}
