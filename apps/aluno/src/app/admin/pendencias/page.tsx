import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TaskBoardPage } from '@/components/tasks/TaskBoardPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Pendências' }

/** Bloco A · B2 — quadro de pendências do Admin (todas as turmas e pendências gerais). */
export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  return <TaskBoardPage auth={auth} sp={await searchParams} path="/admin/pendencias" eyebrow="Acompanhamento" />
}
