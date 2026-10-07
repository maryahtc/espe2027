import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { CohortSwitcher } from '@/components/academic/CohortSwitcher'
import type { CohortVM, EventVM, ModuleVM } from '@/lib/academic/model'
import type { MonthKey } from '@/lib/calendar'
import { type CivilDate, monthLong, year } from '@/lib/dates'
import { MonthCalendar } from './MonthCalendar'

export function cohortEyebrow(cohort: CohortVM, month: { current: number; total: number }) {
  if (cohort.status === 'encerrada') return `${cohort.name} · turma encerrada`
  if (month.current === 0) return `${cohort.name} · começa em ${monthLong(cohort.startsOn)} de ${year(cohort.startsOn)}`
  return `${cohort.name} · mês ${month.current} de ${month.total}`
}

/** Cronograma: calendário mensal como visualização principal; lista como alternativa. */
export function CalendarPage({
  monthKey,
  cohort,
  cohorts,
  month,
  modules,
  events,
  today,
}: {
  monthKey: MonthKey
  cohort: CohortVM
  cohorts: CohortVM[]
  month: { current: number; total: number }
  modules: ModuleVM[]
  events: EventVM[]
  today: CivilDate
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={cohortEyebrow(cohort, month)} title="Cronograma" />
        <nav aria-label="Modo de visualização" className="glass mb-8 flex rounded-full p-1 text-sm md:mb-10">
          <span aria-current="page" className="rounded-[5px] bg-ink px-3 py-1.5 font-semibold text-on-ink">
            Calendário
          </span>
          <Link href="/cronograma/lista" className="rounded-full px-4 py-1.5 text-muted hover:text-ink">
            Lista
          </Link>
        </nav>
      </div>
      <CohortSwitcher cohorts={cohorts} current={cohort.id} back={`/cronograma/${monthKey}`} />
      <MonthCalendar
        monthKey={monthKey}
        today={today}
        modules={modules}
        events={events}
        firstMonth={cohort.startsOn.slice(0, 7)}
        lastMonth={cohort.endsOn.slice(0, 7)}
      />
    </>
  )
}
