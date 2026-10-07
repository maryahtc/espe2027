import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/AuthCard'
import { LinkReturn } from '@/components/auth/LinkReturn'

export const metadata: Metadata = { title: 'Confirmando acesso' }

/** Destino dos links de e-mail no formato padrão do Supabase (ver establishSessionFromLink). */
export default function LinkReturnPage() {
  return (
    <AuthCard eyebrow="Acesso" title="Confirmando seu link">
      <LinkReturn />
    </AuthCard>
  )
}
