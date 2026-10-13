import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import Link from 'next/link'
import { AddPanel } from '@/components/admin/academic/ui'
import { today } from '@/lib/academic/load'
import type { CohortVM } from '@/lib/academic/model'
import { type AnnouncementVM, situation, SITUATION_LABEL, SITUATIONS, sortForAdmin, type Situation } from '@/lib/announcements/model'
import { formatDayMonth, year } from '@/lib/dates'
import { AnnouncementCard } from './AnnouncementCard'
import { AnnouncementForm } from './AnnouncementForm'

export function periodLabel(a: Pick<AnnouncementVM, 'visibleFrom' | 'visibleUntil'>) {
  return `Exibir de ${formatDayMonth(a.visibleFrom)} até ${formatDayMonth(a.visibleUntil)}/${year(a.visibleUntil)}`
}

/** Turma sugerida: a em andamento hoje; senão a próxima a começar; senão a primeira da lista. */
export function suggestedCohort(cohorts: CohortVM[], day: string): string | null {
  const active = cohorts.filter((c) => c.status === 'ativa')
  return (
    active.find((c) => c.startsOn <= day && day <= c.endsOn)?.id ??
    [...active].filter((c) => c.startsOn > day).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0]?.id ??
    cohorts[0]?.id ??
    null
  )
}

/**
 * Lista de avisos do painel (Admin e Coordenação). Mesmo desenho do protótipo aprovado:
 * situação e período à esquerda, "como o aluno vê no Início" à direita.
 */
export function AnnouncementsPanel({
  base,
  items,
  cohorts,
  allowAll,
  filter,
  eyebrow,
  lead,
}: {
  base: string
  items: AnnouncementVM[]
  cohorts: CohortVM[]
  allowAll: boolean
  filter: Situation | null
  eyebrow: string
  lead: string
}) {
  const day = today()
  const sorted = sortForAdmin(items, day)
  const counts = Object.fromEntries(SITUATIONS.map((s) => [s, sorted.filter((a) => situation(a, day) === s).length])) as Record<Situation, number>
  const shown = filter ? sorted.filter((a) => situation(a, day) === filter) : sorted
  const chip = (active: boolean) =>
    `glass inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm ${active ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'}`
  return (
    <div>
      <PageTitle eyebrow={eyebrow} title="Avisos" lead={lead} />

      <div className="mb-6">
        <AddPanel label="Novo aviso">
          {cohorts.length || allowAll ? (
            <AnnouncementForm cohorts={cohorts} allowAll={allowAll} defaultFrom={day} defaultCohortId={suggestedCohort(cohorts, day)} />
          ) : (
            <p className="text-sm text-muted">Nenhuma turma vinculada para publicar avisos.</p>
          )}
          <p className="mt-3 text-xs text-muted">O aviso nasce como rascunho. Ele só aparece para a turma depois de publicado, dentro do período.</p>
        </AddPanel>
      </div>

      <nav aria-label="Filtrar por situação" className="mb-5 flex flex-wrap gap-2">
        <Link href={base} className={chip(!filter)} aria-current={!filter ? 'page' : undefined}>
          Todos <span className="num text-xs">{sorted.length}</span>
        </Link>
        {SITUATIONS.map((s) => (
          <Link key={s} href={`${base}?situacao=${s}`} className={chip(filter === s)} aria-current={filter === s ? 'page' : undefined}>
            {SITUATION_LABEL[s]} <span className="num text-xs">{counts[s]}</span>
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((n) => {
            const s = situation(n, day)
            return (
              <li key={n.id} data-situacao={s} className="glass grid gap-5 rounded-2xl p-5 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={n.status} />
                    {n.status === 'publicado' ? <span className="text-xs font-semibold">{SITUATION_LABEL[s]}</span> : null}
                    {n.important ? <span className="text-xs font-semibold text-signal">Importante</span> : null}
                    <span className="num text-xs text-muted">{periodLabel(n)}</span>
                  </div>
                  <p className={`mt-3 text-[17px] font-semibold ${n.status === 'arquivado' ? 'text-muted' : ''}`}>{n.title}</p>
                  <p className="mt-1 text-xs text-muted">{n.cohortId ? n.cohortName : 'Todas as turmas'}</p>
                  <p className="mt-4 text-sm">
                    <Link href={`${base}/${n.id}`} className="font-semibold underline underline-offset-2">
                      Abrir
                    </Link>
                  </p>
                </div>
                <div className="md:col-span-5">
                  <p className="eyebrow text-[10px]">Como o aluno vê no Início</p>
                  <AnnouncementCard item={n} className={`mt-2 ${n.status === 'arquivado' ? 'opacity-85 grayscale' : ''}`} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-rule-strong p-6 text-center text-sm text-muted">
          {filter ? `Nenhum aviso ${SITUATION_LABEL[filter].toLowerCase()}.` : 'Nenhum aviso ainda. Use "Novo aviso" para criar o primeiro.'}
        </p>
      )}
    </div>
  )
}
