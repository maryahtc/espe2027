'use client'

import { useActionState } from 'react'
import { renewInvite } from '@/lib/admin/people-actions'
import { ActionResult } from './ActionResult'

const quiet = 'text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-45'

/** Convite pendente: gerar novo link ou reenviar o e-mail. */
export function PersonActions({ email, pending }: { email: string; pending: boolean }) {
  const [renewState, renew, renewing] = useActionState(renewInvite, undefined)
  if (!pending) return null
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <form action={renew}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="envio" value="link" />
          <button type="submit" disabled={renewing} className={quiet}>
            Gerar novo link
          </button>
        </form>
        <form action={renew}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="envio" value="email" />
          <button type="submit" disabled={renewing} className={quiet}>
            Reenviar e-mail
          </button>
        </form>
      </div>
      <ActionResult state={renewState} />
    </div>
  )
}
