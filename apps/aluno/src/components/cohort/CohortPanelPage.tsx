import { EmptyState } from '@portal/ui/empty-state'
import { IconCheck } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EvolutionChart } from '@/components/production/EvolutionChart'
import { PeriodFilters } from '@/components/production/PeriodFilters'
import { Section, SummaryCards } from '@/components/production/ProductionReport'
import { today } from '@/lib/academic/load'
import type { AuthState } from '@/lib/auth/session'
import { cohortPanel } from '@/lib/cohort/load'
import { defaultCohort } from '@/lib/cohort/model'
import { periodQuery } from '@/lib/production/period'
import { trackingCohorts } from '@/lib/tracking/load'
import { StudentTable } from './StudentTable'

/**
 * Etapa 10 — Visão da turma (Coordenação) e Produção da turma (Admin): o MESMO painel, com as turmas que cada um pode
 * acompanhar (coordenação: só as que coordena; Admin: todas). Só agregados e a linha-resumo de cada aluno; a produção
 * detalhada de um aluno abre na página individual, sempre auditada.
 */

type SP = Record<string, string | string[] | undefined>
const first = (sp: SP, k: string) => {
  const v = sp[k]
  return (Array.isArray(v) ? v[0] : v) ?? undefined
}
const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

export async function CohortPanelPage({ auth, path, eyebrow, title, sp }: { auth: AuthState; path: string; eyebrow: string; title: string; sp: SP }) {
  const cohorts = await trackingCohorts(auth)
  const lead = 'Produção clínica registrada pelos alunos no portal: cobertura dos registros, indicadores, evolução e panorama de experiências.'
  if (!cohorts.length) {
    return (
      <>
        <PageTitle eyebrow={eyebrow} title={title} lead={lead} />
        <EmptyState title="Nenhuma turma para acompanhar">
          {auth.role === 'admin' ? 'Cadastre uma turma para ver a produção.' : 'Sua conta ainda não coordena nenhuma turma ativa.'}
        </EmptyState>
      </>
    )
  }
  const wanted = first(sp, 'turma')
  const chosen = wanted ? cohorts.find((c) => c.id === wanted) : defaultCohort(cohorts, today())
  // Turma pedida e não autorizada: "não encontrado", sem revelar se existe.
  if (!chosen) notFound()
  const panel = await cohortPanel(auth, chosen.id, { filtro: first(sp, 'filtro'), de: first(sp, 'de'), ate: first(sp, 'ate') })
  if (!panel) notFound()
  const { cohort, r, coverage: cov, summary: s, panorama: pano, difficulties: diff, rows } = panel
  const keep = { turma: cohort.id }
  const enrolled = cov.enrolled.total

  return (
    <div data-visao-turma={cohort.id}>
      <PageTitle eyebrow={`${eyebrow} · ${cohort.name}`} title={title} lead={lead} />

      {cohorts.length > 1 ? (
        <nav aria-label="Turma" className="-mt-4 mb-6 flex flex-wrap gap-2" data-turmas>
          {cohorts.map((c) => (
            <Link
              key={c.id}
              href={`${path}?turma=${c.id}`}
              aria-current={c.id === cohort.id ? 'page' : undefined}
              data-turma={c.id}
              className={`glass inline-flex min-h-10 items-center rounded-full px-4 text-sm ${c.id === cohort.id ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'}`}
            >
              {c.name}
              {c.status === 'encerrada' ? ' · encerrada' : ''}
            </Link>
          ))}
        </nav>
      ) : null}

      <PeriodFilters r={r} path={path} keep={keep} defaultFrom={cohort.startsOn} today={panel.today} />

      <p role="note" className="mt-6 rounded-2xl border border-rule px-4 py-3 text-sm text-muted" data-aviso-registro>
        <span className="font-semibold text-ink">Só o que foi registrado no portal.</span> Ausência de registro aqui não significa ausência de atividade
        clínica. Sem ranking nem metas: os números descrevem a turma, não classificam alunos.
      </p>

      {/* Cobertura dos registros (denominadores) */}
      <section aria-label="Cobertura dos registros" className="glass mt-6 grid gap-4 rounded-2xl p-4 sm:grid-cols-3 sm:p-5" data-cobertura>
        {(
          [
            ['matriculados', 'Alunos matriculados', cov.enrolled],
            ['com-registro', 'Com registro no período', cov.withRecords],
            ['sem-registro', 'Sem registro no período', cov.withoutRecords],
          ] as const
        ).map(([key, label, v]) => (
          <div key={key} data-cobertura-item={key}>
            <p className="eyebrow text-[10px]">{label}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="num text-3xl leading-none font-extralight" data-valor>
                {v.total}
              </span>
              {key !== 'matriculados' && enrolled ? <span className="num text-sm text-muted">de {enrolled}</span> : null}
            </p>
            <p className="mt-1 text-xs text-muted">
              {n(v.active, 'matrícula ativa', 'matrículas ativas')}
              {v.inactive ? ` · ${n(v.inactive, 'inativa', 'inativas')}` : ''}
            </p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-muted" data-contexto-modulos>
        Cronograma: {panel.modules.done} de {n(panel.modules.total, 'módulo publicado', 'módulos publicados')} já concluídos. Só contexto — nada é
        deduzido disso.
      </p>

      <SummaryCards s={s} casesHelp="Pacientes com algum registro no período, somando os casos de todos os alunos." />

      <div className="mt-12 space-y-14">
        <Section id="evolucao" title="Evolução mensal" lead="Produção da turma mês a mês, desde o início, somando os registros de todos os alunos.">
          <EvolutionChart points={panel.evolution} filtered={r.filtered} />
        </Section>

        <Section
          id="panorama"
          title="Panorama de experiências clínicas"
          lead="Pelas categorias do catálogo, na ordem do catálogo. Quantos alunos registraram cada procedimento e etapa, e as experiências somadas."
        >
          {pano.categories.length ? (
            <ul className="space-y-2" data-panorama>
              {pano.categories.map((c) => (
                <li key={c.name}>
                  <details className="glass rounded-2xl" data-panorama-categoria={c.name}>
                    <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[15px] font-semibold">{c.name}</span>
                        <span className="num text-sm">{n(c.experiences, 'experiência', 'experiências')}</span>
                      </span>
                      <span className="num mt-1 block text-xs text-muted">
                        {c.students} de {n(enrolled, 'aluno', 'alunos')} com registro
                        {c.completions ? ` · ${n(c.completions, 'tratamento concluído', 'tratamentos concluídos')}` : ''}
                      </span>
                    </summary>
                    <ul className="space-y-4 border-t border-rule px-4 pt-4 pb-5">
                      {c.procedures.map((p) => (
                        <li key={p.procedureId} data-panorama-procedimento={p.name} data-alunos={p.students} data-experiencias={p.experiences}>
                          <p className="text-[15px] font-semibold">{p.name}</p>
                          <p className="num mt-0.5 text-sm text-ink-2">
                            {n(p.students, 'aluno', 'alunos')} · {n(p.experiences, 'experiência', 'experiências')}
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
                                  <span className="num shrink-0 text-muted">
                                    {n(st.students, 'aluno', 'alunos')} · {st.experiences}
                                  </span>
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
          ) : (
            <p className="text-sm text-muted" data-panorama-vazio>
              Nenhuma experiência clínica registrada no período.
            </p>
          )}

          {pano.withoutRecords.length ? (
            <details className="mt-4 rounded-2xl border border-rule" data-sem-registros>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">Sem registros neste período</span>{' '}
                <span className="num text-muted">· {n(pano.withoutRecords.reduce((t, g) => t + g.procedures.length, 0), 'procedimento', 'procedimentos')} ›</span>
              </summary>
              <div className="space-y-4 border-t border-rule px-4 pt-3 pb-4">
                <p className="text-xs text-muted">
                  Procedimentos ativos do catálogo que não aparecem nos registros do período. É só o catálogo: não indica que deveriam ter sido feitos.
                </p>
                {pano.withoutRecords.map((g) => (
                  <div key={g.category}>
                    <p className="text-sm font-semibold">{g.category}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
                      {g.procedures.map((p) => (
                        <li key={p.procedureId} data-sem-registro={p.name}>
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </Section>

        <Section
          id="dificuldades"
          title="Dificuldades por tema"
          lead="Temas marcados pelos alunos na reflexão dos casos com registro no período. O texto de cada reflexão fica só na leitura do caso."
        >
          {diff.length ? (
            <ul className="divide-y divide-rule border-y border-rule" data-dificuldades>
              {diff.map((d) => (
                <li key={d.topicId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3" data-dificuldade={d.name}>
                  <span className="text-[15px] font-semibold">{d.name}</span>
                  <span className="num text-sm text-muted">
                    {n(d.cases, 'caso', 'casos')} · {n(d.students, 'aluno', 'alunos')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted" data-dificuldades-vazio>
              Nenhum tema de dificuldade marcado nos casos do período.
            </p>
          )}
        </Section>

        <Section id="alunos" title="Alunos" lead="Números do período; o último registro considera o curso inteiro. Toque no nome para abrir a produção individual (acesso registrado na auditoria).">
          {rows.length ? (
            <StudentTable rows={rows} path={path} query={{ ...keep, ...periodQuery(r) }} sp={{ ordem: first(sp, 'ordem'), dir: first(sp, 'dir') }} studentHref={(id) => `${path}/alunos/${id}?turma=${cohort.id}`} today={panel.today} />
          ) : (
            <EmptyState title="Nenhum aluno nesta turma">Os alunos aparecem aqui quando forem matriculados.</EmptyState>
          )}
        </Section>
      </div>
    </div>
  )
}
