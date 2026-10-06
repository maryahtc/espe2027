import { cn } from '@portal/ui/cn'
import { IconCheck } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_TODAY, modules, student } from '@/demo/data'
import { formatRange, monthShort, relativeDays, weekdayShort, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Cronograma · lista' }

export default function CronogramaListaPage() {
  const years = [...new Set(modules.map((m) => year(m.start)))]
  const done = modules.filter((m) => m.state === 'done').length
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
        eyebrow={`${student.cohort} · fev 2027 – jul 2029`}
        title="Cronograma"
        lead={`${modules.length} módulos mensais, de quinta a sábado. Você concluiu ${done} e está no mês ${student.monthOfCourse} de ${student.totalMonths}.`}
      />
        <nav aria-label="Modo de visualização" className="mb-8 flex rounded-md border border-rule-strong p-0.5 text-sm md:mb-10">
          <Link href="/cronograma" className="rounded-[5px] px-3 py-1.5 text-muted hover:text-ink">
            Calendário
          </Link>
          <span aria-current="page" className="rounded-[5px] bg-ink px-3 py-1.5 font-semibold text-white">
            Lista
          </span>
        </nav>
      </div>
      <div className="space-y-12">
        {years.map((y) => (
          <section key={y} aria-labelledby={`ano-${y}`} className="grid gap-4 lg:grid-cols-12 lg:gap-10">
            <h2 id={`ano-${y}`} className="num text-3xl font-light text-faint lg:col-span-2 lg:text-right">
              {y}
            </h2>
            <ol className="divide-y divide-rule border-y border-rule lg:col-span-10">
              {modules
                .filter((m) => year(m.start) === y)
                .map((m) => (
                  <li key={m.number}>
                    <Link
                      href={`/modulos/${m.slug}`}
                      className={cn(
                        'group grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-4 py-4 transition-colors sm:grid-cols-[4rem_7.5rem_1fr_auto] sm:gap-x-6',
                        m.state === 'next' ? 'bg-surface' : 'hover:bg-surface',
                      )}
                    >
                      <span
                        className={cn(
                          'num flex h-12 items-center justify-center text-2xl font-light sm:h-14',
                          m.state === 'next' ? 'bg-brand text-white' : m.state === 'done' ? 'text-muted' : 'text-ink',
                        )}
                      >
                        {m.slug}
                      </span>
                      <span className="hidden sm:block">
                        <span className="num block text-sm">{formatRange(m.start, m.end, false)}</span>
                        <span className="block text-xs text-muted">
                          {weekdayShort(m.start)} a {weekdayShort(m.end)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block text-[15px] leading-snug font-semibold', m.state === 'done' && 'text-ink-2')}>
                          {m.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          <span className="num sm:hidden">{formatRange(m.start, m.end, false)} · </span>
                          {m.teachers.map((t) => t.short).join(', ')}
                        </span>
                      </span>
                      <span className="text-right text-xs">
                        {m.state === 'done' ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <IconCheck size={14} /> <span className="hidden sm:inline">Concluído</span>
                          </span>
                        ) : null}
                        {m.state === 'next' ? (
                          <span className="font-semibold text-brand">{relativeDays(DEMO_TODAY, m.start)}</span>
                        ) : null}
                        {m.state === 'upcoming' ? <span className="text-muted">{monthShort(m.start)}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}
