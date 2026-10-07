import { PageTitle } from '@portal/ui/section'
import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/session'
import { loadPeople, type Person } from '@/lib/admin/people'
import { InviteForm } from './InviteForm'
import { PeopleList } from './PeopleList'

/** Lista à esquerda; convite à direita (no celular, o convite vem primeiro). */
export async function PeoplePage({
  title,
  lead,
  roles,
  filter,
  inviteTitle,
  note,
}: {
  title: string
  lead: string
  roles: Array<'aluno' | 'coordenacao' | 'admin'>
  filter: (p: Person) => boolean
  inviteTitle: string
  note?: ReactNode
}) {
  const auth = await requireUser(['admin'])
  const { people, cohorts } = await loadPeople()
  return (
    <>
      <PageTitle eyebrow="Turmas e pessoas" title={title} lead={lead} />
      <div className="flex flex-col-reverse gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          {auth ? (
            <PeopleList people={people.filter(filter)} selfId={auth.userId} showRole={roles.length > 1} cohorts={cohorts} />
          ) : (
            <p className="text-sm text-muted">Prévia sem banco: a lista aparece quando o Supabase estiver configurado.</p>
          )}
          {note}
        </div>
        <section className="rounded-[22px] border border-rule bg-surface p-6">
          <h2 className="eyebrow">{inviteTitle}</h2>
          <div className="mt-5">
            <InviteForm roles={roles} cohorts={cohorts} />
          </div>
        </section>
      </div>
    </>
  )
}
