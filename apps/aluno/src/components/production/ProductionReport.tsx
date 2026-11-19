import { IconCheck } from '@portal/ui/icons'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { type MapCell, ProductionMap } from '@/components/production/ProductionMap'
import { EvolutionChart } from '@/components/production/EvolutionChart'
import { type ModuleSpan, type StepOption, usesPositions } from '@/lib/cases/model'
import { type ContentVM, KIND_LABEL } from '@/lib/library/model'
import { byModule, categoryTree, evolution, exploreAreas, offMap, type ProductionBase, type Summary, slice, summary, toothMap } from '@/lib/production/model'
import type { ResolvedPeriod } from '@/lib/production/period'

/**
 * Corpo da Minha Produção (Etapa 7), compartilhado com a produção individual vista pela coordenação/Admin (Etapa 10,
 * só leitura). Mesmas contas, mesmos marcadores; muda só o texto (1ª pessoa para o aluno, neutro para a equipe).
 */

export type Viewer = 'aluno' | 'equipe'
export type LibraryItem = Pick<ContentVM, 'id' | 'slug' | 'title' | 'kind'>

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

const TEXT = {
  aluno: {
    evolution: ['Minha evolução', 'Sua produção mês a mês, desde o início da turma. Só os seus registros.'],
    categories: ['Onde estou construindo experiência', 'Pelas categorias do catálogo. Toque numa categoria para ver procedimentos e etapas.'],
    map: ['Meu mapa clínico', 'Onde estão as suas experiências, posição a posição.'],
    modules: ['Por módulo', 'Pelo módulo de cada registro: automático pela data, ou o que você escolheu ao corrigir.'],
    explore: ['Áreas para explorar', 'Do catálogo, o que ainda não aparece nos seus registros ao longo do curso.'],
  },
  equipe: {
    evolution: ['Evolução', 'Produção mês a mês, desde o início da turma, a partir dos registros do aluno.'],
    categories: ['Onde está construindo experiência', 'Pelas categorias do catálogo. Toque numa categoria para ver procedimentos e etapas.'],
    map: ['Mapa clínico', 'Onde estão as experiências registradas, posição a posição.'],
    modules: ['Por módulo', 'Pelo módulo de cada registro: automático pela data, ou o escolhido pelo aluno ao corrigir.'],
    explore: [
      'Sem registros ao longo do curso',
      'Do catálogo, o que ainda não aparece nos registros do aluno no portal. Ausência de registro não significa ausência de atividade clínica.',
    ],
  },
} as const

export function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
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

/** Os quatro indicadores da Etapa 7 (mesmas definições na Minha Produção e na Visão da turma). */
export function SummaryCards({ s, casesHelp = 'Pacientes com algum registro no período.' }: { s: Summary; casesHelp?: string }) {
  return (
    <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" data-resumo>
      {(
        [
          ['casos', 'Casos clínicos', s.cases, casesHelp, s.cases ? `${s.casesInProgress} em andamento · ${n(s.casesConcluded, 'concluído', 'concluídos')}` : null],
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
  )
}

export function ProductionReport({
  viewer,
  base,
  r,
  options,
  spans,
  cohort,
  today,
  library = new Map(),
}: {
  viewer: Viewer
  base: ProductionBase
  r: ResolvedPeriod
  options: StepOption[]
  spans: ModuleSpan[]
  cohort: { startsOn: string; endsOn: string }
  today: string
  library?: Map<string, LibraryItem[]>
}) {
  const T = TEXT[viewer]
  const { filtered } = r
  const cut = slice(base, r.period)
  const s = summary(cut)
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
    <>
      {/* 1 · Resumo */}
      <SummaryCards s={s} />
      <p className="mt-3 text-sm text-muted" data-procedimentos-diferentes>
        {n(s.distinctProcedures, 'procedimento diferente', 'procedimentos diferentes')} no período.
      </p>
      {filtered && !cut.records.length ? (
        <p className="glass mt-6 rounded-2xl p-5 text-sm" data-periodo-vazio>
          Nenhum registro neste período. A evolução abaixo mostra o curso inteiro.
        </p>
      ) : null}

      <div className="mt-12 space-y-14">
        {/* 2 · Evolução */}
        <Section id="evolucao" title={T.evolution[0]} lead={T.evolution[1]}>
          <EvolutionChart points={points} filtered={filtered} />
        </Section>

        {cut.records.length ? (
          <>
            {/* 3 · Onde está a experiência (categoria → procedimento → etapas) */}
            <Section id="categorias" title={T.categories[0]} lead={T.categories[1]}>
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

            {/* 4 · Mapa clínico */}
            <Section id="mapa" title={T.map[0]} lead={T.map[1]}>
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
            <Section id="modulos" title={T.modules[0]} lead={T.modules[1]}>
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

        {/* 6 · Áreas sem registro (curso inteiro, só fatos) */}
        {explore.categories.length || explore.procedures.length ? (
          <section id="explorar" aria-labelledby="explorar-t" className="scroll-mt-24 border-t border-rule pt-8">
            <details data-explorar>
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <h2 id="explorar-t" className="text-2xl font-light tracking-tight">
                  {T.explore[0]} <span className="text-base text-muted">›</span>
                </h2>
                <div className="rule-brand mt-2 w-12" />
                <p className="mt-3 text-sm text-muted">{T.explore[1]}</p>
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
    </>
  )
}
