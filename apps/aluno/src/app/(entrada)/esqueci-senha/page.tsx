import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { ForgotPasswordForm } from '@/components/auth/forms'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Segurança"
      title="Esqueci minha senha"
      lead="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/entrar" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Voltar para entrar
        </Link>
      </p>
    </AuthCard>
  )
}
