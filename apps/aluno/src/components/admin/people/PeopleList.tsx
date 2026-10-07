import { cn } from '@portal/ui/cn'
import { isPending, type Person } from '@/lib/admin/people'
import { PersonActions } from './PersonActions'

const ROLE_LABEL = { aluno: 'Aluno', coordenacao: 'Coordenação', admin: 'Administração' } as const
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Situação por forma e texto: tracejado = convite pendente · cheio = ativo · vazado = matrícula inativa. */
function Situation({ person }: { person: Person }) {
  const pending = isPending(person)
  const inactive = person.enrollment_status === 'inativa'
  const mark = pending ? 'border border-dashed border-ink' : inactive ? 'border border-faint' : 'bg-ink'
  const label = pending ? 'Convite pendente' : inactive ? 'Matrícula inativa' : 'Ativo'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-0.5 text-xs font-semibold', inactive ? 'text-muted' : 'text-ink')}>
      <span className={cn('size-2 rounded-full', mark)} />
      {label}
    </span>
  )
}

export function PeopleList({ people, selfId, showRole = false }: { people: Person[]; selfId: string; showRole?: boolean }) {
  if (people.length === 0) {
    return <p className="rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-sm text-muted">Ninguém por aqui ainda. Use o formulário para convidar.</p>
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_9.5rem_3.5rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
        <span>Pessoa</span>
        <span>{showRole ? 'Papel · turma' : 'Turma'}</span>
        <span>Situação</span>
        <span>2FA</span>
      </div>
      <ul className="divide-y divide-rule">
        {people.map((p) => (
          <li key={p.id} className="px-5 py-4">
            <div className="grid gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_9.5rem_3.5rem] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">
                  {p.full_name || '—'}
                  {p.id === selfId ? <span className="ml-2 text-xs font-normal text-muted">(você)</span> : null}
                </p>
                <p className="truncate text-sm text-muted">{p.email}</p>
              </div>
              <p className="text-sm text-ink-2">
                {showRole ? `${ROLE_LABEL[p.role]}${p.cohort_name ? ' · ' : ''}` : null}
                {p.cohort_name ?? (showRole ? '' : '—')}
              </p>
              <div>
                <Situation person={p} />
                {p.last_sign_in_at ? <p className="num mt-1 text-xs text-faint">último acesso {date.format(new Date(p.last_sign_in_at))}</p> : null}
              </div>
              <p className="text-sm text-ink-2">{p.has_mfa ? 'Ativo' : '—'}</p>
            </div>
            <div className="mt-2">
              <PersonActions id={p.id} email={p.email} pending={isPending(p)} hasMfa={p.has_mfa} isSelf={p.id === selfId} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
