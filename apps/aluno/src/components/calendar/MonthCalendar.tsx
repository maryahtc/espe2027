import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { IconArrowRight } from '@portal/ui/icons'
import Link from 'next/link'
import { ACTIVITY_LABEL, datesChangedRecently, EVENT_KIND_LABEL, type EventKind, type EventVM, type ModuleVM } from '@/lib/academic/model'
import { type MonthKey, monthGrid, shiftMonth } from '@/lib/calendar'
import { type CivilDate, day, formatRange, monthLong, monthShort, weekdayShort } from '@/lib/dates'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

type ModuleDay = { module: ModuleVM; index: number; activity: string }

/** Em destaque no calendário: o módulo em andamento ou o próximo. */
const isFocus = (m: ModuleVM) => m.state === 'next' || m.state === 'ongoing'

function monthLabel(key: MonthKey) {
  const name = monthLong(`${key}-01`)
  return { name: name.charAt(0).toUpperCase() + name.slice(1), year: key.slice(0, 4) }
}

function buildIndex(key: MonthKey, modules: ModuleVM[], allEvents: EventVM[]) {
  const moduleDays = new Map<CivilDate, ModuleDay>()
  const monthModules: ModuleVM[] = []
  for (const m of modules) {
    if (!m.days.some((d) => d.date.startsWith(key))) continue
    monthModules.push(m)
    m.days.forEach((d, index) => {
      const types = [...new Set(d.sessions.map((s) => ACTIVITY_LABEL[s.type]))]
      moduleDays.set(d.date, { module: m, index, activity: types.length ? types.join(' · ') : 'Em definição' })
    })
  }
  const events = new Map<CivilDate, EventVM[]>()
  for (const e of allEvents) if (e.date.startsWith(key)) events.set(e.date, [...(events.get(e.date) ?? []), e])
  return { moduleDays, monthModules, events }
}

function EventMark({ kind }: { kind: EventKind }) {
  // Forma, não cor: online = anel, clínica = ponto, prazo = losango, outro = quadrado vazado.
  if (kind === 'online') return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rounded-full border border-ink-2" />
  if (kind === 'clinica') return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rounded-full bg-ink-2" />
  if (kind === 'outro') return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 border border-ink-2" />
  return <span aria-hidden="true" className="mt-[3px] size-2 shrink-0 rotate-45 bg-ink-2" />
}

const STATE_SUFFIX: Record<ModuleVM['state'], string> = {
  done: ' · concluído',
  next: ' · próximo',
  ongoing: ' · em andamento',
  upcoming: '',
  undated: '',
}

/** Painel contextual do módulo do mês. */
function ModulePanel({ m, today }: { m: ModuleVM; today: CivilDate }) {
  const isNext = isFocus(m)
  return (
    <div className={cn('glass glass-sheen rounded-[22px] p-6', isNext && 'is-selected')}>
      <p className="eyebrow flex items-center gap-2">
        {isNext ? <span className="glow-dot !size-1.5" /> : null}
        Módulo {m.label}
        {STATE_SUFFIX[m.state]}
        {datesChangedRecently(m.datesChangedAt, today) ? ' · data alterada' : ''}
      </p>
      <p className="num mt-4 text-5xl leading-none font-extralight tracking-tight">{m.label}</p>
      {m.start && m.end ? (
        <p className="num mt-4 text-sm text-signal">
          {formatRange(m.start, m.end, false).toUpperCase()} · {weekdayShort(m.start)} a {weekdayShort(m.end)}
        </p>
      ) : null}
      <p className="mt-2 text-xl leading-snug font-light">{m.title}</p>
      {m.theme ? <p className="mt-1 text-sm text-ink-2">{m.theme}</p> : null}
      {m.teachers.length ? <p className="mt-3 text-sm text-muted">{m.teachers.map((t) => (t.tentative ? `${t.name} (a confirmar)` : t.name)).join(' · ')}</p> : null}
      <ButtonLink href={`/modulos/${m.id}`} variant={isNext ? 'primary' : 'secondary'} className="mt-6">
        Ver módulo <IconArrowRight size={16} />
      </ButtonLink>
    </div>
  )
}

export function MonthCalendar({
  monthKey,
  today,
  modules,
  events: allEvents,
  firstMonth,
  lastMonth,
}: {
  monthKey: MonthKey
  today: CivilDate
  modules: ModuleVM[]
  events: EventVM[]
  firstMonth: MonthKey
  lastMonth: MonthKey
}) {
  const weeks = monthGrid(monthKey)
  const { moduleDays, monthModules, events } = buildIndex(monthKey, modules, allEvents)
  const prev = shiftMonth(monthKey, -1)
  const next = shiftMonth(monthKey, 1)
  const hasPrev = prev >= firstMonth
  const hasNext = next <= lastMonth
  const { name, year } = monthLabel(monthKey)
  const todayKey = today.slice(0, 7)
  const monthEvents = [...events.values()].flat().sort((a, b) => a.date.localeCompare(b.date))

  const navBtn = 'glass glass-interactive inline-flex size-11 items-center justify-center rounded-full text-ink'

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-8">
        {/* Cabeçalho do mês */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-baseline gap-3">
            <span className="text-3xl font-light tracking-tight sm:text-4xl">{name}</span>
            <span className="num text-lg text-muted">{year}</span>
          </h2>
          <div className="flex items-center gap-2">
            {todayKey !== monthKey && todayKey >= firstMonth && todayKey <= lastMonth ? (
              <Link href={`/cronograma/${todayKey}`} className="mr-2 text-xs font-semibold text-muted hover:text-ink">
                Mês atual
              </Link>
            ) : null}
            {hasPrev ? (
              <Link href={`/cronograma/${prev}`} aria-label={`Mês anterior: ${monthLabel(prev).name}`} className={navBtn}>
                ←
              </Link>
            ) : (
              <span className={cn(navBtn, 'opacity-30')} aria-hidden="true">
                ←
              </span>
            )}
            {hasNext ? (
              <Link href={`/cronograma/${next}`} aria-label={`Próximo mês: ${monthLabel(next).name}`} className={navBtn}>
                →
              </Link>
            ) : (
              <span className={cn(navBtn, 'opacity-30')} aria-hidden="true">
                →
              </span>
            )}
          </div>
        </div>

        {/* Grade: desktop */}
        <div className="mt-6 hidden md:block">
          <div className="grid grid-cols-7 pb-3">
            {WEEKDAYS.map((w) => (
              <span key={w} className="eyebrow px-2 text-[10px]">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell) => {
              const md = cell.inMonth ? moduleDays.get(cell.date) : undefined
              const ev = cell.inMonth ? (events.get(cell.date) ?? []) : []
              const isToday = cell.date === today
              const isNext = md ? isFocus(md.module) : false
              const body = (
                <>
                  <span
                    className={cn(
                      'num inline-flex size-7 items-center justify-center rounded-full text-sm',
                      !cell.inMonth && 'text-white/20',
                      cell.inMonth && !md && 'text-muted',
                      md && 'text-ink',
                      isToday && 'bg-ink font-semibold text-on-ink',
                    )}
                  >
                    {cell.inMonth ? day(cell.date) : ''}
                  </span>
                  {md ? (
                    <span className="mt-1.5 block">
                      {md.index === 0 ? (
                        <>
                          <span className={cn('num block text-[11px] font-semibold tracking-wider', isNext ? 'text-signal' : 'text-ink-2')}>
                            MÓDULO {md.module.label}
                          </span>
                          <span className="line-clamp-2 block text-[13px] leading-snug font-semibold">{md.module.title}</span>
                        </>
                      ) : (
                        <span className="num block text-[11px] font-semibold text-ink-2">Dia {md.index + 1}</span>
                      )}
                      <span className="mt-1 block text-[11px] leading-snug text-muted">{md.activity}</span>
                    </span>
                  ) : null}
                  {ev.length ? (
                    <ul className="mt-1.5 space-y-1">
                      {ev.map((e) => (
                        <li key={e.id} className="flex gap-1.5 text-[11px] leading-tight text-ink-2">
                          <EventMark kind={e.kind} />
                          <span>
                            {e.startsAt ? <span className="num">{e.startsAt.slice(0, 5)} </span> : null}
                            {e.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )
              return md ? (
                <Link
                  key={cell.date}
                  href={`/modulos/${md.module.id}`}
                  className={cn('glass glass-interactive relative block min-h-[7.25rem] rounded-2xl p-2.5', isNext && 'is-selected')}
                >
                  <span className={cn('absolute top-3 right-3 size-1.5 rounded-full', isNext ? 'bg-brand shadow-[0_0_10px_var(--brand-glow)]' : 'bg-white/40')} />
                  {body}
                </Link>
              ) : (
                <div key={cell.date} className={cn('min-h-[7.25rem] rounded-2xl p-2.5', cell.inMonth ? 'bg-white/[0.02] ring-1 ring-white/[0.05]' : '')}>
                  {body}
                </div>
              )
            })}
          </div>
        </div>

        {/* Celular: calendário compacto */}
        <div className="glass mt-6 rounded-[22px] p-3 md:hidden">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="eyebrow pb-2 text-[9px]">
                {w.slice(0, 1)}
              </span>
            ))}
            {weeks.flat().map((cell) => {
              const md = cell.inMonth ? moduleDays.get(cell.date) : undefined
              const hasEvent = cell.inMonth && (events.get(cell.date) ?? []).length > 0
              const isToday = cell.date === today
              const inner = (
                <>
                  <span
                    className={cn(
                      'num inline-flex size-9 items-center justify-center rounded-full text-[15px]',
                      !cell.inMonth && 'text-white/20',
                      cell.inMonth && !md && 'text-ink-2',
                      md && (isFocus(md.module) ? 'bg-brand font-semibold text-white shadow-[0_0_16px_var(--brand-glow)]' : 'bg-white/[0.1] text-ink ring-1 ring-white/25'),
                      isToday && !md && 'ring-1 ring-ink',
                    )}
                  >
                    {cell.inMonth ? day(cell.date) : ''}
                  </span>
                  <span className={cn('mt-0.5 size-1 rounded-full', hasEvent ? 'bg-ink-2' : 'bg-transparent')} />
                </>
              )
              return md ? (
                <Link
                  key={cell.date}
                  href={`/modulos/${md.module.id}`}
                  aria-label={`${day(cell.date)}: Módulo ${md.module.label}, ${md.module.title}`}
                  className="flex h-12 flex-col items-center justify-center"
                >
                  {inner}
                </Link>
              ) : (
                <span key={cell.date} className="flex h-12 flex-col items-center justify-center">
                  {inner}
                </span>
              )
            })}
          </div>
        </div>

        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand" /> Próximo módulo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-white/25 ring-1 ring-white/40" /> Outros módulos
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

      {/* Painel contextual: módulo e eventos do mês */}
      <aside aria-label={`${name} ${year}`} className="space-y-6 lg:col-span-4 lg:pt-[4.5rem]">
        {monthModules.map((m) => (
          <ModulePanel key={m.id} m={m} today={today} />
        ))}
        {monthEvents.length ? (
          <div>
            <p className="eyebrow">Também em {name.toLowerCase()}</p>
            <ul className="mt-3 space-y-1">
              {monthEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-4 rounded-xl px-2 py-2.5">
                  <span className="w-10 shrink-0 text-center">
                    <span className="num block text-xl leading-none font-light">{day(e.date)}</span>
                    <span className="eyebrow block text-[9px]">{monthShort(e.date)}</span>
                  </span>
                  <span className="flex min-w-0 gap-2 text-sm">
                    <EventMark kind={e.kind} />
                    <span>
                      <span className="block">{e.title}</span>
                      <span className="block text-xs text-muted">
                        {EVENT_KIND_LABEL[e.kind]}
                        {e.startsAt ? <span className="num"> · {e.startsAt.slice(0, 5)}</span> : null}
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
