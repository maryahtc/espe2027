'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { establishSessionFromLink } from '@/lib/auth/actions'
import { FormMessage } from './forms'

const EXPIRED = 'Este link expirou ou já foi usado. Peça um novo.'

/** Lê a sessão do fragmento (#…), apaga-o do endereço e entrega ao servidor. */
export function LinkReturn() {
  const [state, action] = useActionState(establishSessionFromLink, undefined)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    window.history.replaceState(null, '', window.location.pathname)
    const access = fragment.get('access_token')
    const refresh = fragment.get('refresh_token')
    if (fragment.get('error') || !access || !refresh) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resultado lido uma única vez do endereço
      setLinkError(fragment.get('error') ? EXPIRED : 'Link inválido.')
      return
    }
    const data = new FormData()
    data.set('access_token', access)
    data.set('refresh_token', refresh)
    data.set('type', fragment.get('type') ?? '')
    startTransition(() => action(data))
  }, [action])

  const erro = linkError ?? state?.erro
  if (!erro) return <p className="text-sm text-muted">Aguarde um instante…</p>
  return (
    <div className="space-y-5">
      <FormMessage state={{ erro }} />
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          Pedir um novo link
        </Link>
      </p>
    </div>
  )
}
