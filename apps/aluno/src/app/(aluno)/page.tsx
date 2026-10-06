import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight, IconBell, IconBranch, IconPlay, IconPlus } from '@portal/ui/icons'
import { ModuleRuler } from '@portal/ui/module-ruler'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import { ContentRow, sortPreparation } from '@/components/content/ContentRow'
import { HomeSection } from '@/components/home/HomeSection'
import { NextModuleHero } from '@/components/home/NextModuleHero'
import {
  clinicNotice,
  DEMO_TODAY,
  followingModule,
  modules,
  nextModule,
  nextModuleDetail,
  nextModuleSchedule,
  preparation,
  previousModule,
  productionSnapshot,
  recommendation,
  student,
} from '@/demo/data'
import { cases, nextSession, sortedCases } from '@/demo/cases'
import { library } from '@/demo/library'
import { formatDayMonth, formatLongDay, monthShort, relativeDays, year } from '@/lib/dates'

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function HomePage() {
  const today = DEMO_TODAY
  const required = preparation.filter((p) => p.requirement === 'obrigatorio')
  const requiredDone = required.filter((p) => p.status === 'concluido').length
  const pendingRequired = required.length - requiredDone
  const done = modules.filter((m) => m.state === 'done').length
  // Próxima consulta planejada entre os casos em andamento.
  const upcoming = cases
    .filter((c) => c.status === 'andamento')
    .map((c) => ({ c, s: nextSession(c) }))
    .filter((x): x is { c: (typeof cases)[number]; s: NonNullable<ReturnType<typeof nextSession>> } => x.s !== null && x.s.date >= today)
    .sort((a, b) => a.s.date.localeCompare(b.s.date))[0]
  const recent = sortedCases().filter((c) => c.performed.some((p) => p.date <= today)).slice(0, 2)
  const recLesson = library.find((l) => l.title === recommendation.title)

  return (
    <div className="space-y-10 lg:space-y-14">
      <p className="reveal text-sm text-muted">
        {capitalize(formatLongDay(today))} · Olá, <span className="text-ink">{student.firstName}</span>
      </p>

      <NextModuleHero
        module={nextModule}
        today={today}
        description={nextModuleDetail.description}
        days={nextModuleSchedule}
        pendingRequired={pendingRequired}
      />

      {/* 01 — o que fazer antes do módulo */}
      <HomeSection
        id="preparacao"
        index="01"
        title="Preparação"
        note={
          <>
            Para o Módulo {nextModule.slug}.{' '}
            {pendingRequired > 0 ? (
              <span className="text-ink">
                Faltam <strong>{pendingRequired}</strong> obrigatórios.
              </span>
            ) : (
              'Tudo pronto.'
            )}
          </>
        }
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {required.map((p) => (
              <span
                key={p.id}
                className={
                  p.status === 'concluido'
                    ? 'h-1 flex-1 bg-ink'
                    : p.status === 'em-andamento'
                      ? 'h-1 flex-1 bg-[linear-gradient(90deg,var(--ink)_40%,var(--rule)_40%)]'
                      : 'h-1 flex-1 bg-rule'
                }
              />
            ))}
          </div>
          <p className="num shrink-0 text-sm">
            <strong className="font-semibold">{requiredDone}</strong>
            <span className="text-muted"> de {required.length} obrigatórios concluídos</span>
          </p>
        </div>
        <ul className="mt-2 divide-y divide-rule">
          {sortPreparation(preparation).map((item) => (
            <ContentRow key={item.id} item={item} />
          ))}
        </ul>
      </HomeSection>

      {/* 02 — onde estou na especialização */}
      <HomeSection id="especializacao" index="02" title="Sua especialização">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-lg">
            <span className="text-muted">Mês </span>
            <span className="num text-3xl font-light">{student.monthOfCourse}</span>
            <span className="text-muted"> de {student.totalMonths}</span>
          </p>
          <p className="text-sm text-muted">
            <span className="num font-semibold text-ink">{done}</span> módulos concluídos ·{' '}
            <span className="num">{modules.length - done}</span> pela frente
          </p>
        </div>
        <ModuleRuler
          className="mt-6"
          modules={modules.map((m) => ({ number: m.number, label: m.title, state: m.state, href: `/modulos/${m.slug}` }))}
        />
        <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
          {[
            { label: 'Anterior', m: previousModule, note: 'Concluído' },
            { label: 'Próximo', m: nextModule, note: relativeDays(today, nextModule.start) },
            { label: 'Depois', m: followingModule, note: followingModule ? `${monthShort(followingModule.start)} ${year(followingModule.start)}` : '' },
          ].map(({ label, m, note }) =>
            m ? (
              <Link
                key={label}
                href={`/modulos/${m.slug}`}
                className={`group block bg-surface p-4 transition-colors hover:bg-sunken ${label === 'Próximo' ? 'sm:shadow-[inset_0_2px_0_var(--brand)]' : ''}`}
              >
                <p className="eyebrow">{label}</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className={`num text-sm font-semibold ${label === 'Próximo' ? 'text-brand' : 'text-muted'}`}>{m.slug}</span>
                  <span className="text-[15px] leading-snug font-semibold">{m.title}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{note}</p>
              </Link>
            ) : null,
          )}
        </div>
        <Link href="/cronograma" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
          Ver cronograma completo <IconArrowRight size={15} />
        </Link>
      </HomeSection>

      {/* 03 — conteúdo relevante para mim */}
      <HomeSection id="para-voce" index="03" title="Para você" note="Escolhido a partir do que você registrou na clínica.">
        <article className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
          <Link
            href={recLesson ? `/biblioteca/${recLesson.slug}` : '/biblioteca'}
            aria-label={`Assistir: ${recommendation.title}`}
            className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-ink"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(90deg,transparent_0_23px,rgba(255,255,255,.18)_23px_24px)]"
            />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-ink transition-transform duration-200 group-hover:scale-105">
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
              <ButtonLink href={recLesson ? `/biblioteca/${recLesson.slug}` : '/biblioteca'}>Assistir</ButtonLink>
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
            <div role="note" className="flex gap-3 rounded-md border-l-2 border-ink bg-sunken p-4">
              <IconBell size={20} className="mt-0.5 shrink-0" />
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
                  className="mt-2 flex items-center gap-4 rounded-md border border-rule bg-surface p-4 hover:border-rule-strong"
                >
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
                      {relativeDays(today, upcoming.s.date)}
                    </span>
                  </span>
                </Link>
              </div>
            ) : null}

            <div>
              <p className="eyebrow">Registrados recentemente</p>
              <ul className="mt-1 divide-y divide-rule">
                {recent.map((c) => {
                  const last = c.performed.filter((p) => p.date <= today).at(-1)!
                  return (
                    <li key={c.id}>
                      <Link href={`/casos/${c.id}`} className="flex items-baseline justify-between gap-4 py-3 text-sm hover:underline">
                        <span>
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
            <div className="rounded-md border border-rule bg-surface p-5">
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
              className="mt-3 flex items-center justify-between rounded-md border border-rule bg-surface p-4 text-sm font-semibold hover:border-rule-strong"
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
