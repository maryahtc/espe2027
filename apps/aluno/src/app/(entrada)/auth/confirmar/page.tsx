import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { ConfirmLinkForm } from '@/components/auth/forms'

export const metadata: Metadata = { title: 'Confirmar acesso' }

/** Destino dos links de e-mail. Não confirma sozinho: espera o clique (ver confirmEmailLink). */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash: tokenHash, type } = await searchParams
  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) {
    return (
      <AuthCard eyebrow="Link" title="Link inválido" lead="Abra o link exatamente como chegou no e-mail ou peça um novo.">
        <Link href="/esqueci-senha" className="text-sm font-semibold underline underline-offset-4">
          Pedir um novo link
        </Link>
      </AuthCard>
    )
  }
  const invite = type === 'invite'
  return (
    <AuthCard
      eyebrow={invite ? 'Convite' : 'Segurança'}
      title={invite ? 'Bem-vindo ao Portal do Aluno' : 'Redefinir senha'}
      lead={invite ? 'Confirme o convite para criar a sua senha de acesso.' : 'Confirme para criar uma nova senha.'}
    >
      <ConfirmLinkForm tokenHash={tokenHash} type={type} label="Continuar" />
    </AuthCard>
  )
}
