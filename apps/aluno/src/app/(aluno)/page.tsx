import { ButtonLink } from '@portal/ui/button'
import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight, IconBell, IconBranch, IconPlay, IconPlus } from '@portal/ui/icons'
import { ModuleRuler } from '@portal/ui/module-ruler'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import { CaseCover } from '@/components/cases/CaseCover'
import { HomeSection } from '@/components/home/HomeSection'
import { NextModuleHero } from '@/components/home/NextModuleHero'
import { ResourceRow } from '@/components/modules/ResourceRow'
import { clinicNotice, DEMO_TODAY, productionSnapshot, recommendation } from '@/demo/data'
import { cases, nextSession, sortedCases } from '@/demo/cases'
import { library } from '@/demo/library'
import { loadModuleDetail } from '@/lib/academic/load'
import { focusModule, type ModuleVM } from '@/lib/academic/model'
import { studentArea } from '@/lib/academic/student'
import { getAuth } from '@/lib/auth/session'
import { formatDayMonth, formatLongDay, monthLong, monthShort, relativeDays, year } from '@/lib/dates'

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function firstName(auth: Awaited<ReturnType<typeof getAuth>>) {
  if (!auth || auth === 'previa') return null
  const name = (auth.displayName || auth.fullName).trim()
  return name ? name.split(/\s+/)[0] : null
}

const rulerState = (m: ModuleVM) => (m.state === 'done' ? 'done' : m.state === 'next' || m.state === 'ongoing' ? 'next' : 'upcoming')

export default async function HomePage() {
  const [area, auth] = await Promise.all([studentArea(), getAuth()])
  const name = firstName(auth)
  // Seções 03 e 04 (casos, recomendações) seguem fictícias até as etapas delas; usam a data da demonstração.
  const demoToday = DEMO_TODAY
  const upcoming = cases
    .filter((c) => c.status === 'andamento')
    .map((c) => ({ c, s: nextSession(c) }))
    .filter((x): x is { c: (typeof cases)[number]; s: NonNullable<ReturnType<typeof nextSession>> } => x.s !== null && x.s.date >= demoToday)
    .sort((a, b) => a.s.date.localeCompare(b.s.date))[0]
  const recent = sortedCases().filter((c) => c.performed.some((p) => p.date <= demoToday)).slice(0, 2)
  const recLesson = library.find((l) => l.title === recommendation.title)

  const today = area?.today ?? demoToday
  const modules = area?.modules ?? []
  const focus = focusModule(modules)
  const focusDetail = focus ? await loadModuleDetail(focus.id, modules) : null
  const preparation = (focusDetail?.resources ?? []).filter(
    (r) => r.phase === 'antes' && r.status === 'publicado' && (!r.availableFrom || new Date(r.availableFrom) <= new Date()),
  )
  const required = preparation.filter((r) => r.requirement === 'obrigatorio').length
  const done = modules.filter((m) => m.state === 'done').length
  const focusIdx = focus ? modules.findIndex((m) => m.id === focus.id) : -1
  const previousModule = focusIdx > 0 ? modules[focusIdx - 1] : null
  const followingModule = focusIdx >= 0 ? modules[focusIdx + 1] : null

  return (
    <div className="space-y-10 lg:space-y-14">
      <p className="reveal text-sm text-muted">
        {capitalize(formatLongDay(today))}
        {name ? (
          <>
            {' '}
            · Olá, <span className="text-ink">{name}</span>
          </>
        ) : null}
      </p>

      {!area ? (
        <EmptyState title="Sua turma ainda não foi vinculada">
          Assim que a coordenação vincular sua conta a uma turma, o cronograma e os módulos aparecem aqui.
        </EmptyState>
      ) : null}

      {focus && focus.start && focus.end ? (
        <NextModuleHero
          module={{ ...focus, start: focus.start, end: focus.end }}
          today={today}
          preparationCount={preparation.length}
          requiredCount={required}
        />
      ) : null}

      {/* 01 — o que fazer antes do módulo */}
      {focus ? (
        <HomeSection id="preparacao" index="01" title="Preparação" note={<>Para o Módulo {focus.label}.</>}>
          {focus.preparation ? <p className="max-w-[62ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{focus.preparation}</p> : null}
          {preparation.length ? (
            <ul className="mt-2 divide-y divide-rule">
              {preparation.map((item) => (
                <ResourceRow key={item.id} item={item} />
              ))}
            </ul>
          ) : !focus.preparation ? (
            <p className="text-sm text-muted">A coordenação ainda não publicou a preparação deste módulo.</p>
          ) : null}
        </HomeSection>
      ) : null}

      {/* 02 — onde estou na especialização */}
      {area ? (
        <HomeSection id="especializacao" index="02" title="Sua especialização">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            {area.month.current > 0 ? (
              <p className="text-lg">
                <span className="text-muted">Mês </span>
                <span className="num text-3xl font-light">{area.month.current}</span>
                <span className="text-muted"> de {area.month.total}</span>
              </p>
            ) : (
              <p className="text-lg">
                <span className="text-muted">Começa em </span>
                <span className="text-ink">
                  {monthLong(area.cohort.startsOn)} de {year(area.cohort.startsOn)}
                </span>
              </p>
            )}
            <p className="text-sm text-muted">
              <span className="num font-semibold text-ink">{done}</span> módulos concluídos ·{' '}
              <span className="num">{modules.length - done}</span> pela frente
            </p>
          </div>
          {modules.length ? (
            <ModuleRuler
              className="mt-6"
              modules={modules.map((m, i) => ({ number: m.number ?? i + 1, label: m.title, state: rulerState(m), href: `/modulos/${m.id}` }))}
            />
          ) : null}
          {focus ? (
            <div className="glass mt-6 grid overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-white/[0.08]">
              {[
                { label: 'Anterior', m: previousModule, note: previousModule?.state === 'done' ? 'Concluído' : '' },
                {
                  label: focus.state === 'ongoing' ? 'Agora' : 'Próximo',
                  m: focus,
                  note: focus.state === 'ongoing' ? 'Em andamento' : focus.start ? relativeDays(today, focus.start) : '',
                },
                { label: 'Depois', m: followingModule, note: followingModule?.start ? `${monthShort(followingModule.start)} ${year(followingModule.start)}` : '' },
              ].map(({ label, m, note }) =>
                m ? (
                  <Link
                    key={label}
                    href={`/modulos/${m.id}`}
                    className={`group relative block p-5 transition-colors hover:bg-white/[0.04] ${m === focus ? 'bg-white/[0.03]' : ''}`}
                  >
                    <p className="eyebrow flex items-center gap-2">
                      {m === focus ? <span className="glow-dot !size-1.5" /> : null}
                      {label}
                    </p>
                    <p className="mt-2 flex items-baseline gap-2">
                      <span className={`num text-sm font-semibold ${m === focus ? 'text-signal' : 'text-muted'}`}>{m.label}</span>
                      <span className="text-[15px] leading-snug font-semibold">{m.title}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">{note}</p>
                  </Link>
                ) : (
                  <span key={label} />
                ),
              )}
            </div>
          ) : null}
          <Link href="/cronograma" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Ver cronograma completo <IconArrowRight size={15} />
          </Link>
        </HomeSection>
      ) : null}

      {/* 03 — conteúdo relevante para mim */}
      <HomeSection id="para-voce" index="03" title="Para você" note="Escolhido a partir do que você registrou na clínica.">
        <article className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
          <Link
            href={recLesson ? `/biblioteca/${recLesson.slug}` : '/biblioteca'}
            aria-label={`Assistir: ${recommendation.title}`}
            className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-black ring-1 ring-white/10"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(90deg,transparent_0_23px,rgba(255,255,255,.18)_23px_24px)]"
            />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-on-ink transition-transform duration-200 group-hover:scale-105">
              <IconPlay size={22} />
            </span>
            <span className="num absolute right-3 bottom-3 text-xs text-white/80">{recommendation.minutes} min</span>
            <span className="absolute top-0 left-0 h-[3px] w-12 bg-brand" />
          </Link>
          <div>
            <Chip>{recommendation.topic}</Chip>
            <h3 className="mt-3 text-2xl leading-tight font-light tracking-tight">{recommendation.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {recommendation.author} · <span className="num">{recommendation.minutes} min</span>
            </p>
            <p className="mt-4 border-l-2 border-brand pl-3 text-sm leading-relaxed text-ink-2">{recommendation.reason}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              <ButtonLink href={recLesson ? `/biblioteca/${recLesson.slug}` : '/biblioteca'} variant="secondary">Assistir</ButtonLink>
              <ButtonLink href={recommendation.workflow.href} variant="quiet">
                <IconBranch size={16} /> Explorar no Workflow: {recommendation.workflow.title}
              </ButtonLink>
            </div>
          </div>
        </article>
        <div className="mt-8">
          <p className="eyebrow">Também pode ajudar</p>
          <ul className="mt-2 divide-y divide-rule">
            {recommendation.more
              .map((slug) => library.find((l) => l.slug === slug)!)
              .map((c) => (
                <li key={c.slug}>
                  <Link href={`/biblioteca/${c.slug}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:underline">
                    <span>
                      <span className="font-semibold">{c.title}</span>
                      <span className="text-muted"> · {c.teacher}</span>
                    </span>
                    <span className="num shrink-0 text-xs text-muted">{c.minutes} min</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </HomeSection>

      {/* 04 — atividade clínica */}
      <HomeSection id="clinica" index="04" title="Clínica">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="space-y-6 md:col-span-7">
            <div role="note" className="glass flex gap-3 rounded-2xl p-5">
              <IconBell size={20} className="mt-0.5 shrink-0 text-signal" />
              <div>
                <p className="text-[15px] font-semibold">{clinicNotice.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{clinicNotice.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {clinicNotice.from} · <span className="num">{formatDayMonth(clinicNotice.date)}</span>
                </p>
              </div>
            </div>

            {upcoming ? (
              <div>
                <p className="eyebrow">Próxima consulta planejada</p>
                <Link
                  href={`/casos/${upcoming.c.id}#mapa`}
                  className="glass glass-interactive group mt-2 flex items-center gap-4 rounded-2xl p-3 pr-4"
                >
                  <CaseCover item={upcoming.c} overlay={false} sizes="64px" className="size-16 shrink-0 rounded-xl" />
                  <span className="w-12 shrink-0 text-center">
                    <span className="num block text-2xl leading-none font-light">{formatDayMonth(upcoming.s.date).slice(0, 2)}</span>
                    <span className="eyebrow block text-[10px]">{monthShort(upcoming.s.date)}</span>
                  </span>
                  <span className="min-w-0 border-l border-rule pl-4">
                    <span className="block text-[15px] font-semibold">
                      {upcoming.s.title} · {upcoming.c.procedure.toLowerCase()}
                    </span>
                    <span className="block text-xs text-muted">
                      Paciente <span className="num">{upcoming.c.patient}</span> · Consulta{' '}
                      <span className="num">{String(upcoming.s.number).padStart(2, '0')}</span> de{' '}
                      <span className="num">{String(upcoming.c.sessions.length).padStart(2, '0')}</span> ·{' '}
                      {relativeDays(demoToday, upcoming.s.date)}
                    </span>
                  </span>
                </Link>
              </div>
            ) : null}

            <div>
              <p className="eyebrow">Registrados recentemente</p>
              <ul className="mt-1 divide-y divide-rule">
                {recent.map((c) => {
                  const last = c.performed.filter((p) => p.date <= demoToday).at(-1)!
                  return (
                    <li key={c.id}>
                      <Link href={`/casos/${c.id}`} className="group flex items-center justify-between gap-4 py-3 text-sm">
                        <CaseCover item={c} overlay={false} sizes="40px" className="size-10 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1 group-hover:underline">
                          <span className="num font-semibold">{c.patient}</span>
                          <span className="text-ink-2">
                            {' '}
                            · {last.procedure} · {last.quantity} {last.unit}
                          </span>
                        </span>
                        <span className="num shrink-0 text-xs text-muted">{formatDayMonth(last.date)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="glass rounded-2xl p-5">
              <ButtonLink href="/casos/novo" className="w-full">
                <IconPlus size={18} /> Registrar caso
              </ButtonLink>
              <p className="mt-2 text-center text-xs text-muted">Leva menos de um minuto.</p>
              <div className="mt-5 border-t border-rule pt-5">
                <p className="eyebrow">Sua produção até aqui</p>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    ['procedimentos', productionSnapshot.procedures],
                    ['casos', productionSnapshot.cases],
                    ['categorias', productionSnapshot.categories],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="sr-only">{label}</dt>
                      <dd>
                        <span className="num block text-3xl leading-none font-light">{value}</span>
                        <span className="mt-1 block text-xs text-muted">{label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link href="/producao" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
                  Ver minha produção <IconArrowRight size={15} />
                </Link>
              </div>
            </div>
            <Link
              href="/workflows"
              className="glass glass-interactive mt-3 flex items-center justify-between rounded-2xl p-4 text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <IconBranch size={18} /> Abrir Workflow clínico
              </span>
              <IconArrowRight size={15} />
            </Link>
          </div>
        </div>
      </HomeSection>
    </div>
  )
}
