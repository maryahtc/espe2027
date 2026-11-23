import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LogisticsPage } from '@/components/logistics/LogisticsPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Professores e logística' }

/** Bloco A · B1 — consulta da coordenação (só a própria turma; sem edição). */
export default async function CoordinationLogisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) notFound()
  return <LogisticsPage auth={auth} sp={await searchParams} path="/coordenacao/professores" eyebrow="Coordenação" />
}
