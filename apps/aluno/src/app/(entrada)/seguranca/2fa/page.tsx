import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { VerifyMfaForm } from '@/components/auth/forms'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { nextStep, requireSignedIn, safeNext } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Verificação em duas etapas' }

export default async function VerifyMfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const auth = await requireSignedIn()
  const target = safeNext(next)
  if (!auth.hasVerifiedFactor) redirect(`/seguranca/2fa/configurar${target ? `?next=${encodeURIComponent(target)}` : ''}`)
  if (auth.aal === 'aal2') redirect(nextStep(auth, target))
  return (
    <AuthCard
      eyebrow="Verificação em duas etapas"
      title="Digite o código"
      lead="Abra o aplicativo autenticador no celular e digite o código de 6 números do Portal Conexo."
    >
      <VerifyMfaForm next={target ?? undefined} />
      <div className="mt-6 space-y-2 text-center text-sm text-muted">
        <p>Perdeu o acesso ao aplicativo? Fale com a administração do curso.</p>
        <SignOutButton quiet label="Sair" />
      </div>
    </AuthCard>
  )
}
