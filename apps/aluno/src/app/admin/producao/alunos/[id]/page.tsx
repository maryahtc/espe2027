import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StudentProductionPage } from '@/components/cohort/StudentProductionPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Produção do aluno' }

/** Etapa 10 — produção individual (só leitura, auditada) para o Admin. */
export default async function AdminStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  return <StudentProductionPage auth={auth} studentId={(await params).id} sp={await searchParams} panelPath="/admin/producao" casesPath="/admin/casos" eyebrow="Produção da turma" />
}
