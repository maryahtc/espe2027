import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import { notFound } from 'next/navigation'
import type { AuthState } from '@/lib/auth/session'
import { loadLogisticsBoard, type Scope } from '@/lib/logistics/load'
import { logisticsReady } from '@/lib/logistics/schema'
import { LogisticsBoardView } from './LogisticsBoard'

type SP = Record<string, string | string[] | undefined>
const one = (sp: SP, k: string) => {
  const v = sp[k]
  return (Array.isArray(v) ? v[0] : v) ?? undefined
}

export async function LogisticsPage({ auth, sp, path, eyebrow }: { auth: AuthState; sp: SP; path: string; eyebrow: string }) {
  const lead =
    auth.role === 'admin'
      ? 'Quem está confirmado em cada módulo, passagens e hospedagens resolvidas e o que ainda depende da UIOA ou de outra pessoa.'
      : 'Consulta: professores dos módulos da sua turma, confirmação, passagens e hospedagens. Edição pelo Admin.'
  if (!(await logisticsReady())) {
    return (
      <>
        <PageTitle eyebrow={eyebrow} title="Professores e logística" />
        <EmptyState title="Ainda não disponível">Professores e logística aparecem depois da atualização do banco de dados.</EmptyState>
      </>
    )
  }
  const scopeRaw = one(sp, 'escopo')
  const scope: Scope = scopeRaw === 'futuros' || scopeRaw === 'todos' ? scopeRaw : 'proximos'
  const cohort = one(sp, 'turma')
  const board = await loadLogisticsBoard(auth, { scope, cohortId: cohort && /^[0-9a-f-]{36}$/.test(cohort) ? cohort : undefined })
  if (!board) notFound()
  const sit = one(sp, 'situacao')
  const filter = sit === 'pendente' || sit === 'aguardando' || sit === 'resolvido' ? sit : 'todas'
  return (
    <>
      <PageTitle eyebrow={eyebrow} title="Professores e logística" lead={lead} />
      <LogisticsBoardView board={board} path={path} filter={filter} />
    </>
  )
}
