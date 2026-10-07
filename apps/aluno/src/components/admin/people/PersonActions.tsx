'use client'

import { useActionState } from 'react'
import { renewInvite, resetPersonMfa } from '@/lib/admin/people-actions'
import { ActionResult } from './ActionResult'

const quiet = 'text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-45'

export function PersonActions({ id, email, pending, hasMfa, isSelf }: { id: string; email: string; pending: boolean; hasMfa: boolean; isSelf: boolean }) {
  const [renewState, renew, renewing] = useActionState(renewInvite, undefined)
  const [mfaState, reset, resetting] = useActionState(resetPersonMfa, undefined)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {pending ? (
          <>
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
          </>
        ) : null}
        {hasMfa && !isSelf ? (
          <form
            action={reset}
            onSubmit={(e) => {
              if (!confirm('Redefinir o 2FA desta pessoa? Ela vai configurar de novo na próxima entrada.')) e.preventDefault()
            }}
          >
            <input type="hidden" name="id" value={id} />
            <button type="submit" disabled={resetting} className={quiet}>
              Redefinir 2FA
            </button>
          </form>
        ) : null}
      </div>
      <ActionResult state={renewState} />
      <ActionResult state={mfaState} />
    </div>
  )
}
