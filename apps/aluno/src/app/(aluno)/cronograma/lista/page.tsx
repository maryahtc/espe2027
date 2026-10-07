import { cn } from '@portal/ui/cn'
import { IconCheck } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CohortSwitcher } from '@/components/academic/CohortSwitcher'
import { NoCohort } from '@/components/academic/NoCohort'
import { cohortEyebrow } from '@/components/calendar/CalendarPage'
import { datesChangedRecently, type ModuleVM } from '@/lib/academic/model'
import { studentArea } from '@/lib/academic/student'
import { formatRange, monthShort, relativeDays, weekdayShort, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Cronograma · lista' }

function leadText(modules: ModuleVM[], month: { current: number; total: number }) {
  const done = modules.filter((m) => m.state === 'done').length
  const base = `${modules.length} módulos.`
  if (month.current === 0) return `${base} A especialização ainda não começou.`
  return `${base} Você concluiu ${done} e está no mês ${month.current} de ${month.total}.`
}

export default async function CronogramaListaPage() {
  const area = await studentArea()
  if (!area) return <NoCohort title="Cronograma" />
  const { modules, month, today } = area
  const dated = modules.filter((m) => m.start)
  const undated = modules.filter((m) => !m.start)
  const years = [...new Set(dated.map((m) => year(m.start!)))].sort()
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={cohortEyebrow(area.cohort, month)} title="Cronograma" lead={leadText(modules, month)} />
        <nav aria-label="Modo de visualização" className="glass mb-8 flex rounded-full p-1 text-sm md:mb-10">
          <Link href="/cronograma" className="rounded-full px-4 py-1.5 text-muted hover:text-ink">
            Calendário
          </Link>
          <span aria-current="page" className="rounded-[5px] bg-ink px-3 py-1.5 font-semibold text-on-ink">
            Lista
          </span>
        </nav>
      </div>
      <CohortSwitcher cohorts={area.cohorts} current={area.cohort.id} back="/cronograma/lista" />
      <div className="space-y-12">
        {[...years.map((y) => ({ key: String(y), list: dated.filter((m) => year(m.start!) === y) })), ...(undated.length ? [{ key: 'A definir', list: undated }] : [])].map(({ key: y, list }) => (
          <section key={y} aria-labelledby={`ano-${y}`} className="grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id={`ano-${y}`} className="num text-3xl font-light text-faint lg:col-span-2 lg:text-right">
              {y}
            </h2>
            <ol className="divide-y divide-rule border-y border-rule lg:col-span-10">
              {list.map((m) => {
                const focus = m.state === 'next' || m.state === 'ongoing'
                return (
                  <li key={m.id}>
                    <Link
                      href={`/modulos/${m.id}`}
                      className={cn(
                        'group grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-4 py-4 transition-colors sm:grid-cols-[4rem_7.5rem_1fr_auto] sm:gap-x-6',
                        focus ? 'bg-surface' : 'hover:bg-surface',
                      )}
                    >
                      <span
                        className={cn(
                          'num flex h-12 items-center justify-center text-2xl font-light sm:h-14',
                          focus ? 'bg-brand text-white' : m.state === 'done' ? 'text-muted' : 'text-ink',
                        )}
                      >
                        {m.label}
                      </span>
                      <span className="hidden sm:block">
                        {m.start && m.end ? (
                          <>
                            <span className="num block text-sm">{formatRange(m.start, m.end, false)}</span>
                            <span className="block text-xs text-muted">
                              {weekdayShort(m.start)} a {weekdayShort(m.end)}
                            </span>
                          </>
                        ) : (
                          <span className="block text-sm text-muted">Data a definir</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block text-[15px] leading-snug font-semibold', m.state === 'done' && 'text-ink-2')}>
                          {m.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {m.start && m.end ? <span className="num sm:hidden">{formatRange(m.start, m.end, false)} · </span> : null}
                          {[m.theme, m.teachers.map((t) => (t.tentative ? `${t.name} (a confirmar)` : t.name)).join(', ')].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="text-right text-xs">
                        {m.state === 'done' ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <IconCheck size={14} /> <span className="hidden sm:inline">Concluído</span>
                          </span>
                        ) : null}
                        {m.state === 'next' && m.start ? (
                          <span className="font-semibold text-signal">{relativeDays(today, m.start)}</span>
                        ) : null}
                        {m.state === 'ongoing' ? <span className="font-semibold text-signal">Em andamento</span> : null}
                        {m.state === 'upcoming' && m.start ? (
                          <span className="text-muted">
                            {datesChangedRecently(m.datesChangedAt, today) ? 'Data alterada · ' : ''}
                            {monthShort(m.start)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}
