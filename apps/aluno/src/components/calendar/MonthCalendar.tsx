import { cn } from '@portal/ui/cn'
import { IconArrowRight } from '@portal/ui/icons'
import Link from 'next/link'
import {
  academicEvents,
  type AcademicEvent,
  COURSE_FIRST_MONTH,
  COURSE_LAST_MONTH,
  type DemoModule,
  modules,
  scheduleFor,
} from '@/demo/data'
import { eachDay, type MonthKey, monthGrid, shiftMonth } from '@/lib/calendar'
import { type CivilDate, day, formatRange, monthLong, weekdayShort } from '@/lib/dates'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

type ModuleDay = { module: DemoModule; index: number; activity: string }

function monthLabel(key: MonthKey) {
  const name = monthLong(`${key}-01`)
  return { name: name.charAt(0).toUpperCase() + name.slice(1), year: key.slice(0, 4) }
}

function buildIndex(key: MonthKey) {
  const moduleDays = new Map<CivilDate, ModuleDay>()
  const monthModules: DemoModule[] = []
  for (const m of modules) {
    const days = eachDay(m.start, m.end)
    if (!days.some((d) => d.startsWith(key))) continue
    monthModules.push(m)
    const schedule = scheduleFor(m)
    days.forEach((d, index) => {
      const types = [...new Set(schedule.find((s) => s.date === d)?.items.map((i) => i.type) ?? [])]
      moduleDays.set(d, { module: m, index, activity: types.join(' · ') })
    })
  }
  const events = new Map<CivilDate, AcademicEvent[]>()
  for (const e of academicEvents) if (e.date.startsWith(key)) events.set(e.date, [...(events.get(e.date) ?? []), e])
  return { moduleDays, monthModules, events }
}

const EVENT_LABEL: Record<AcademicEvent['kind'], string> = { online: 'Online', clinica: 'Clínica', prazo: 'Prazo' }

function EventMark({ kind }: { kind: AcademicEvent['kind'] }) {
  // Forma, não cor: online = anel, clínica = ponto, prazo = losango.
  if (kind === 'online') return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rounded-full border border-ink" />
  if (kind === 'clinica') return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rounded-full bg-ink" />
  return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rotate-45 bg-ink" />
}

export function MonthCalendar({ monthKey, today }: { monthKey: MonthKey; today: CivilDate }) {
  const weeks = monthGrid(monthKey)
  const { moduleDays, monthModules, events } = buildIndex(monthKey)
  const prev = shiftMonth(monthKey, -1)
  const next = shiftMonth(monthKey, 1)
  const hasPrev = prev >= COURSE_FIRST_MONTH
  const hasNext = next <= COURSE_LAST_MONTH
  const { name, year } = monthLabel(monthKey)
  const todayKey = today.slice(0, 7)

  const agenda = [
    ...monthModules.map((m) => ({ date: m.start, kind: 'module' as const, m })),
    ...[...events.values()].flat().map((e) => ({ date: e.date, kind: 'event' as const, e })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      {/* Cabeçalho do mês com navegação */}
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-4">
        {hasPrev ? (
          <Link href={`/cronograma/${prev}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
            ← <span className="hidden sm:inline">{monthLabel(prev).name}</span>
          </Link>
        ) : (
          <span className="w-12" />
        )}
        <h2 className="text-center">
          <span className="block text-2xl font-light tracking-tight sm:text-3xl">{name}</span>
          <span className="num block text-sm text-muted">{year}</span>
        </h2>
        {hasNext ? (
          <Link href={`/cronograma/${next}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
            <span className="hidden sm:inline">{monthLabel(next).name}</span> →
          </Link>
        ) : (
          <span className="w-12" />
        )}
      </div>
      {todayKey !== monthKey ? (
        <p className="mt-3 text-center">
          <Link href={`/cronograma/${todayKey}`} className="text-xs font-semibold underline-offset-2 hover:underline">
            Voltar para o mês atual
          </Link>
        </p>
      ) : null}

      {/* Grade: desktop (≥ 768 px) */}
      <div className="mt-6 hidden md:block">
        <div className="grid grid-cols-7 border-b border-rule pb-2">
          {WEEKDAYS.map((w) => (
            <span key={w} className="eyebrow px-2 text-[10px]">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-rule">
          {weeks.flat().map((cell) => {
            const md = moduleDays.get(cell.date)
            const ev = events.get(cell.date) ?? []
            const isToday = cell.date === today
            const isNext = md?.module.state === 'next'
            const body = (
              <>
                <span
                  className={cn(
                    'num inline-flex size-7 items-center justify-center rounded-full text-sm',
                    !cell.inMonth && 'text-faint',
                    isToday && 'bg-ink font-semibold text-white',
                  )}
                >
                  {day(cell.date)}
                </span>
                {md && cell.inMonth ? (
                  <span className="mt-1 block">
                    {md.index === 0 ? (
                      <>
                        <span className={cn('num block text-[11px] font-semibold tracking-wide', isNext ? 'text-brand' : 'text-ink-2')}>
                          MÓDULO {md.module.slug}
                        </span>
                        <span className="line-clamp-2 block text-[13px] leading-snug font-semibold">{md.module.title}</span>
                      </>
                    ) : (
                      <span className="num block text-[11px] font-semibold text-ink-2">Dia {md.index + 1}</span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-muted">{md.activity}</span>
                  </span>
                ) : null}
                {ev.length && cell.inMonth ? (
                  <ul className="mt-1 space-y-1">
                    {ev.map((e) => (
                      <li key={e.title} className="flex gap-1.5 text-[11px] leading-tight">
                        <EventMark kind={e.kind} />
                        <span>
                          {e.time ? <span className="num">{e.time} </span> : null}
                          {e.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )
            const cls = cn(
              'relative block min-h-[7.5rem] border-r border-b border-rule p-2 text-left',
              !cell.inMonth && 'bg-sunken/50',
              md && cell.inMonth && (isNext ? 'bg-brand-tint' : 'bg-surface'),
              md && cell.inMonth && 'transition-colors hover:bg-sunken',
            )
            return md && cell.inMonth ? (
              <Link key={cell.date} href={`/modulos/${md.module.slug}`} className={cls}>
                <span className={cn('absolute inset-y-0 left-0 w-[3px]', isNext ? 'bg-brand' : 'bg-ink')} />
                {body}
              </Link>
            ) : (
              <div key={cell.date} className={cls}>
                {body}
              </div>
            )
          })}
        </div>
      </div>

      {/* Celular: mini calendário legível + agenda do mês */}
      <div className="mt-5 md:hidden">
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="eyebrow pb-2 text-[9px]">
              {w.slice(0, 1)}
            </span>
          ))}
          {weeks.flat().map((cell) => {
            const md = moduleDays.get(cell.date)
            const hasEvent = (events.get(cell.date) ?? []).length > 0
            const isToday = cell.date === today
            const inner = (
              <>
                <span
                  className={cn(
                    'num inline-flex size-8 items-center justify-center text-sm',
                    !cell.inMonth && 'text-faint/60',
                    md && cell.inMonth && (md.module.state === 'next' ? 'bg-brand text-white' : 'bg-ink text-white'),
                    isToday && !md && 'rounded-full ring-1 ring-ink',
                  )}
                >
                  {day(cell.date)}
                </span>
                <span className={cn('mt-0.5 size-1 rounded-full', hasEvent && cell.inMonth ? 'bg-ink' : 'bg-transparent')} />
              </>
            )
            return md && cell.inMonth ? (
              <Link
                key={cell.date}
                href={`/modulos/${md.module.slug}`}
                aria-label={`${day(cell.date)}: Módulo ${md.module.slug}, ${md.module.title}`}
                className="flex h-11 flex-col items-center justify-center"
              >
                {inner}
              </Link>
            ) : (
              <span key={cell.date} className="flex h-11 flex-col items-center justify-center">
                {inner}
              </span>
            )
          })}
        </div>
      </div>

      {/* Agenda do mês (celular e desktop) */}
      <section aria-labelledby="neste-mes" className="mt-8">
        <h3 id="neste-mes" className="eyebrow">
          Neste mês
        </h3>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {agenda.map((a) =>
            a.kind === 'module' ? (
              <li key={`m${a.m.number}`}>
                <Link href={`/modulos/${a.m.slug}`} className="flex items-center gap-4 py-4 hover:bg-surface">
                  <span
                    className={cn(
                      'num flex size-12 shrink-0 items-center justify-center text-xl font-light',
                      a.m.state === 'next' ? 'bg-brand text-white' : 'border border-rule-strong',
                    )}
                  >
                    {a.m.slug}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="num block text-xs text-muted">
                      {formatRange(a.m.start, a.m.end, false)} · {weekdayShort(a.m.start)} a {weekdayShort(a.m.end)}
                    </span>
                    <span className="block text-[15px] leading-snug font-semibold">Módulo {a.m.slug} · {a.m.title}</span>
                  </span>
                  <IconArrowRight size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            ) : (
              <li key={a.e.date + a.e.title} className="flex items-start gap-4 py-3.5">
                <span className="w-12 shrink-0 text-center">
                  <span className="num block text-lg leading-none font-light">{day(a.e.date)}</span>
                  <span className="eyebrow block text-[9px]">{weekdayShort(a.e.date)}</span>
                </span>
                <span className="flex min-w-0 gap-2 text-sm">
                  <EventMark kind={a.e.kind} />
                  <span>
                    <span className="font-semibold">{a.e.title}</span>
                    <span className="block text-xs text-muted">
                      {EVENT_LABEL[a.e.kind]}
                      {a.e.time ? <span className="num"> · {a.e.time}</span> : null}
                    </span>
                  </span>
                </span>
              </li>
            ),
          )}
        </ul>
      </section>

      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-brand" /> Próximo módulo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-ink" /> Outros módulos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <EventMark kind="online" /> Online
        </span>
        <span className="inline-flex items-center gap-1.5">
          <EventMark kind="clinica" /> Clínica
        </span>
        <span className="inline-flex items-center gap-1.5">
          <EventMark kind="prazo" /> Prazo
        </span>
      </p>
    </div>
  )
}
