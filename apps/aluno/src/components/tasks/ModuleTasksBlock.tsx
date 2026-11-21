import Link from 'next/link'
import { today } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { loadTaskBoard } from '@/lib/tasks/load'
import { isOpen, isOverdue, sortTasks, STATUS_LABEL } from '@/lib/tasks/model'

/** Pendências de um módulo no editor do Admin (só leitura; edição no quadro). */
export async function ModuleTasksBlock({ moduleId }: { moduleId: string }) {
  const auth = await requireUser(['admin'])
  if (!auth) return null
  const data = await loadTaskBoard(auth, { moduleId })
  if (!data) return null
  const day = today()
  const open = sortTasks(data.tasks.filter(isOpen), day)
  const done = data.tasks.length - open.length
  return (
    <div data-pendencias-modulo>
      {open.length ? (
        <ul className="divide-y divide-rule rounded-2xl border border-rule">
          {open.map((t) => (
            <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="min-w-0 font-semibold break-words">{t.title}</span>
              <span className="text-xs text-muted">
                {STATUS_LABEL[t.status]}
                {t.responsibleName ? ` · ${t.responsibleName}` : ''}
                {isOverdue(t, day) ? <span className="font-semibold text-[var(--brand)]"> · atrasada</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhuma pendência em aberto para este módulo.</p>
      )}
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link href={`/admin/pendencias?modulo=${moduleId}&situacao=todas`} className="underline underline-offset-4">
          Abrir no quadro{done ? ` (${done} encerrada${done === 1 ? '' : 's'})` : ''}
        </Link>
        <Link href={`/admin/pendencias?modulo=${moduleId}&novo=1`} className="underline underline-offset-4">
          + Nova pendência deste módulo
        </Link>
      </p>
    </div>
  )
}
