'use client'

import { Button, type ButtonVariant } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { type ReactNode, useActionState } from 'react'
import type { ActionState } from '@/lib/admin/academic-actions'

/**
 * Formulário do painel ligado a uma ação de servidor: botão com estado de envio e retorno curto
 * (✓ salvo / ⚠ erro). `confirmText` pede confirmação antes de enviar (mudanças com impacto).
 */
export function ActionForm({
  action,
  children,
  submit = 'Salvar',
  variant = 'secondary',
  confirmText,
  className,
  row = false,
  quiet = false,
  silent = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children?: ReactNode
  submit?: string
  variant?: ButtonVariant
  confirmText?: string
  className?: string
  /** Campos e botão na mesma linha (formulários curtos). */
  row?: boolean
  /** Botão só texto (ações secundárias: remover, mover). */
  quiet?: boolean
  /** Não mostra o "✓ salvo" (botões compactos); erros continuam aparecendo. */
  silent?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault()
      }}
      className={cn(row ? 'flex flex-wrap items-end gap-3' : 'space-y-4', className)}
    >
      {children}
      <div className={cn('flex flex-wrap items-center gap-3', row && 'min-h-10')}>
        {quiet ? (
          <button type="submit" disabled={pending} className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-45">
            {pending ? 'Aguarde…' : submit}
          </button>
        ) : (
          <Button type="submit" variant={variant} disabled={pending} className={row ? 'min-h-10' : undefined}>
            {pending ? 'Salvando…' : submit}
          </Button>
        )}
        {state?.erro ? (
          <span role="alert" className="text-xs font-semibold text-danger">
            ⚠ {state.erro}
          </span>
        ) : state?.aviso && !silent ? (
          <span role="status" className="text-xs text-muted">
            ✓ {state.aviso}
          </span>
        ) : null}
      </div>
    </form>
  )
}
