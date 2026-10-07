'use client'

import { Button } from '@portal/ui/button'
import { Field } from '@portal/ui/field'
import { useActionState } from 'react'
import { invitePerson } from '@/lib/admin/people-actions'
import type { CohortOption } from '@/lib/admin/people'
import { ActionResult } from './ActionResult'

const ROLE_LABEL = { aluno: 'Aluno', coordenacao: 'Coordenação', admin: 'Administração' } as const

const choice =
  'flex cursor-pointer gap-3 rounded-md border border-rule-strong p-3 text-sm has-[:checked]:border-[rgba(202,44,44,0.7)] has-[:checked]:bg-brand-tint'

export function InviteForm({ roles, cohorts }: { roles: Array<keyof typeof ROLE_LABEL>; cohorts: CohortOption[] }) {
  const [state, action, pending] = useActionState(invitePerson, undefined)
  return (
    <form action={action} className="space-y-5">
      <Field label="Nome completo" name="nome" autoComplete="off" required />
      <Field label="E-mail" name="email" type="email" autoComplete="off" required />
      {roles.length > 1 ? (
        <fieldset>
          <legend className="text-sm font-semibold">Papel</legend>
          <div className="mt-1.5 grid gap-2">
            {roles.map((r, i) => (
              <label key={r} className={choice}>
                <input type="radio" name="papel" value={r} defaultChecked={i === 0} className="mt-0.5 accent-[var(--brand)]" />
                <span>
                  <span className="block font-semibold">{ROLE_LABEL[r]}</span>
                  <span className="text-muted">
                    {r === 'coordenacao' ? 'Acompanha a turma escolhida. 2FA obrigatório.' : r === 'admin' ? 'Acesso total ao painel. 2FA obrigatório.' : 'Acesso ao portal da turma.'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="papel" value={roles[0]} />
      )}
      <div>
        <label htmlFor="turma" className="block text-sm font-semibold">
          Turma
        </label>
        <p className="mt-0.5 text-xs text-muted">Não se aplica a administração.</p>
        <select id="turma" name="turma" className="field mt-1.5 block min-h-11 w-full px-3 text-base" defaultValue={cohorts[0]?.id}>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Como enviar</legend>
        <div className="mt-1.5 grid gap-2">
          <label className={choice}>
            <input type="radio" name="envio" value="email" defaultChecked className="mt-0.5 accent-[var(--brand)]" />
            <span>Enviar convite por e-mail</span>
          </label>
          <label className={choice}>
            <input type="radio" name="envio" value="link" className="mt-0.5 accent-[var(--brand)]" />
            <span>Gerar link para enviar por mensagem</span>
          </label>
        </div>
      </fieldset>
      <ActionResult state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Aguarde…' : 'Convidar'}
      </Button>
    </form>
  )
}
