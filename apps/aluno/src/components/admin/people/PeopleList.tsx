import { cn } from '@portal/ui/cn'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select } from '@/components/admin/academic/ui'
import { adminUpdatePerson } from '@/lib/admin/academic-actions'
import { type CohortOption, isPending, type Person } from '@/lib/admin/people'
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

function PersonEdit({ p, cohorts }: { p: Person; cohorts: CohortOption[] }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Editar dados</summary>
      <div className="mt-3 rounded-2xl border border-rule bg-surface p-4">
        <ActionForm action={adminUpdatePerson}>
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome completo" name="nome" required defaultValue={p.full_name} />
            <Input label="Nome de exibição" name="exibicao" defaultValue={p.display_name ?? ''} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Papel" name="papel" defaultValue={p.role} options={[['aluno', 'Aluno'], ['coordenacao', 'Coordenação'], ['admin', 'Administração']]} />
            <Select label="Turma" name="turma" defaultValue={p.cohort_id ?? ''} options={[['', 'Sem turma'], ...cohorts.map((c) => [c.id, c.name] as [string, string])]} />
            <Select label="Matrícula" name="situacao" defaultValue={p.enrollment_status ?? 'ativa'} options={[['ativa', 'Ativa'], ['inativa', 'Inativa (perde o acesso à turma)']]} />
          </div>
          <p className="text-xs text-muted">E-mail não muda por aqui (é o login da pessoa).</p>
        </ActionForm>
      </div>
    </details>
  )
}

export function PeopleList({ people, selfId, showRole = false, cohorts = [] }: { people: Person[]; selfId: string; showRole?: boolean; cohorts?: CohortOption[] }) {
  if (people.length === 0) {
    return <p className="rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-sm text-muted">Ninguém por aqui ainda. Use o formulário para convidar.</p>
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_9.5rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
        <span>Pessoa</span>
        <span>{showRole ? 'Papel · turma' : 'Turma'}</span>
        <span>Situação</span>
      </div>
      <ul className="divide-y divide-rule">
        {people.map((p) => (
          <li key={p.id} className="px-5 py-4">
            <div className="grid gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_9.5rem] md:items-center">
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
            </div>
            <div className="mt-2">
              <PersonActions email={p.email} pending={isPending(p)} />
              <PersonEdit p={p} cohorts={cohorts} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
