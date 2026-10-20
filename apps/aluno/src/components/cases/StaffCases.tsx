import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight, IconCheck, IconExternal } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { CaseCover } from '@/components/cases/CaseCover'
import { CaseTeethMap } from '@/components/cases/CaseTeethMap'
import { cohortModules, loadFaculty, today } from '@/lib/academic/load'
import type { AuthState } from '@/lib/auth/session'
import { coverUrls, loadStepOptions, relatedContents } from '@/lib/cases/load'
import { caseHeadline, caseProcedures, caseTeeth, sortTeeth, timeline, treatmentSummary } from '@/lib/cases/model'
import { AUDIT_ACTION, type AuditEntry, loadCaseAudit, loadCohortCases, openStaffCase, staffCohorts } from '@/lib/cases/staff'
import { purgeCase } from '@/lib/cases/staff-actions'
import { formatDayMonth, relativeDays, year } from '@/lib/dates'
import { loadTaxonomy } from '@/lib/library/load'
import { KIND_LABEL } from '@/lib/library/model'
import { ARCH_LABEL, unitText } from '@/lib/procedures/model'

/**
 * Casos — leitura da coordenação (só a própria turma, sem os removidos) e do admin (todas as turmas, com os removidos).
 * Tudo aqui é somente leitura: não há formulário que altere o caso do aluno. A única ação é a exclusão definitiva,
 * só para o admin e só em caso já removido pelo aluno.
 */

const UUID = /^[0-9a-f-]{36}$/
const stamp = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtStamp = (iso: string) => stamp.format(new Date(iso))

function Status({ removed, status }: { removed: boolean; status: string }) {
  if (removed) return <span className="glass-strong rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80">EXCLUÍDO PELO ALUNO</span>
  if (status === 'em_andamento')
    return (
      <span className="glass-strong inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white">
        <span className="glow-dot !size-1.5" /> EM ANDAMENTO
      </span>
    )
  return (
    <span className="glass-strong inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80">
      <IconCheck size={12} /> CONCLUÍDO
    </span>
  )
}

function ReadOnlyNote({ admin }: { admin: boolean }) {
  return (
    <p role="note" className="mb-6 rounded-2xl border border-rule px-4 py-3 text-sm text-muted">
      <span className="font-semibold text-ink">Somente leitura.</span> Só o aluno altera os próprios casos. Cada caso aberto aqui fica registrado na
      auditoria (quem e quando).{admin ? ' Casos excluídos pelo aluno aparecem marcados — só o admin os vê.' : ''}
    </p>
  )
}

export async function StaffCasesPage({ auth, base, sp }: { auth: AuthState; base: string; sp: Record<string, string | string[] | undefined> }) {
  const one = (k: string) => {
    const v = sp[k]
    return (Array.isArray(v) ? v[0] : v) ?? null
  }
  const admin = auth.role === 'admin'
  const cohorts = await staffCohorts(auth)
  if (!cohorts.length) {
    return (
      <>
        <PageTitle eyebrow="Clínica" title={admin ? 'Casos' : 'Casos da turma'} />
        <p className="text-sm text-muted">Nenhuma turma para consultar.</p>
      </>
    )
  }
  const wanted = one('turma')
  const day = today()
  const active = cohorts.filter((c) => c.status === 'ativa')
  const cohort =
    cohorts.find((c) => c.id === wanted) ??
    active.find((c) => c.startsOn <= day && day <= c.endsOn) ??
    [...active].filter((c) => c.startsOn > day).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0] ??
    cohorts[0]!
  const [{ students, cases }, options] = await Promise.all([loadCohortCases(cohort.id), loadStepOptions()])
  const href = (extra: Record<string, string> = {}) => `${base}?${new URLSearchParams({ turma: cohort.id, ...extra })}`
  const studentId = one('aluno')
  const deleted = one('excluido') === '1'

  const header = (
    <>
      <PageTitle
        eyebrow={`Clínica · ${cohort.name}`}
        title={admin ? 'Casos' : 'Casos da turma'}
        lead="Casos clínicos registrados pelos alunos, identificados por iniciais ou código do paciente."
      />
      {cohorts.length > 1 ? (
        <nav aria-label="Turma" className="-mt-4 mb-6 flex flex-wrap gap-2">
          {cohorts.map((c) => (
            <Link
              key={c.id}
              href={`${base}?turma=${c.id}`}
              aria-current={c.id === cohort.id ? 'page' : undefined}
              className={`glass inline-flex min-h-10 items-center rounded-full px-4 text-sm ${c.id === cohort.id ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'}`}
            >
              {c.name}
              {c.status === 'encerrada' ? ' · encerrada' : ''}
            </Link>
          ))}
        </nav>
      ) : null}
      {deleted ? (
        <p role="status" className="glass mb-6 rounded-2xl border-l-2 border-l-[var(--brand)] px-5 py-4 text-sm">
          <span className="font-semibold">Caso excluído definitivamente.</span> O registro ficou na auditoria (quem, quando e motivo).
        </p>
      ) : null}
      <ReadOnlyNote admin={admin} />
    </>
  )

  if (studentId && UUID.test(studentId)) {
    const student = students.find((s) => s.id === studentId)
    if (!student) notFound()
    const mine = cases.filter((c) => c.ownerId === student.id)
    const covers = await coverUrls(
      mine.filter((c) => !c.removed).map((c) => c.coverPath),
      true,
    )
    return (
      <>
        {header}
        <Link href={href()} className="text-sm text-muted hover:text-ink">
          ← Todos os alunos
        </Link>
        <h2 className="mt-4 text-3xl font-light tracking-tight">{student.name}</h2>
        {mine.length ? (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((c) => {
              const procs = caseProcedures(c.records, options)
              const records = c.records.filter((r) => !r.removed).length
              return (
                <li key={c.id} data-caso={c.patientLabel}>
                  <Link href={`${base}/${c.id}`} className="glass glass-interactive group flex h-full flex-col overflow-hidden rounded-[22px]">
                    <span className="relative block">
                      <CaseCover item={{ patient: c.patientLabel }} src={c.coverPath ? covers.get(c.coverPath) : null} className="aspect-[16/9]" />
                      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                        <span className="num text-4xl leading-none font-light tracking-tight text-white">{c.patientLabel}</span>
                        <Status removed={c.removed} status={c.status} />
                      </span>
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <span className="text-lg leading-snug font-semibold">{caseHeadline(c, options)}</span>
                      {c.title && procs.length ? <span className="mt-1 text-sm text-muted">{procs.slice(0, 3).join(' · ')}</span> : null}
                      <span className="mt-auto flex items-end justify-between gap-3 pt-5 text-sm text-muted">
                        <span>
                          <span className="num">{records}</span> {records === 1 ? 'registro' : 'registros'}
                          {c.lastActivityOn ? (
                            <>
                              {' '}
                              · último em <span className="num">{formatDayMonth(c.lastActivityOn)}</span>
                            </>
                          ) : null}
                        </span>
                        <IconArrowRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState title="Nenhum caso registrado">Os casos aparecem aqui quando o aluno os registra.</EmptyState>
          </div>
        )}
      </>
    )
  }

  const rows = students.map((s) => {
    const mine = cases.filter((c) => c.ownerId === s.id)
    const visible = mine.filter((c) => !c.removed)
    const last = visible.map((c) => c.lastActivityOn).filter((d): d is string => !!d).sort().at(-1) ?? null
    return {
      s,
      total: visible.length,
      ongoing: visible.filter((c) => c.status === 'em_andamento').length,
      done: visible.filter((c) => c.status === 'concluido').length,
      removed: mine.length - visible.length,
      records: visible.reduce((n, c) => n + c.records.filter((r) => !r.removed).length, 0),
      last,
    }
  })
  const audit = admin ? await loadCaseAudit({ cohortId: cohort.id, limit: 15 }) : []

  return (
    <>
      {header}
      {rows.length ? (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Alunos da turma e seus casos</caption>
            <thead>
              <tr className="border-b border-rule text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">Aluno</th>
                <th className="px-4 py-3 text-right font-semibold">Casos</th>
                <th className="px-4 py-3 text-right font-semibold">Em andamento</th>
                <th className="px-4 py-3 text-right font-semibold">Concluídos</th>
                <th className="px-4 py-3 text-right font-semibold">Registros</th>
                {admin ? <th className="px-4 py-3 text-right font-semibold">Excluídos</th> : null}
                <th className="px-4 py-3 font-semibold">Último registro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.id} data-aluno={r.s.name} className="border-b border-rule last:border-0">
                  <td className="px-4 py-3">
                    <Link href={href({ aluno: r.s.id })} className="font-semibold hover:underline">
                      {r.s.name}
                    </Link>
                    {!r.s.active ? <span className="ml-2 text-xs text-muted">(matrícula inativa)</span> : null}
                  </td>
                  <td className="num px-4 py-3 text-right">{r.total}</td>
                  <td className="num px-4 py-3 text-right">{r.ongoing}</td>
                  <td className="num px-4 py-3 text-right">{r.done}</td>
                  <td className="num px-4 py-3 text-right">{r.records}</td>
                  {admin ? <td className="num px-4 py-3 text-right text-muted">{r.removed || '—'}</td> : null}
                  <td className="px-4 py-3 text-muted">{r.last ? `${formatDayMonth(r.last)}/${year(r.last)} (${relativeDays(day, r.last)})` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum aluno nesta turma">Os alunos aparecem aqui quando forem matriculados.</EmptyState>
      )}
      {admin ? (
        <section className="mt-12">
          <h2 className="text-2xl font-light tracking-tight">Auditoria recente da turma</h2>
          <div className="rule-brand mt-2 w-12" />
          <AuditList entries={audit} withOwner />
        </section>
      ) : null}
    </>
  )
}

function AuditList({ entries, withOwner = false }: { entries: AuditEntry[]; withOwner?: boolean }) {
  if (!entries.length) return <p className="mt-4 text-sm text-muted">Nenhum registro ainda.</p>
  return (
    <ul className="mt-4 divide-y divide-rule border-y border-rule text-sm" aria-label="Auditoria">
      {entries.map((e) => (
        <li key={e.id} data-auditoria={e.action} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
          <span className="num text-muted">{fmtStamp(e.at)}</span>
          <span className="font-semibold">{e.actorName}</span>
          <span>{AUDIT_ACTION[e.action] ?? e.action}</span>
          {withOwner && e.ownerName ? <span className="text-muted">· caso de {e.ownerName}</span> : null}
          {e.action === 'caso.excluir_definitivo' ? (
            <span className="w-full text-xs text-muted">
              Motivo: {String(e.details.motivo ?? '—')} · {String(e.details.registros ?? 0)} registros apagados
              {e.details.tinha_foto ? ' · com foto de capa' : ''}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function Block({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
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

/** Um caso, em leitura. Abrir = auditoria gravada antes de qualquer dado sair do banco. */
export async function StaffCasePage({ auth, base, id }: { auth: AuthState; base: string; id: string }) {
  const admin = auth.role === 'admin'
  const c = await openStaffCase(id)
  if (!c) notFound()
  const [options, modules, faculty, taxonomy, covers, help, audit] = await Promise.all([
    loadStepOptions(),
    cohortModules(c.cohortId),
    loadFaculty(),
    loadTaxonomy(),
    coverUrls([c.coverPath]),
    relatedContents(c, c.ownerId),
    admin ? loadCaseAudit({ caseId: c.id }) : Promise.resolve([] as AuditEntry[]),
  ])
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const moduleName = (mid: string | null) => {
    const m = modules.find((x) => x.id === mid)
    return m ? `Módulo ${m.label}` : null
  }
  const supervisor = faculty.find((f) => f.id === c.supervisorId)
  const topicName = new Map(taxonomy.topics.map((t) => [t.id, t.name]))
  const groups = timeline(c.records)
  const summary = treatmentSummary(c.records, options)
  const teethMap = caseTeeth(c.records, options)
  const back = `${base}?${new URLSearchParams({ turma: c.cohortId, aluno: c.ownerId })}`

  return (
    <article data-leitura>
      <Link href={back} className="text-sm text-muted hover:text-ink">
        ← Casos de {c.ownerName}
      </Link>
      <div className="mt-6">
        <ReadOnlyNote admin={admin} />
      </div>
      {c.removed ? (
        <p role="note" className="mb-6 rounded-2xl border border-rule-strong px-5 py-4 text-sm">
          <span className="font-semibold">Caso excluído pelo aluno.</span> Não aparece para a coordenação nem nos números. O aluno pode restaurá-lo.
        </p>
      ) : null}

      <header className="glass glass-sheen grid overflow-hidden rounded-[26px] md:grid-cols-12">
        <CaseCover
          item={{ patient: c.patientLabel }}
          src={c.coverPath ? covers.get(c.coverPath) : null}
          overlay={false}
          className="aspect-[16/7] md:col-span-4 md:aspect-auto md:min-h-64"
        />
        <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 md:col-span-8 lg:p-10">
          <div>
            <p className="eyebrow">Paciente · caso de {c.ownerName}</p>
            <h1 className="num mt-2 text-6xl leading-none font-extralight tracking-tight sm:text-7xl">{c.patientLabel}</h1>
            <p className="mt-4 text-2xl font-light">{caseHeadline(c, options)}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {c.status === 'em_andamento' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="glow-dot !size-2" /> <span className="font-semibold">Em andamento</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <IconCheck size={15} /> Concluído{c.concludedOn ? ` em ${formatDayMonth(c.concludedOn)}/${year(c.concludedOn)}` : ''}
                </span>
              )}
              {c.startedOn ? <span className="num text-muted">· desde {formatDayMonth(c.startedOn)}/{year(c.startedOn)}</span> : null}
              {supervisor ? <span className="text-muted">· Supervisor: {supervisor.name}</span> : null}
            </p>
          </div>
          {c.smileCloudUrl ? (
            <a href={c.smileCloudUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-rule-strong px-5 text-sm font-semibold hover:bg-white/[0.06]">
              Abrir no Smile Cloud <IconExternal size={15} />
            </a>
          ) : null}
        </div>
      </header>

      <div className="mt-10 space-y-14">
        {summary.length ? (
          <Block id="andamento" title="Andamento do tratamento">
            <ul className="grid gap-3 sm:grid-cols-2">
              {summary.map((s) => (
                <li key={s.procedureId} className="glass rounded-2xl p-5">
                  <p className="font-semibold">{s.procedureName}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    {s.steps.map((st, i) => (
                      <span key={st.name}>
                        {i > 0 ? ' · ' : ''}
                        {st.name} <span className="num">{unitText(st.unit, st.total)}</span>
                        {st.completes ? ' ✓' : ''}
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Block id="linha-do-tempo" title="Linha do tempo" aside={<span className="text-sm text-muted">{groups.length} {groups.length === 1 ? 'consulta' : 'consultas'}</span>}>
          {teethMap.size ? (
            <div className="glass mb-6 rounded-2xl p-4">
              <CaseTeethMap teeth={teethMap} />
            </div>
          ) : null}
          {groups.length ? (
            <ol className="space-y-6">
              {groups.map((g, gi) => (
                <li key={g.date} className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                  <p className="text-sm">
                    <span className="eyebrow block text-[10px]">Consulta {gi + 1}</span>
                    <span className="num font-semibold">
                      {formatDayMonth(g.date)}/{year(g.date)}
                    </span>
                  </p>
                  <ul className="space-y-2">
                    {g.records.map((r) => {
                      const o = byStep.get(r.stepId)
                      const mod = moduleName(r.moduleId)
                      return (
                        <li key={r.id} className="rounded-xl border border-rule px-4 py-3">
                          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-[15px] font-semibold">{o?.label ?? 'Procedimento'}</span>
                            <span className="num text-sm">{o ? unitText(o.unit, r.quantity) : r.quantity}</span>
                            {r.teeth.length ? <span className="num text-xs text-muted">{sortTeeth(r.teeth).join(' ')}</span> : null}
                            {r.arch ? <span className="text-xs text-muted">Arcada {ARCH_LABEL[r.arch].toLowerCase()}</span> : null}
                            {o?.completes ? <span className="text-xs text-muted">✓ conclui</span> : null}
                            {mod ? <span className="text-xs text-muted">{mod}</span> : null}
                            {r.description ? <span className="w-full text-xs text-ink-2">{r.description}</span> : null}
                            {r.note ? <span className="w-full text-xs text-muted">{r.note}</span> : null}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nenhum registro ativo neste caso.</p>
          )}
        </Block>

        <Block id="reflexao" title="Reflexão do aluno">
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ['Maior dificuldade', c.difficulty],
                ['Maior facilidade', c.ease],
                ['O que faria diferente', c.differently],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={i === 0 ? 'glass rounded-md border-l-2 border-l-[var(--brand)] p-5' : 'rounded-md border border-rule bg-surface p-5'}>
                <p className="eyebrow">{k}</p>
                <p className={`mt-2 text-[15px] leading-relaxed whitespace-pre-line ${v ? '' : 'text-muted'}`}>{v || 'Não preenchido.'}</p>
                {i === 0 && c.topicIds.length ? (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {c.topicIds.map((t) => (
                      <Chip key={t}>{topicName.get(t) ?? 'Tema'}</Chip>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Block>

        {help.length ? (
          <Block id="conteudos" title="Conteúdos relacionados">
            <p className="-mt-2 mb-4 text-sm text-muted">Pelos temas da dificuldade e dos procedimentos deste caso — com a situação do aluno em cada um.</p>
            <ul className="divide-y divide-rule border-y border-rule">
              {help.map((l) => (
                <li key={l.id} className="flex items-center gap-4 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{l.title}</span>
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[l.kind]} · {l.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs">
                    {l.progress?.status === 'concluido' ? '✓ Concluído' : l.progress ? '◐ Em andamento' : <span className="text-faint">— Não iniciado</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {admin ? (
          <Block id="auditoria" title="Auditoria deste caso">
            <AuditList entries={audit} />
          </Block>
        ) : null}

        {admin && c.removed ? (
          <Block id="excluir" title="Exclusão definitiva">
            <div className="rounded-2xl border border-rule-strong p-5">
              <p className="text-sm">
                Ação excepcional (pedido do titular, dado proibido registrado por engano ou ordem institucional). Apaga o caso, os registros, os temas e a foto
                de capa — <span className="font-semibold">não pode ser desfeita</span>. A auditoria guarda quem, quando, o motivo e quantos registros foram
                apagados, sem conteúdo clínico.
              </p>
              <ActionForm
                action={purgeCase}
                submit="Excluir definitivamente"
                className="mt-5"
                confirmText="Excluir este caso definitivamente? Esta ação não pode ser desfeita."
              >
                <input type="hidden" name="id" value={c.id} />
                <label className="block text-sm font-semibold">
                  Motivo (obrigatório)
                  <textarea name="motivo" required minLength={5} maxLength={300} rows={2} className="field mt-1.5 block w-full px-3 py-2.5 text-base" />
                </label>
                <label className="block text-sm font-semibold">
                  Para confirmar, digite o código do paciente: <span className="num">{c.patientLabel}</span>
                  <input name="codigo" required autoComplete="off" className="field num mt-1.5 block min-h-11 w-full px-3 text-base uppercase" />
                </label>
              </ActionForm>
            </div>
          </Block>
        ) : null}
      </div>
    </article>
  )
}
