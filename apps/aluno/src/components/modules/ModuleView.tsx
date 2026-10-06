import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconDoc, IconPlay } from '@portal/ui/icons'
import { Chip, RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import { ContentRow, sortPreparation } from '@/components/content/ContentRow'
import {
  DEMO_TODAY,
  type DemoModule,
  materialsFor,
  modules,
  nextModule,
  nextModuleDetail,
  preparation,
  scheduleFor,
} from '@/demo/data'
import { library } from '@/demo/library'
import { day, formatDayMonth, formatRange, monthLong, relativeDays, weekday } from '@/lib/dates'

const SECTIONS = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'programacao', label: 'Programação' },
  { id: 'antes', label: 'Antes do módulo' },
  { id: 'materiais', label: 'Materiais necessários' },
  { id: 'durante', label: 'Durante e depois' },
  { id: 'docentes', label: 'Docentes' },
]

function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-32 border-t border-rule pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-t`} className="text-2xl font-light tracking-tight">
            {title}
          </h2>
          <div className="rule-brand mt-2 w-12" />
        </div>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function ModuleView({ m }: { m: DemoModule }) {
  const isNext = m.number === nextModule.number
  const idx = modules.indexOf(m)
  const prev = idx > 0 ? modules[idx - 1] : undefined
  const next = idx >= 0 ? modules[idx + 1] : undefined
  const schedule = scheduleFor(m)
  const materials = materialsFor(m)
  const activities = schedule.flatMap((d) => d.items)
  const description = isNext
    ? nextModuleDetail.description
    : `${m.title}: fundamentos, demonstração clínica, hands-on em manequim e clínica supervisionada no sábado.`
  const prep = isNext
    ? sortPreparation(preparation)
    : library
        .filter((l) => l.modules.includes(m.number))
        .map((l, i) => ({
          id: l.slug,
          slug: l.slug,
          kind: l.kind === 'Videoaula' ? ('video' as const) : l.kind === 'PDF' ? ('pdf' as const) : ('artigo' as const),
          title: l.title,
          author: l.teacher,
          minutes: l.minutes,
          requirement: i === 0 ? ('obrigatorio' as const) : ('recomendado' as const),
          status: m.state === 'done' ? ('concluido' as const) : ('pendente' as const),
        }))
  const requiredPending = prep.filter((p) => p.requirement === 'obrigatorio' && p.status !== 'concluido').length
  const itemCount = materials.groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <article>
      <Link href={idx >= 0 ? `/cronograma/${m.start.slice(0, 7)}` : '/cronograma'} className="text-sm text-muted hover:text-ink">
        ← Cronograma · {monthLong(m.start)}
      </Link>

      <header id="visao-geral" aria-labelledby="modulo-titulo" className={cn('glass glass-sheen relative mt-6 scroll-mt-32 overflow-hidden rounded-[28px]', isNext && 'is-selected')}>
        {isNext ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-28 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(202,44,44,0.18),transparent_62%)]"
          />
        ) : null}
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:p-12">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-2.5">
              {isNext ? <span className="glow-dot" /> : null}
              Módulo {m.slug}
              {m.state === 'done' ? ' · concluído' : isNext ? ` · ${relativeDays(DEMO_TODAY, m.start)}` : ` · ${monthLong(m.start)}`}
            </p>
            <p aria-hidden="true" className="num mt-5 text-[96px] leading-[0.8] font-extralight tracking-[-0.06em] sm:text-[140px]">
              {m.slug}
            </p>
            <h1 id="modulo-titulo" className="mt-6 text-[2rem] leading-[1.05] font-light tracking-tight text-balance sm:text-5xl">
              {m.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className="num text-xl">{formatRange(m.start, m.end)}</span>
              <span className="text-sm text-muted">
                {weekday(m.start)} a {weekday(m.end)}
              </span>
            </p>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{description}</p>
          </div>
          <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-6 border-t border-rule pt-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-2 lg:pl-10">
            {[
              ['Dias', `${formatDayMonth(m.start)} a ${formatDayMonth(m.end)}`],
              ['Atividades', `${activities.length} em 3 dias`],
              [
                'Preparação',
                m.state === 'done' ? 'Concluída' : requiredPending ? `${requiredPending} obrigatório${requiredPending > 1 ? 's' : ''} pendente${requiredPending > 1 ? 's' : ''}` : 'Em dia',
              ],
              ['Materiais', `${itemCount} itens`],
              ['Local', nextModuleDetail.place],
              ['Docentes', m.teachers.map((t) => t.short).join(', ')],
            ].map(([k, v]) => (
              <div key={k} className={k === 'Local' || k === 'Docentes' ? 'col-span-2' : ''}>
                <dt className="eyebrow text-[10px]">{k}</dt>
                <dd className={cn('mt-1.5 text-[15px]', k === 'Preparação' && requiredPending && m.state !== 'done' ? 'text-signal' : 'text-ink')}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <nav
        aria-label="Seções do módulo"
        className="glass-strong sticky top-14 z-20 -mx-4 mt-8 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-full lg:border lg:px-6"
      >
        <ul className="flex gap-6 whitespace-nowrap">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block border-b-2 border-transparent py-3 text-sm text-muted hover:border-rule-strong hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-14">

        <Section id="programacao" title="Programação">
          <div className="space-y-8">
            {schedule.map((d) => (
              <div key={d.date} className="grid gap-3 md:grid-cols-[9rem_1fr] md:gap-8">
                <p className="md:pt-3">
                  <span className="eyebrow block">{weekday(d.date)}</span>
                  <span className="num text-3xl font-light">{day(d.date)}</span>
                  <span className="text-sm text-muted"> {monthLong(d.date)}</span>
                </p>
                <ol className="glass divide-y divide-white/[0.07] rounded-2xl px-5">
                  {d.items.map((it) => (
                    <li key={it.title} className="grid grid-cols-[5.5rem_1fr] gap-4 py-4 sm:grid-cols-[7rem_1fr_auto]">
                      <span className="num text-sm text-ink-2">
                        {it.start}–{it.end}
                      </span>
                      <span>
                        <span className="block text-[15px] leading-snug font-semibold">{it.title}</span>
                        <span className="block text-xs text-muted">{it.teacher.name}</span>
                      </span>
                      <span className="col-start-2 sm:col-start-auto">
                        <Chip>{it.type}</Chip>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="antes"
          title="Antes do módulo"
          aside={
            <span className="flex flex-wrap gap-4">
              <RequirementTag level="obrigatorio" />
              <RequirementTag level="recomendado" />
              <RequirementTag level="complementar" />
            </span>
          }
        >
          {prep.length ? (
            <ul className="divide-y divide-rule">
              {prep.map((p) => (
                <ContentRow key={p.id} item={p} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">A coordenação ainda não publicou a preparação deste módulo.</p>
          )}
        </Section>

        <Section id="materiais" title="Materiais necessários" aside={<span className="num">{itemCount} itens</span>}>
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="glass grid gap-x-8 gap-y-6 rounded-[22px] p-6 sm:grid-cols-2 sm:p-7 lg:col-span-8">
              {materials.groups.map((g) => (
                <fieldset key={g.title} className="min-w-0">
                  <legend className="eyebrow">{g.title}</legend>
                  <ul className="mt-2 divide-y divide-white/[0.07]">
                    {g.items.map((item) => {
                      const id = `mat-${g.title}-${item}`.replace(/\W+/g, '-').toLowerCase()
                      return (
                        <li key={item}>
                          <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-3 text-[15px] has-[:checked]:text-muted has-[:checked]:line-through">
                            <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
                            <span className="leading-snug">{item}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </fieldset>
              ))}
            </div>
            <aside className="lg:col-span-4">
              <p className="eyebrow">Observações da coordenação</p>
              <ul className="mt-2 space-y-3">
                {materials.notes.map((n) => (
                  <li key={n} className="rounded-2xl border-l-2 border-l-[var(--brand)] bg-white/[0.04] p-4 text-sm leading-relaxed">
                    {n}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">Marque os itens enquanto separa o material.</p>
            </aside>
          </div>
        </Section>

        <Section id="durante" title="Durante e depois">
          {m.state === 'done' ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {[
                { icon: 'doc', title: `Slides — ${m.title}`, meta: `${m.teachers[0]!.name} · PDF` },
                { icon: 'play', title: `Gravação: ${m.title} — fundamentos e indicações`, meta: `${m.teachers[0]!.name} · 1h 52min` },
                { icon: 'doc', title: 'Referências citadas nas aulas', meta: 'Lista de leitura · PDF' },
              ].map((r) => (
                <li key={r.title} className="flex items-center gap-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rule-strong bg-surface">
                    {r.icon === 'play' ? <IconPlay size={18} /> : <IconDoc size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{r.title}</span>
                    <span className="block text-xs text-muted">{r.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              Slides, PDFs, gravações das aulas e referências entram aqui a partir de{' '}
              <span className="num text-ink">{formatDayMonth(m.start)}</span>, conforme os docentes liberarem.
            </p>
          )}
        </Section>

        <Section id="docentes" title="Docentes">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {m.teachers.map((t) => (
              <li key={t.slug} className="flex items-center gap-3 glass rounded-2xl p-4">
                <span className="num flex size-10 items-center justify-center rounded-full bg-sunken text-sm font-semibold">
                  {t.short
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">
                    {activities.filter((a) => a.teacher.slug === t.slug).length} atividades neste módulo
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <nav aria-label="Outros módulos" className="mt-16 grid grid-cols-2 gap-4 border-t border-rule pt-6 text-sm">
        {prev ? (
          <Link href={`/modulos/${prev.slug}`} className="group">
            <span className="eyebrow block">← Módulo {prev.slug}</span>
            <span className="mt-1 block font-semibold group-hover:underline">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/modulos/${next.slug}`} className="group text-right">
            <span className="eyebrow inline-flex items-center gap-1">
              Módulo {next.slug} <IconArrowRight size={12} />
            </span>
            <span className="mt-1 block font-semibold group-hover:underline">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
