import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TaskBoardPage } from '@/components/tasks/TaskBoardPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Pendências' }

/** Bloco A · B2 — quadro de pendências da coordenação (só as turmas que coordena). */
export default async function CoordinationTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) notFound()
  return <TaskBoardPage auth={auth} sp={await searchParams} path="/coordenacao/pendencias" eyebrow="Coordenação" />
}
