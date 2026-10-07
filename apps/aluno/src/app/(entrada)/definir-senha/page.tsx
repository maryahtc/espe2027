import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { SetPasswordForm } from '@/components/auth/forms'
import { requireSignedIn } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Senha' }

const COPY = {
  convite: { eyebrow: 'Primeiro acesso', title: 'Crie sua senha', lead: 'É com ela e com o seu e-mail que você vai entrar no portal.' },
  recuperacao: { eyebrow: 'Segurança', title: 'Nova senha', lead: 'Escolha uma senha que você não use em outros sites.' },
  alterar: { eyebrow: 'Conta', title: 'Alterar senha', lead: 'Escolha uma senha que você não use em outros sites.' },
}

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ motivo?: string; next?: string }> }) {
  const { motivo, next } = await searchParams
  const auth = await requireSignedIn()
  // Conta com 2FA: trocar a senha exige a sessão confirmada com o código.
  if (auth.hasVerifiedFactor && auth.aal !== 'aal2') redirect('/seguranca/2fa?next=/definir-senha')
  const copy = motivo === 'convite' ? COPY.convite : motivo === 'recuperacao' ? COPY.recuperacao : COPY.alterar
  return (
    <AuthCard eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}>
      <SetPasswordForm next={next ?? (motivo ? undefined : '/perfil')} label="Salvar senha" />
      {!motivo ? (
        <p className="mt-6 text-center text-sm">
          <Link href="/perfil" className="text-muted underline-offset-4 hover:text-ink hover:underline">
            ← Voltar ao perfil
          </Link>
        </p>
      ) : null}
    </AuthCard>
  )
}
