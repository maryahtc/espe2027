import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { FormMessage, SignInForm } from '@/components/auth/forms'
import { getAuth, nextStep } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Entrar' }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; saiu?: string }> }) {
  const { next, saiu } = await searchParams
  const auth = await getAuth()
  if (auth === 'previa') {
    return (
      <AuthCard eyebrow="Prévia" title="Login ainda não configurado" lead="Este ambiente não está ligado ao banco. O portal funciona só com dados fictícios.">
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">
          Abrir a prévia
        </Link>
      </AuthCard>
    )
  }
  if (auth) redirect(nextStep(auth, next))
  return (
    <AuthCard eyebrow="Portal do Aluno" title="Entrar" lead="Use o e-mail em que você recebeu o convite.">
      {saiu ? (
        <div className="mb-5">
          <FormMessage state={{ aviso: 'Você saiu da sua conta neste aparelho.' }} />
        </div>
      ) : null}
      <SignInForm next={next} />
    </AuthCard>
  )
}
