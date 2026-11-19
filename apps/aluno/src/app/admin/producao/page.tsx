import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CohortPanelPage } from '@/components/cohort/CohortPanelPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Produção da turma' }

/** Etapa 10 — Admin → Produção da turma: o mesmo painel da Visão da turma, com todas as turmas. */
export default async function AdminProductionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  return <CohortPanelPage auth={auth} path="/admin/producao" eyebrow="Acompanhamento" title="Produção da turma" sp={await searchParams} />
}
