import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LogisticsPage } from '@/components/logistics/LogisticsPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Professores e logística' }

/** Bloco A · B1 — professores, confirmação e logística por módulo (Admin edita). */
export default async function AdminLogisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  return <LogisticsPage auth={auth} sp={await searchParams} path="/admin/professores" eyebrow="Especialização" />
}
