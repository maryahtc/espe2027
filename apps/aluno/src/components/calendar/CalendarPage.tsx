import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { COURSE_FIRST_MONTH, DEMO_TODAY, student } from '@/demo/data'
import type { MonthKey } from '@/lib/calendar'
import { MonthCalendar } from './MonthCalendar'

/** Cronograma: calendário mensal como visualização principal; lista como alternativa. */
export function CalendarPage({ monthKey }: { monthKey: MonthKey }) {
  const [y0, m0] = COURSE_FIRST_MONTH.split('-').map(Number) as [number, number]
  const [y, m] = monthKey.split('-').map(Number) as [number, number]
  const courseMonth = (y - y0) * 12 + (m - m0) + 1
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={`${student.cohort} · mês ${courseMonth} de ${student.totalMonths}`} title="Cronograma" />
        <nav aria-label="Modo de visualização" className="mb-8 flex rounded-md border border-rule-strong p-0.5 text-sm md:mb-10">
          <span aria-current="page" className="rounded-[5px] bg-ink px-3 py-1.5 font-semibold text-white">
            Calendário
          </span>
          <Link href="/cronograma/lista" className="rounded-[5px] px-3 py-1.5 text-muted hover:text-ink">
            Lista
          </Link>
        </nav>
      </div>
      <MonthCalendar monthKey={monthKey} today={DEMO_TODAY} />
    </>
  )
}
