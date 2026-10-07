'use client'

import { useActionState } from 'react'
import { reactivatePerson, removePerson, resendAccess } from '@/lib/admin/people-actions'
import { ActionResult } from './ActionResult'

const btn = 'glass glass-interactive inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold disabled:opacity-45'
const quiet = 'text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-45'

/**
 * Reenviar acesso (convite ou nova senha, conforme o estado da conta) e excluir/desativar com segurança.
 */
export function PersonActions({
  id,
  name,
  firstAccess,
  deactivated,
  isSelf,
}: {
  id: string
  name: string
  firstAccess: boolean
  deactivated: boolean
  isSelf: boolean
}) {
  const [resendState, resend, resending] = useActionState(resendAccess, undefined)
  const [removeState, remove, removing] = useActionState(removePerson, undefined)
  const [reactState, reactivate, reactivating] = useActionState(reactivatePerson, undefined)

  if (deactivated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Acesso desativado: não entra no portal. O histórico está preservado.</p>
        <form action={reactivate}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" disabled={reactivating} className={btn}>
            Reativar acesso
          </button>
        </form>
        <ActionResult state={reactState} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold">Reenviar acesso</h3>
        <p className="mt-1 text-xs text-muted">
          {firstAccess
            ? 'Ainda não fez o primeiro acesso: gera um novo convite (o anterior deixa de valer).'
            : 'Já tem conta e senha: gera um link para criar uma nova senha. Nenhuma conta nova é criada.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form action={resend}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="envio" value="link" />
            <button type="submit" disabled={resending} className={btn}>
              Gerar link para copiar
            </button>
          </form>
          <form action={resend}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="envio" value="email" />
            <button type="submit" disabled={resending} className={quiet}>
              Enviar por e-mail
            </button>
          </form>
        </div>
        <div className="mt-3">
          <ActionResult state={resendState} />
        </div>
      </section>

      {!isSelf ? (
        <section className="border-t border-rule pt-4">
          <h3 className="text-sm font-semibold">Excluir</h3>
          <p className="mt-1 text-xs text-muted">
            Sem histórico, a conta é apagada. Com histórico (já entrou, aceitou o termo, fez alterações), o acesso é desativado e nada é perdido.
          </p>
          <form
            action={remove}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Excluir ${name}?\n\nSe a pessoa já tiver histórico no portal, o acesso será DESATIVADO (ela não entra mais) e o histórico será preservado. Sem histórico, a conta será apagada.`,
                )
              )
                e.preventDefault()
            }}
            className="mt-3"
          >
            <input type="hidden" name="id" value={id} />
            <button type="submit" disabled={removing} className="text-sm font-semibold text-danger underline-offset-4 hover:underline disabled:opacity-45">
              Excluir…
            </button>
          </form>
          <div className="mt-2">
            <ActionResult state={removeState} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
