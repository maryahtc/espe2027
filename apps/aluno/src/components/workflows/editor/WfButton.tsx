'use client'

import { buttonClasses } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { startTransition, useActionState } from 'react'
import type { ActionState } from '@/lib/workflows/actions'

/**
 * Botão de uma ação do editor de Workflows (↑ ↓, excluir, publicar…): área de toque ≥ 44 px, erro visível ao lado,
 * confirmação só quando pedida (ações destrutivas/importantes).
 */
export function WfButton({
  action,
  fields,
  label,
  ariaLabel,
  confirmText,
  data,
  disabled = false,
  variant = 'quiet',
  className,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>
  fields: Record<string, string>
  label: string
  ariaLabel?: string
  confirmText?: string
  data?: string
  disabled?: boolean
  variant?: 'quiet' | 'icon' | 'primary' | 'secondary' | 'danger'
  className?: string
}) {
  const [state, run, pending] = useActionState(action, undefined)
  const styles = {
    quiet: 'min-h-11 px-1 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline',
    icon: 'size-11 justify-center rounded-full border border-rule text-base text-muted hover:border-rule-strong hover:text-ink',
    primary: buttonClasses('primary'),
    secondary: buttonClasses('secondary'),
    danger: 'min-h-11 px-1 text-sm font-semibold text-danger underline-offset-4 hover:underline',
  }[variant]
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
        disabled={pending || disabled}
        aria-label={ariaLabel}
        data-acao={data}
        className={cn('inline-flex items-center disabled:cursor-not-allowed disabled:opacity-35', styles, className)}
      >
        {pending && variant !== 'icon' ? 'Aguarde…' : label}
      </button>
      {state?.erro ? (
        <span role="alert" className="text-xs font-semibold text-danger">
          ⚠ {state.erro}
        </span>
      ) : null}
    </form>
  )
}

/** ↑ ↓ de uma linha. */
export function MoveButtons({
  action,
  id,
  first,
  last,
  name,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>
  id: string
  first: boolean
  last: boolean
  name: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <WfButton action={action} fields={{ id, dir: 'up' }} label="↑" ariaLabel={`Subir ${name}`} data="subir" variant="icon" disabled={first} />
      <WfButton action={action} fields={{ id, dir: 'down' }} label="↓" ariaLabel={`Descer ${name}`} data="descer" variant="icon" disabled={last} />
    </span>
  )
}
