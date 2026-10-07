'use client'

import { Button } from '@portal/ui/button'
import { Field } from '@portal/ui/field'
import { useActionState } from 'react'
import { FormMessage } from '@/components/auth/forms'
import { updateMyName } from '@/lib/people/actions'

export function NameForm({ fullName, displayName, email }: { fullName: string; displayName: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateMyName, undefined)
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome completo" name="nome" defaultValue={fullName} required autoComplete="name" />
        <Field label="Nome de exibição" name="exibicao" defaultValue={displayName ?? ''} hint="Como você aparece no portal. Opcional." autoComplete="nickname" />
      </div>
      <div>
        <p className="text-xs text-muted">E-mail</p>
        <p className="mt-0.5 text-[15px] break-all">{email}</p>
      </div>
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar nome'}
      </Button>
    </form>
  )
}
