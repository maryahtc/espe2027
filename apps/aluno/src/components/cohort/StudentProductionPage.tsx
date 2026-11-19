import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight, IconCheck } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PeriodFilters } from '@/components/production/PeriodFilters'
import { ProductionReport, Section } from '@/components/production/ProductionReport'
import { today } from '@/lib/academic/load'
import type { AuthState } from '@/lib/auth/session'
import { caseHeadline } from '@/lib/cases/model'
import { studentProduction } from '@/lib/cohort/load'
import { formatDayMonth, year } from '@/lib/dates'
import { resolvePeriod } from '@/lib/production/period'

/**
 * Etapa 10 — produção individual de um aluno, vista pela coordenação (turmas que coordena) ou pelo Admin. Somente
 * leitura, com o mesmo visual da Minha Produção. O ÚNICO caminho de dados é `studentProduction`, que grava a auditoria
 * no banco antes de ler (log_student_production_view); sem a função de auditoria no banco, a página fica indisponível.
 * Os casos abrem na leitura de caso já existente, que tem a própria auditoria (log_case_view).
 */

type SP = Record<string, string | string[] | undefined>
const first = (sp: SP, k: string) => {
  const v = sp[k]
  return (Array.isArray(v) ? v[0] : v) ?? undefined
}

export async function StudentProductionPage({
  auth,
  studentId,
  sp,
  panelPath,
  casesPath,
  eyebrow,
}: {
  auth: AuthState
  studentId: string
  sp: SP
  /** Visão da turma de onde se veio (link de volta). */
  panelPath: string
  /** Leitura de caso auditada (coordenação ou Admin). */
  casesPath: string
  eyebrow: string
}) {
  const cohortId = first(sp, 'turma')
  if (!cohortId) notFound()
  const view = await studentProduction(auth, cohortId, studentId)
  if (!view) notFound()
  const back = (
    <Link href={`${panelPath}?turma=${cohortId}#alunos`} className="text-sm text-muted hover:text-ink" data-voltar>
      ← Visão da turma
    </Link>
  )
  if (view.state === 'indisponivel') {
    return (
      <div data-producao-individual="indisponivel">
        {back}
        <div className="mt-6">
          <EmptyState title="Produção individual indisponível">
            A abertura da produção de um aluno precisa ser registrada na auditoria, e este banco ainda não tem esse registro. Enquanto isso, a página
            fica fechada. A Visão da turma e a leitura de casos continuam disponíveis.
          </EmptyState>
        </div>
      </div>
    )
  }

  const { cohort, student, base, options, spans } = view
  const day = today()
  const r = resolvePeriod({ filtro: first(sp, 'filtro'), de: first(sp, 'de'), ate: first(sp, 'ate') }, cohort, spans, day)
  const cases = view.cases.filter((c) => !c.removed).sort((a, b) => (b.lastActivityOn ?? b.createdAt).localeCompare(a.lastActivityOn ?? a.createdAt))
  const path = `${panelPath}/alunos/${student.id}`

  return (
    <div data-producao-individual={student.id}>
      {back}
      <div className="mt-4">
        <PageTitle eyebrow={`${eyebrow} · ${cohort.name}`} title={student.name} lead="Produção clínica registrada pelo aluno no portal." />
      </div>
      <p role="note" className="-mt-2 mb-6 rounded-2xl border border-rule px-4 py-3 text-sm text-muted" data-aviso-auditoria>
        <span className="font-semibold text-ink">Somente leitura.</span> Este acesso fica registrado na auditoria (quem, qual aluno e quando). Ausência de
        registro no portal não significa ausência de atividade clínica.
        {!student.active ? <span className="mt-1 block text-ink-2">Matrícula inativa nesta turma.</span> : null}
      </p>

      {base.records.length ? (
        <div data-producao>
          <PeriodFilters r={r} path={path} keep={{ turma: cohort.id }} defaultFrom={cohort.startsOn} today={day} />
          <ProductionReport viewer="equipe" base={base} r={r} options={options} spans={spans} cohort={cohort} today={day} />
        </div>
      ) : (
        <p className="glass rounded-2xl p-5 text-sm" data-producao="vazia">
          Nenhum registro clínico deste aluno no portal até agora.
        </p>
      )}

      <div className="mt-14">
        <Section id="casos-aluno" title="Casos" lead="Casos do aluno nesta turma. Cada caso aberto também fica registrado na auditoria.">
          {cases.length ? (
            <ul className="divide-y divide-rule border-y border-rule" data-casos-aluno>
              {cases.map((c) => {
                const records = c.records.filter((x) => !x.removed).length
                return (
                  <li key={c.id} data-caso={c.patientLabel}>
                    <Link href={`${casesPath}/${c.id}`} prefetch={false} className="group flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-x-3">
                          <span className="num text-lg font-light">{c.patientLabel}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            {c.status === 'concluido' ? (
                              <>
                                <IconCheck size={12} /> Concluído
                              </>
                            ) : (
                              'Em andamento'
                            )}
                          </span>
                        </span>
                        <span className="block truncate text-sm text-ink-2">{caseHeadline(c, options)}</span>
                        <span className="num block text-xs text-muted">
                          {records} {records === 1 ? 'registro' : 'registros'}
                          {c.lastActivityOn ? ` · último em ${formatDayMonth(c.lastActivityOn)}/${year(c.lastActivityOn)}` : ''}
                        </span>
                      </span>
                      <IconArrowRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum caso registrado nesta turma.</p>
          )}
        </Section>
      </div>
    </div>
  )
}
