import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import { notFound } from 'next/navigation'
import { today } from '@/lib/academic/load'
import type { AuthState } from '@/lib/auth/session'
import { loadTaskBoard } from '@/lib/tasks/load'
import { tasksReady } from '@/lib/tasks/schema'
import { TaskBoard } from './TaskBoard'

type SP = Record<string, string | string[] | undefined>
const flat = (sp: SP) => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))

/** Página do quadro (Admin ou coordenação). Sem a migração no banco, mostra só um aviso. */
export async function TaskBoardPage({ auth, sp, path, eyebrow }: { auth: AuthState; sp: SP; path: string; eyebrow: string }) {
  if (!(await tasksReady())) {
    return (
      <>
        <PageTitle eyebrow={eyebrow} title="Pendências" />
        <EmptyState title="Quadro ainda não disponível">O quadro de pendências aparece depois da atualização do banco de dados.</EmptyState>
      </>
    )
  }
  const data = await loadTaskBoard(auth)
  if (!data) notFound()
  return <TaskBoard data={data} sp={flat(sp)} path={path} eyebrow={eyebrow} today={today()} />
}
