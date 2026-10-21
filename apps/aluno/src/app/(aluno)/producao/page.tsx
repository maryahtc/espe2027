import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { EmptyState } from '@portal/ui/empty-state'
import { IconCheck, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { type MapCell, ProductionMap } from '@/components/production/ProductionMap'
import { EvolutionChart } from '@/components/production/EvolutionChart'
import { studentArea } from '@/lib/academic/student'
import { requireUser } from '@/lib/auth/session'
import { canRegister } from '@/lib/cases/load'
import { moduleForDate, usesPositions } from '@/lib/cases/model'
import { formatDayMonth, monthShort, year } from '@/lib/dates'
import { KIND_LABEL } from '@/lib/library/model'
import { libraryForProcedures, loadProduction } from '@/lib/production/load'
import {
  byModule,
  categoryTree,
  courseYears,
  currentCourseYear,
  evolution,
  exploreAreas,
  offMap,
  type Period,
  slice,
  summary,
  toothMap,
} from '@/lib/production/model'
import { guardStudentPage } from '@/lib/simulation/guard'
import { getSimulation } from '@/lib/simulation/session'

export const metadata: Metadata = { title: 'Minha produção' }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const monthYear = (d: string) => `${monthShort(d)}/${year(d)}`
const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-rule pt-8">
      <h2 id={`${id}-t`} className="text-2xl font-light tracking-tight">
        {title}
      </h2>
      <div className="rule-brand mt-2 w-12" />
      {lead ? <p className="mt-3 text-sm text-muted">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

/**
 * Minha Produção (Etapa 7): a própria formação clínica do aluno, derivada dos registros da Etapa 6 (nada gravado,
 * nada fictício, sem comparação, ranking, meta ou IA). Só o aluno vê; na simulação, o rascunho.
 */
export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ filtro?: string; de?: string; ate?: string }> }) {
  await guardStudentPage()
  const auth = await requireUser()
  const area = await studentArea()
  if (!auth || !area) {
    return <EmptyState title="Minha produção">Assim que sua conta estiver vinculada a uma turma, sua produção aparece aqui.</EmptyState>
  }
  // Só o aluno (ou o Admin no Modo de simulação). A visão da coordenação/Admin é da Etapa 10.
  if (auth.role !== 'aluno' && !(await getSimulation())) {
    return (
      <EmptyState title="Minha produção é do aluno">
        Esta página mostra a produção da própria conta de aluno. A visão agregada da turma para coordenação e administração chega na Etapa 10.
      </EmptyState>
    )
  }
  const [{ options, spans, base }, allowed] = await Promise.all([loadProduction(auth.userId, area.cohort.id, area.modules), canRegister(area.cohort.id)])
  const { cohort, today } = area

  // ─── Filtro (no endereço) ─────────────────────────────────────────────────────────────────────
  const sp = await searchParams
  const years = courseYears(cohort)
  const thisYear = currentCourseYear(years, today)
  const thisModule = moduleForDate(spans, today)
  let period: Period = { kind: 'curso' }
  let periodLabel = 'Todo o curso'
  if (sp.filtro === 'ano' && thisYear) {
    period = { kind: 'ano', year: thisYear }
    periodLabel = `${thisYear.index}º ano do curso · ${monthYear(thisYear.start)}–${monthYear(thisYear.end)}`
  } else if (sp.filtro === 'modulo' && thisModule) {
    period = { kind: 'modulo', moduleId: thisModule.id }
    periodLabel = `Módulo ${thisModule.label} · ${thisModule.title}`
  } else if (sp.filtro === 'periodo' && sp.de && sp.ate && ISO.test(sp.de) && ISO.test(sp.ate)) {
    const [from, to] = sp.de <= sp.ate ? [sp.de, sp.ate] : [sp.ate, sp.de]
    period = { kind: 'periodo', from, to }
    periodLabel = `${formatDayMonth(from)}/${year(from)} a ${formatDayMonth(to)}/${year(to)}`
  }
  const filtered = period.kind !== 'curso'
  const cut = slice(base, period)
  const s = summary(cut)
  const empty = base.records.length === 0

  const header = (
    <PageTitle eyebrow="Clínica" title="Minha produção" lead="Sua formação clínica, a partir dos seus registros. Só você vê esta página." />
  )

  if (empty) {
    return (
      <div data-producao="vazia">
        {header}
        <div className="glass rounded-[26px] p-6 sm:p-8">
          <p className="text-xl font-light">Sua produção aparece aqui conforme você registra seus casos.</p>
          <p className="mt-2 text-sm text-muted">Cada etapa registrada vira experiência clínica; a etapa final de um tratamento conta como tratamento concluído.</p>
          {allowed ? (
            <ButtonLink href="/casos/novo" className="mt-6">
              <IconPlus size={18} /> Registrar caso
            </ButtonLink>
          ) : null}
        </div>
      </div>
    )
  }

  const filterLink = (key: string, label: string, enabled = true) => {
    const active = (sp.filtro ?? 'curso') === key && (key !== 'periodo' || period.kind === 'periodo')
    return enabled ? (
      <Link
        key={key}
        href={key === 'curso' ? '/producao' : `/producao?filtro=${key}`}
        aria-current={active ? 'page' : undefined}
        className={cn('glass inline-flex min-h-10 items-center rounded-full px-4 text-sm', active ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
      >
        {label}
      </Link>
    ) : (
      <span key={key} className="inline-flex min-h-10 items-center rounded-full border border-rule px-4 text-sm text-faint" title="Ainda não há módulo em andamento ou concluído">
        {label}
      </span>
    )
  }

  const tree = categoryTree(cut, options)
  const maxCat = Math.max(1, ...tree.map((c) => c.experiences))
  const bySlug = new Map(options.map((o) => [o.procedureId, o]))
  const cells: MapCell[] = [...toothMap(cut, options).values()].map((c) => ({
    ...c,
    positionsOnly: c.procedures.every((p) => usesPositions(bySlug.get(p.procedureId))),
  }))
  const off = offMap(cut)
  const archTotal = off.arch.superior.experiences + off.arch.inferior.experiences + off.arch.ambas.experiences
  const modules = byModule(cut, options, spans, today)
  const explore = exploreAreas(base, options)
  const exploreIds = [...explore.categories.flatMap((c) => c.procedures.map((p) => p.procedureId)), ...explore.procedures.map((p) => p.procedureId)]
  const library = await libraryForProcedures(exploreIds, auth.userId, cohort.id)
  const points = evolution(base, cut, cohort, today)

  const libraryFor = (pid: string) => {
    const list = library.get(pid)
    if (!list?.length) return null
    return (
      <ul className="mt-1.5 space-y-1 pl-3" data-biblioteca={pid}>
        {list.map((c) => (
          <li key={c.id} className="text-xs">
            <Link href={`/biblioteca/${c.slug}`} className="underline-offset-4 hover:underline">
              {c.title}
            </Link>{' '}
            <span className="text-muted">· {KIND_LABEL[c.kind]}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div data-producao>
      {header}

      {/* Filtros: poucos, no topo */}
      <nav aria-label="Período" className="flex flex-wrap items-center gap-2" data-filtros>
        {filterLink('curso', 'Todo o curso')}
        {filterLink('ano', thisYear ? `Este ano do curso (${thisYear.index}º)` : 'Este ano do curso', !!thisYear)}
        {filterLink('modulo', 'Este módulo', !!thisModule)}
        <details className="relative">
          <summary
            className={cn(
              'glass inline-flex min-h-10 cursor-pointer list-none items-center rounded-full px-4 text-sm [&::-webkit-details-marker]:hidden',
              period.kind === 'periodo' ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink',
            )}
          >
            Período
          </summary>
          <form action="/producao" className="glass absolute left-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-2xl p-4">
            <input type="hidden" name="filtro" value="periodo" />
            <label className="block text-sm font-semibold">
              De
              <input type="date" name="de" required defaultValue={period.kind === 'periodo' ? period.from : cohort.startsOn} className="field mt-1 block min-h-11 w-full px-3" />
            </label>
            <label className="block text-sm font-semibold">
              Até
              <input type="date" name="ate" required defaultValue={period.kind === 'periodo' ? period.to : today} className="field mt-1 block min-h-11 w-full px-3" />
            </label>
            <button type="submit" className="min-h-11 w-full rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
              Aplicar
            </button>
          </form>
        </details>
      </nav>
      <p className="mt-3 text-xs text-muted" data-periodo>
        Mostrando: <span className="text-ink">{periodLabel}</span>
      </p>

      {/* 1 · Resumo */}
      <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" data-resumo>
        {(
          [
            ['casos', 'Casos clínicos', s.cases, 'Pacientes com algum registro no período.', s.cases ? `${s.casesInProgress} em andamento · ${n(s.casesConcluded, 'concluído', 'concluídos')}` : null],
            ['consultas', 'Consultas clínicas', s.visits, 'Dias de atendimento em cada caso.', null],
            ['experiencias', 'Experiências clínicas', s.experiences, 'Cada etapa realizada em um dente, peça, arcada ou caso.', null],
            ['concluidos', 'Tratamentos concluídos', s.completions, 'Só a etapa final de cada tratamento, uma vez por dente, arcada ou caso.', null],
          ] as const
        ).map(([key, label, value, help, extra]) => (
          <div key={key} className="glass rounded-2xl p-4 sm:p-5" data-indicador={key}>
            <p className="eyebrow text-[10px]">{label}</p>
            <p className="num mt-2 text-4xl leading-none font-extralight sm:text-5xl" data-valor>
              {value}
            </p>
            <p className="mt-2 text-xs text-muted">{help}</p>
            {extra ? <p className="mt-1 text-xs text-ink-2">{extra}</p> : null}
          </div>
        ))}
      </section>
      <p className="mt-3 text-sm text-muted" data-procedimentos-diferentes>
        {n(s.distinctProcedures, 'procedimento diferente', 'procedimentos diferentes')} no período.
      </p>
      {filtered && !cut.records.length ? (
        <p className="glass mt-6 rounded-2xl p-5 text-sm" data-periodo-vazio>
          Nenhum registro neste período. A evolução abaixo mostra o curso inteiro.
        </p>
      ) : null}

      <div className="mt-12 space-y-14">
        {/* 2 · Minha evolução */}
        <Section id="evolucao" title="Minha evolução" lead="Sua produção mês a mês, desde o início da turma. Só os seus registros.">
          <EvolutionChart points={points} filtered={filtered} />
        </Section>

        {cut.records.length ? (
          <>
            {/* 3 · Onde estou construindo experiência (categoria → procedimento → etapas) */}
            <Section id="categorias" title="Onde estou construindo experiência" lead="Pelas categorias do catálogo. Toque numa categoria para ver procedimentos e etapas.">
              <ul className="space-y-2" data-categorias>
                {tree.map((c) => (
                  <li key={c.name}>
                    <details className="group glass rounded-2xl" data-categoria={c.name}>
                      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[15px] font-semibold">{c.name}</span>
                          <span className="num shrink-0 text-sm">{n(c.experiences, 'experiência', 'experiências')}</span>
                        </span>
                        <span className="mt-2 block h-1.5 rounded-full bg-white/[0.05]" aria-hidden="true">
                          <span className="block h-full rounded-full bg-[var(--brand)]/90" style={{ width: `${(c.experiences / maxCat) * 100}%` }} />
                        </span>
                      </summary>
                      <ul className="space-y-4 border-t border-rule px-4 pt-4 pb-5">
                        {c.procedures.map((p) => (
                          <li key={p.procedureId} data-procedimento-producao={p.name}>
                            <p className="text-[15px] font-semibold">{p.name}</p>
                            <p className="num mt-0.5 text-sm text-ink-2" data-numeros>
                              {n(p.experiences, 'experiência', 'experiências')}
                              {p.hasCompletion ? ` · ${n(p.completions, 'tratamento concluído', 'tratamentos concluídos')}` : ''}
                            </p>
                            {p.steps.length > 1 || (p.steps[0] && p.steps[0].name !== p.name) ? (
                              <ul className="mt-2 space-y-1 border-l border-rule-strong pl-4 text-sm">
                                {p.steps.map((st) => (
                                  <li key={st.stepId} className="flex items-baseline justify-between gap-3">
                                    <span className="inline-flex items-center gap-1.5">
                                      {st.name}
                                      {st.completes ? (
                                        <span className="text-[var(--brand)]" title="Etapa que conclui o tratamento">
                                          <IconCheck size={13} />
                                          <span className="sr-only">etapa final</span>
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="num shrink-0 text-muted">{st.experiences}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                Experiências contam cada etapa realizada; tratamentos concluídos contam só a etapa final (✓), uma vez por dente, arcada ou caso.
              </p>
            </Section>

            {/* 4 · Meu mapa clínico */}
            <Section id="mapa" title="Meu mapa clínico" lead="Onde estão as suas experiências, posição a posição.">
              {cells.length ? <ProductionMap cells={cells} /> : <p className="text-sm text-muted">Nenhuma experiência com dente informado no período.</p>}
              {archTotal || off.unpositioned || off.caseLevel ? (
                <div className="mt-6 space-y-2 text-sm" data-fora-do-mapa>
                  {archTotal ? (
                    <p data-arcadas>
                      <span className="font-semibold">Por arcada</span>{' '}
                      <span className="text-muted">(não distribuídas entre os dentes):</span>{' '}
                      {(['superior', 'inferior', 'ambas'] as const)
                        .filter((a) => off.arch[a].records)
                        .map((a) => `${a === 'ambas' ? 'Ambas' : a === 'superior' ? 'Superior' : 'Inferior'} ${off.arch[a].records}`)
                        .join(' · ')}{' '}
                      <span className="text-muted">· {n(archTotal, 'experiência', 'experiências')}</span>
                    </p>
                  ) : null}
                  {off.unpositioned ? <p className="text-muted">{n(off.unpositioned, 'experiência sem dente informado', 'experiências sem dente informado')} (contam, mas não aparecem no mapa).</p> : null}
                  {off.caseLevel ? <p className="text-muted">{n(off.caseLevel, 'experiência por caso', 'experiências por caso')} (sem posição a marcar).</p> : null}
                </div>
              ) : null}
            </Section>

            {/* 5 · Por módulo */}
            <Section id="modulos" title="Por módulo" lead="Pelo módulo de cada registro: automático pela data, ou o que você escolheu ao corrigir.">
              {modules.length ? (
                <ul className="grid gap-3 sm:grid-cols-2" data-modulos>
                  {modules.map((m) => (
                    <li key={m.moduleId ?? 'sem'} className="glass rounded-2xl p-4" data-modulo-producao={m.moduleId ?? 'sem'}>
                      <p className="eyebrow text-[10px]">{m.moduleId ? `Módulo ${m.label}` : 'Sem módulo'}</p>
                      {m.moduleId ? <p className="mt-1 text-[15px] font-semibold">{m.title}</p> : null}
                      <p className="num mt-2 text-sm">
                        {n(m.experiences, 'experiência', 'experiências')} · {n(m.completions, 'tratamento concluído', 'tratamentos concluídos')}
                      </p>
                      {m.topCategories.length ? <p className="mt-1 text-xs text-muted">{m.topCategories.map((c) => `${c.name} ${c.experiences}`).join(' · ')}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Ainda não há módulos com registros.</p>
              )}
            </Section>
          </>
        ) : null}

        {/* 6 · Áreas para explorar (curso inteiro, só fatos) */}
        {explore.categories.length || explore.procedures.length ? (
          <section id="explorar" aria-labelledby="explorar-t" className="scroll-mt-24 border-t border-rule pt-8">
            <details data-explorar>
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h2 id="explorar-t" className="text-2xl font-light tracking-tight">
                  Áreas para explorar <span className="text-base text-muted">›</span>
                </h2>
                <div className="rule-brand mt-2 w-12" />
                <p className="mt-3 text-sm text-muted">Do catálogo, o que ainda não aparece nos seus registros ao longo do curso.</p>
              </summary>
              <div className="mt-6 space-y-6">
                {explore.categories.length ? (
                  <div>
                    <p className="text-sm font-semibold">Categorias ainda sem registro</p>
                    <ul className="mt-2 space-y-3">
                      {explore.categories.map((c) => (
                        <li key={c.name} className="glass rounded-2xl p-4" data-explorar-categoria={c.name}>
                          <p className="text-[15px] font-semibold">{c.name}</p>
                          <ul className="mt-1 space-y-1.5 text-sm text-ink-2">
                            {c.procedures.map((p) => (
                              <li key={p.procedureId}>
                                {p.name}
                                {libraryFor(p.procedureId)}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {explore.procedures.length ? (
                  <div>
                    <p className="text-sm font-semibold">Procedimentos ainda sem registro</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {explore.procedures.map((p) => (
                        <li key={p.procedureId} data-explorar-procedimento={p.name}>
                          {p.name} <span className="text-xs text-muted">· {p.category}</span>
                          {libraryFor(p.procedureId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </div>
  )
}
