import { Button } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconCheck, IconExternal, IconPlay, IconPlus } from '@portal/ui/icons'
import { Chip } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaseCover } from '@/components/cases/CaseCover'
import { caseById, cases } from '@/demo/cases'
import { modules } from '@/demo/data'
import { library } from '@/demo/library'
import { day, formatDayMonth, monthShort, year } from '@/lib/dates'

export function generateStaticParams() {
  return cases.map((c) => ({ id: c.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = caseById((await params).id)
  return { title: c ? `Paciente ${c.patient} · ${c.procedure}` : 'Caso' }
}

function Block({ id, title, children, aside }: { id: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-rule pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-t`} className="text-2xl font-light tracking-tight">
            {title}
          </h2>
          <div className="rule-brand mt-2 w-12" />
        </div>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const c = caseById((await params).id)
  if (!c) notFound()
  const mod = modules.find((m) => m.number === c.module)
  const help = library.filter((l) => l.topics.some((t) => c.difficultyTopics.includes(t))).slice(0, 3)
  const done = c.sessions.filter((s) => s.status === 'realizada').length
  const nextNumber = c.sessions.find((s) => s.status === 'planejada')?.number

  return (
    <article>
      <Link href="/casos" className="text-sm text-muted hover:text-ink">
        ← Meus casos
      </Link>

      <header className="glass glass-sheen mt-6 grid overflow-hidden rounded-[26px] md:grid-cols-12">
        <CaseCover item={c} overlay={false} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[16/10] md:col-span-5 md:aspect-auto md:min-h-72" />
        <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 md:col-span-7 lg:p-10">
          <div>
            <p className="eyebrow">Paciente</p>
            <h1 className="num mt-2 text-6xl leading-none font-extralight tracking-tight sm:text-7xl">{c.patient}</h1>
            <p className="mt-4 text-2xl font-light">{c.procedure}</p>
            <p className="num mt-1 text-sm text-muted">{c.teeth.split(', ').join(' · ')}</p>
            <p className="mt-4 text-sm">
              {c.status === 'andamento' ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="glow-dot !size-2" /> <span className="font-semibold">Em andamento</span>
                  <span className="num text-muted">
                    · {done} de {c.sessions.length} consultas realizadas
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <IconCheck size={15} /> Concluído
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" className="min-h-12 px-6 tracking-wide">
              ABRIR CASO NO SMILE CLOUD <IconExternal size={16} />
            </Button>
            <span className="text-xs text-muted">Fotos completas e planejamento ficam no Smile Cloud.</span>
          </div>
        </div>
      </header>

      <div className="mt-10 space-y-14">
        <Block id="informacoes" title="Informações">
          <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.06] md:grid-cols-4">
            {[
              ['Data de início', `${formatDayMonth(c.startDate)}/${year(c.startDate)}`],
              ['Procedimento', c.procedure],
              ['Dentes', c.teeth],
              ['Módulo relacionado', mod ? `${mod.slug} · ${mod.title}` : '—'],
              ['Supervisor', c.supervisor],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#101010]/90 p-4">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-1 text-sm font-semibold">{v}</dd>
              </div>
            ))}
            <div className="col-span-2 bg-[#101010]/90 p-4 md:col-span-3">
              <dt className="text-xs text-muted">O que foi realizado</dt>
              <dd className="mt-1 text-sm leading-relaxed">{c.summary}</dd>
            </div>
          </dl>
        </Block>

        <Block id="reflexao" title="Reflexão">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Maior dificuldade', c.difficulty],
              ['Maior facilidade', c.ease],
              ['O que faria diferente', c.differently ?? '—'],
            ].map(([k, v], i) => (
              <div key={k} className={cn('rounded-md p-5', i === 0 ? 'glass border-l-2 border-l-[var(--brand)]' : 'border border-rule bg-surface')}>
                <p className="eyebrow">{k}</p>
                <p className="mt-2 text-[15px] leading-relaxed">{v}</p>
                {i === 0 ? (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {c.difficultyTopics.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Block>

        <Block
          id="mapa"
          title="Mapa de tratamento"
          aside={<p className="text-sm text-muted">Arraste para os lados para ver todas as consultas.</p>}
        >
          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <ol className="flex w-max snap-x snap-mandatory items-stretch gap-0">
              {c.sessions.map((s, i) => {
                const isNext = s.number === nextNumber
                return (
                <li key={s.number} className="flex snap-start items-stretch">
                  <div
                    className={cn(
                      'flex w-[17rem] flex-col rounded-[20px] p-5 sm:w-72',
                      s.status === 'realizada' ? 'glass' : 'glass border-dashed',
                      isNext && 'is-selected',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="num flex items-center gap-2 text-xs font-semibold tracking-wider text-muted">
                        {isNext ? <span className="glow-dot !size-1.5" /> : null}
                        CONSULTA {String(s.number).padStart(2, '0')}
                        {isNext ? <span className="text-signal">· PRÓXIMA</span> : null}
                      </span>
                      <span className="flex gap-1 text-muted" aria-hidden="true">
                        <span className="rounded px-1 text-xs hover:bg-white/10">←</span>
                        <span className="rounded px-1 text-xs hover:bg-white/10">→</span>
                      </span>
                    </div>
                    <p className="mt-2 text-lg leading-tight font-semibold">{s.title}</p>
                    <p className="num mt-0.5 text-sm text-muted">
                      {day(s.date)} {monthShort(s.date).toUpperCase()} {year(s.date)}
                    </p>
                    <ul className="mt-4 space-y-1.5">
                      {s.tasks.map((t) => (
                        <li key={t} className="flex gap-2 text-sm leading-snug">
                          <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-white/50" />
                          {t}
                        </li>
                      ))}
                    </ul>
                    {s.notes ? (
                      <div className="mt-4 rounded-xl bg-white/[0.05] p-3 text-xs leading-relaxed text-ink-2">
                        <span className="font-semibold">Observações: </span>
                        {s.notes}
                      </div>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-5">
                      {s.status === 'realizada' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold tracking-wider text-on-ink">
                          <IconCheck size={12} /> REALIZADA
                        </span>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wider', isNext ? 'border-[var(--brand)] text-signal' : 'border-rule-strong text-ink-2')}>
                          PLANEJADA
                        </span>
                      )}
                      <span className="text-xs text-muted underline underline-offset-2">Editar</span>
                    </div>
                  </div>
                  {i < c.sessions.length - 1 ? (
                    <span aria-hidden="true" className="flex w-8 shrink-0 items-center justify-center text-muted">
                      <IconArrowRight size={16} />
                    </span>
                  ) : null}
                </li>
                )
              })}
              <li className="flex items-stretch">
                <span aria-hidden="true" className="flex w-8 shrink-0 items-center justify-center text-muted">
                  <IconArrowRight size={16} />
                </span>
                <button
                  type="button"
                  className="glass-interactive flex w-44 snap-start flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-rule-strong text-sm font-semibold text-muted hover:text-ink"
                >
                  <IconPlus size={20} /> Nova consulta
                </button>
              </li>
            </ol>
          </div>
        </Block>

        <Block id="procedimentos" title="Procedimentos realizados" aside={<p className="text-sm text-muted">Entram na sua produção.</p>}>
          <ul className="divide-y divide-rule border-y border-rule">
            {c.performed.map((p) => (
              <li key={p.date + p.procedure} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-4 py-3 text-sm">
                <span className="num text-muted">{formatDayMonth(p.date)}</span>
                <span>
                  <span className="font-semibold">{p.procedure}</span>
                  {p.teeth ? <span className="text-muted"> · dentes {p.teeth}</span> : null}
                </span>
                <span className="num">
                  {p.quantity} {p.unit}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        {help.length ? (
          <Block id="ajuda" title="Conteúdos que podem ajudar neste ponto">
            <p className="-mt-2 mb-4 text-sm text-muted">A partir da dificuldade que você relatou neste caso.</p>
            <ul className="divide-y divide-rule border-y border-rule">
              {help.map((l) => (
                <li key={l.slug}>
                  <Link href={`/biblioteca/${l.slug}`} className="group flex items-center gap-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black text-ink ring-1 ring-white/10">
                      <IconPlay size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold group-hover:underline">{l.title}</span>
                      <span className="block text-xs text-muted">
                        {l.teacher} · <span className="num">{l.minutes} min</span>
                      </span>
                    </span>
                    <IconArrowRight size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
      </div>
    </article>
  )
}
