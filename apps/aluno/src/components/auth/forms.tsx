'use client'

import { Button } from '@portal/ui/button'
import { Field } from '@portal/ui/field'
import Link from 'next/link'
import { useActionState } from 'react'
import {
  acceptTerms,
  confirmEmailLink,
  confirmMfaEnrollment,
  type FormState,
  requestPasswordReset,
  setPassword,
  signIn,
  verifyMfa,
} from '@/lib/auth/actions'

/** Erro com ícone e texto (nunca só cor); aviso neutro em superfície rebaixada. */
export function FormMessage({ state }: { state: FormState }) {
  if (state?.erro) {
    return (
      <p role="alert" className="rounded-md bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
        ⚠ {state.erro}
      </p>
    )
  }
  if (state?.aviso) {
    return (
      <p role="status" className="rounded-md bg-sunken px-4 py-3 text-sm leading-relaxed text-ink-2">
        {state.aviso}
      </p>
    )
  }
  return null
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Aguarde…' : children}
    </Button>
  )
}

const codeProps = {
  inputMode: 'numeric' as const,
  autoComplete: 'one-time-code',
  pattern: '[0-9 ]{6,7}',
  maxLength: 7,
  required: true,
  placeholder: '000 000',
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="E-mail" name="email" type="email" autoComplete="username" required autoFocus={!state?.email} defaultValue={state?.email} key={state?.email} />
      <Field label="Senha" name="senha" type="password" autoComplete="current-password" required autoFocus={!!state?.email} />
      <FormMessage state={state} />
      <Submit pending={pending}>Entrar</Submit>
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)
  return (
    <form action={action} className="space-y-5">
      <Field label="E-mail" name="email" type="email" autoComplete="username" required autoFocus />
      <FormMessage state={state} />
      <Submit pending={pending}>Enviar link</Submit>
    </form>
  )
}

export function ConfirmLinkForm({ tokenHash, type, label }: { tokenHash: string; type: string; label: string }) {
  const [state, action, pending] = useActionState(confirmEmailLink, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <FormMessage state={state} />
      <Submit pending={pending}>{label}</Submit>
      {state?.erro ? (
        <p className="text-center text-sm">
          <Link href="/esqueci-senha" className="text-muted underline-offset-4 hover:text-ink hover:underline">
            Pedir um novo link
          </Link>
        </p>
      ) : null}
    </form>
  )
}

export function SetPasswordForm({ next, label }: { next?: string; label: string }) {
  const [state, action, pending] = useActionState(setPassword, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ''} />
      <Field
        label="Nova senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        autoFocus
        hint="Pelo menos 10 caracteres, com letras e números."
      />
      <Field label="Repita a nova senha" name="confirmacao" type="password" autoComplete="new-password" minLength={10} required />
      <FormMessage state={state} />
      <Submit pending={pending}>{label}</Submit>
    </form>
  )
}

export function VerifyMfaForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(verifyMfa, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Código de 6 números" name="codigo" {...codeProps} autoFocus />
      <FormMessage state={state} />
      <Submit pending={pending}>Confirmar</Submit>
    </form>
  )
}

export function EnrollMfaForm({ factorId, next }: { factorId: string; next?: string }) {
  const [state, action, pending] = useActionState(confirmMfaEnrollment, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="factor_id" value={factorId} />
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Código de 6 números" name="codigo" {...codeProps} hint="O código que aparece no aplicativo agora." />
      <FormMessage state={state} />
      <Submit pending={pending}>Ativar verificação</Submit>
    </form>
  )
}

export function AcceptTermsForm({ versionId, next }: { versionId: string; next?: string }) {
  const [state, action, pending] = useActionState(acceptTerms, undefined)
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="versao" value={versionId} />
      <input type="hidden" name="next" value={next ?? ''} />
      <label htmlFor="aceito" className="flex cursor-pointer gap-3 rounded-2xl border border-rule-strong p-4 has-[:checked]:border-[rgba(202,44,44,0.7)] has-[:checked]:bg-brand-tint">
        <input id="aceito" name="aceito" type="checkbox" value="sim" required className="mt-1 accent-[var(--brand)]" />
        <span className="text-[15px]">Li e aceito o termo de uso.</span>
      </label>
      <FormMessage state={state} />
      <Submit pending={pending}>Aceitar e continuar</Submit>
    </form>
  )
}
