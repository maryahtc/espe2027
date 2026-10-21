import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconCheck, IconExternal, IconPlus } from '@portal/ui/icons'
import { Chip } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { CaseCover, CoverBadge } from '@/components/cases/CaseCover'
import { CaseTeethMap } from '@/components/cases/CaseTeethMap'
import { CoverUpload } from '@/components/cases/CoverUpload'
import { RecordPlacement } from '@/components/cases/RecordPlacement'
import { cohortModules, loadFaculty } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { saveCaseDetails, setCaseRemoved, setCaseStatus, setRecordRemoved, updateRecord } from '@/lib/cases/actions'
import { canRegister, coverUrls, loadMyCase, loadStepOptions, relatedContents } from '@/lib/cases/load'
import { getSimulation } from '@/lib/simulation/session'
import { caseHeadline, caseTeeth, hasOwnStepName, type RecordVM, sortTeeth, type StepOption, suggestTopics, timeline, treatmentSummary, usesPositions } from '@/lib/cases/model'
import { odontogramReady } from '@/lib/cases/schema'
import { formatDayMonth, formatLongDay, year } from '@/lib/dates'
import { loadTaxonomy } from '@/lib/library/load'
import { KIND_LABEL } from '@/lib/library/model'
import { ARCH_LABEL, unitText } from '@/lib/procedures/model'
import { guardStudentPage } from '@/lib/simulation/guard'

export const metadata: Metadata = { title: 'Caso' }

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

const inputCls = 'field mt-1.5 block min-h-11 w-full px-3 text-base'
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ registrado?: string; dente?: string }> }) {
  await guardStudentPage()
  const auth = await requireUser()
  if (!auth) notFound()
  const [{ id }, { registrado, dente }] = await Promise.all([params, searchParams])
  const c = await loadMyCase(id, auth.userId)
  if (!c) notFound()
  const [options, modules, faculty, taxonomy, writable, covers, archSupported] = await Promise.all([
    loadStepOptions(),
    cohortModules(c.cohortId),
    loadFaculty(),
    loadTaxonomy(),
    canRegister(c.cohortId),
    coverUrls([c.coverPath]),
    odontogramReady(),
  ])
  const help = await relatedContents(c, auth.userId)
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const moduleName = (mid: string | null) => {
    const m = modules.find((x) => x.id === mid)
    return m ? `Módulo ${m.label}` : null
  }
  const supervisor = faculty.find((f) => f.id === c.supervisorId)
  const topicName = new Map(taxonomy.topics.map((t) => [t.id, t.name]))
  // Odontograma do caso (derivado dos registros) e filtro da linha do tempo por posição FDI.
  const teethMap = caseTeeth(c.records, options)
  const tooth = dente && teethMap.has(Number(dente)) ? Number(dente) : null
  const groups = timeline(tooth ? c.records.filter((r) => r.teeth.includes(tooth)) : c.records)
  const removedRecords = c.records.filter((r) => r.removed)
  const summary = treatmentSummary(c.records, options)
  const editable = writable && !c.removed
  const suggested = suggestTopics(c.difficulty ?? '', taxonomy.topics, 5).filter((t) => !c.topicIds.includes(t.id))
  const justSaved = Number(registrado) > 0
  const coverSrc = c.coverPath ? (covers.get(c.coverPath) ?? null) : null

  return (
    <article>
      <Link href="/casos" className="text-sm text-muted hover:text-ink">
        ← Meus casos
      </Link>

      {justSaved ? (
        <div role="status" className="glass mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-2 border-l-[var(--brand)] px-5 py-4">
          <p className="text-[15px]">
            <span className="font-semibold">Registrado ✓</span> · {registrado} {Number(registrado) === 1 ? 'procedimento' : 'procedimentos'} em {c.patientLabel}
            {help.length ? (
              <>
                {' '}
                ·{' '}
                <a href="#ajuda" className="font-semibold underline underline-offset-4">
                  conteúdos que podem ajudar
                </a>
              </>
            ) : null}
          </p>
          {editable ? (
            <a href="#reflexao" className="text-sm text-muted hover:text-ink">
              Completar caso
            </a>
          ) : null}
        </div>
      ) : null}

      {c.removed ? (
        <div role="note" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rule-strong px-5 py-4 text-sm">
          <span>
            <span className="font-semibold">Caso excluído.</span> Não aparece nas listas nem nos números. Você pode restaurá-lo.
          </span>
          {writable ? (
            <ActionForm action={setCaseRemoved} submit="Restaurar caso" silent>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="excluir" value="nao" />
            </ActionForm>
          ) : null}
        </div>
      ) : null}

      {/* Com foto: capa valorizada. Sem foto: só um selo pequeno — as informações do caso vêm primeiro. */}
      <header className={cn('glass glass-sheen mt-6 overflow-hidden rounded-[26px]', coverSrc && 'grid md:grid-cols-12')} data-capa-caso={coverSrc ? 'foto' : 'sem-foto'}>
        {coverSrc ? <CaseCover item={{ patient: c.patientLabel }} src={coverSrc} overlay={false} className="aspect-[16/7] md:col-span-4 md:aspect-auto md:min-h-64" /> : null}
        <div className={cn('flex flex-col justify-between p-6 sm:p-8 lg:p-10', coverSrc ? 'gap-8 md:col-span-8' : 'gap-6')}>
          <div>
            <p className="eyebrow">Paciente</p>
            <div className="mt-2 flex items-center gap-4">
              {coverSrc ? null : <CoverBadge />}
              <h1 className="num text-6xl leading-none font-extralight tracking-tight sm:text-7xl">{c.patientLabel}</h1>
            </div>
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
          <div className="flex flex-wrap items-center gap-3">
            {editable ? (
              <ButtonLink href={`/casos/novo?caso=${c.id}`}>
                <IconPlus size={16} /> Registrar procedimento
              </ButtonLink>
            ) : null}
            {c.smileCloudUrl ? (
              <a href={c.smileCloudUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-5 text-sm font-semibold hover:bg-white/[0.06]">
                Abrir no Smile Cloud <IconExternal size={15} />
              </a>
            ) : null}
            {editable ? (
              <ActionForm action={setCaseStatus} submit={c.status === 'em_andamento' ? 'Concluir caso' : 'Reabrir caso'} variant="secondary" silent>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="para" value={c.status === 'em_andamento' ? 'concluido' : 'em_andamento'} />
              </ActionForm>
            ) : null}
          </div>
          {editable ? <CoverUpload caseId={c.id} hasCover={!!c.coverPath} simulated={!!(await getSimulation())} /> : null}
          {!writable ? <p className="text-xs text-muted">Turma encerrada: o caso fica disponível só para consulta.</p> : null}
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
                  {s.pendingTeeth.length ? (
                    <p className="mt-2 text-xs text-muted">
                      Ainda sem a etapa final: <span className="num text-ink">{s.pendingTeeth.join(' ')}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Block id="linha-do-tempo" title="Linha do tempo" aside={<span className="text-sm text-muted">{groups.length} {groups.length === 1 ? 'consulta' : 'consultas'}</span>}>
          {teethMap.size ? (
            <div className="glass mb-6 rounded-2xl p-4">
              <CaseTeethMap teeth={teethMap} selected={tooth} hrefFor={(t) => (t === tooth ? `/casos/${c.id}#linha-do-tempo` : `/casos/${c.id}?dente=${t}#linha-do-tempo`)} />
              {tooth ? (
                <p className="mt-3 text-sm" data-filtro-dente>
                  Mostrando os registros do dente <span className="num font-semibold">{tooth}</span> ·{' '}
                  <Link href={`/casos/${c.id}#linha-do-tempo`} scroll={false} className="font-semibold underline underline-offset-4">
                    ver todos
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          {groups.length ? (
            <ol className="space-y-6">
              {groups.map((g, gi) => (
                <li key={g.date} className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                  <p className="text-sm">
                    <span className="eyebrow block text-[10px]">Consulta {gi + 1}</span>
                    <span className="num font-semibold">{formatDayMonth(g.date)}/{year(g.date)}</span>
                    <span className="block text-xs text-muted">{capitalize(formatLongDay(g.date).split(',')[0] ?? '')}</span>
                  </p>
                  <ul className="space-y-2">
                    {g.records.map((r) => (
                      <RecordRow key={r.id} r={r} o={byStep.get(r.stepId)} moduleName={moduleName(r.moduleId)} modules={modules} editable={editable} archSupported={archSupported} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nenhum registro ativo neste caso.</p>
          )}
          {removedRecords.length ? (
            <details className="mt-6 text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink">Registros excluídos ({removedRecords.length})</summary>
              <ul className="mt-3 space-y-2">
                {removedRecords.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-rule-strong px-4 py-2">
                    <span className="text-muted line-through">
                      {formatDayMonth(r.performedOn)} · {byStep.get(r.stepId)?.label ?? 'Procedimento'} · {r.quantity}
                    </span>
                    {editable ? (
                      <ActionForm action={setRecordRemoved} submit="Restaurar" quiet>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="excluir" value="nao" />
                      </ActionForm>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Block>

        <Block id="reflexao" title="Reflexão e dados do caso">
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ['Maior dificuldade', c.difficulty],
                ['Maior facilidade', c.ease],
                ['O que faria diferente', c.differently],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={cn('rounded-md p-5', i === 0 ? 'glass border-l-2 border-l-[var(--brand)]' : 'border border-rule bg-surface')}>
                <p className="eyebrow">{k}</p>
                <p className={cn('mt-2 text-[15px] leading-relaxed whitespace-pre-line', !v && 'text-muted')}>{v || 'Não preenchido.'}</p>
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

          {editable ? (
            <details className="mt-6 rounded-2xl border border-rule p-5" id="completar">
              <summary className="cursor-pointer text-sm font-semibold">Completar / editar</summary>
              <ActionForm action={saveCaseDetails} className="mt-5">
                <input type="hidden" name="id" value={c.id} />
                <p className="text-xs text-muted">Não escreva nome, CPF, telefone ou dados de saúde que identifiquem o paciente.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Paciente (iniciais ou código)
                    <input name="paciente" defaultValue={c.patientLabel} maxLength={12} required className={cn(inputCls, 'num uppercase')} />
                  </label>
                  <label className="block text-sm font-semibold">
                    Título do caso
                    <input name="titulo" defaultValue={c.title ?? ''} maxLength={80} placeholder="Ex.: Reabilitação anterior superior" className={inputCls} />
                  </label>
                  <label className="block text-sm font-semibold">
                    Supervisor (só informativo)
                    <select name="supervisor" defaultValue={c.supervisorId ?? ''} className={inputCls}>
                      <option value="">—</option>
                      {faculty
                        .filter((f) => f.active || f.id === c.supervisorId)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">
                    Link do Smile Cloud
                    <input name="smile" defaultValue={c.smileCloudUrl ?? ''} inputMode="url" placeholder="https://… (o link que exige login)" className={inputCls} />
                  </label>
                </div>
                {(
                  [
                    ['dificuldade', 'Maior dificuldade', c.difficulty],
                    ['facilidade', 'Maior facilidade', c.ease],
                    ['diferente', 'O que faria diferente', c.differently],
                  ] as const
                ).map(([name, label, v]) => (
                  <label key={name} className="block text-sm font-semibold">
                    {label}
                    <textarea name={name} defaultValue={v ?? ''} rows={2} maxLength={1000} className="field mt-1.5 block w-full px-3 py-2.5 text-base" />
                  </label>
                ))}
                <fieldset>
                  <legend className="text-sm font-semibold">Temas da dificuldade (até 3)</legend>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {[...c.topicIds.map((t) => ({ id: t, name: topicName.get(t) ?? 'Tema' })), ...suggested].map((t) => (
                      <label key={t.id} className="inline-flex min-h-10 items-center gap-2 text-sm">
                        <input type="checkbox" name="temas" value={t.id} defaultChecked={c.topicIds.includes(t.id)} className="size-4 accent-[var(--brand)]" />
                        {t.name}
                        {!c.topicIds.includes(t.id) ? <span className="text-xs text-muted">(sugerido)</span> : null}
                      </label>
                    ))}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted hover:text-ink">Ver todos os temas</summary>
                    <div className="mt-2 grid max-h-64 gap-x-5 overflow-y-auto sm:grid-cols-2">
                      {taxonomy.topics
                        .filter((t) => !c.topicIds.includes(t.id) && !suggested.some((s) => s.id === t.id))
                        .map((t) => (
                          <label key={t.id} className="inline-flex min-h-9 items-center gap-2 text-sm">
                            <input type="checkbox" name="temas" value={t.id} className="size-4 accent-[var(--brand)]" />
                            {t.name}
                          </label>
                        ))}
                    </div>
                  </details>
                </fieldset>
              </ActionForm>
            </details>
          ) : null}
        </Block>

        {help.length ? (
          <Block id="ajuda" title="Conteúdos que podem ajudar neste ponto">
            <p className="-mt-2 mb-4 text-sm text-muted">Pelos temas da dificuldade e dos procedimentos deste caso.</p>
            <ul className="divide-y divide-rule border-y border-rule">
              {help.map((l) => (
                <li key={l.id}>
                  <Link href={`/biblioteca/${l.slug}`} className="group flex items-center gap-4 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold group-hover:underline">{l.title}</span>
                      <span className="block text-xs text-muted">
                        {KIND_LABEL[l.kind]} · {l.category}
                        {l.progress?.status === 'concluido' ? ' · ✓ concluído' : l.progress ? ' · em andamento' : ''}
                      </span>
                    </span>
                    <IconArrowRight size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {editable ? (
          <section className="border-t border-rule pt-8">
            <ActionForm
              action={setCaseRemoved}
              submit="Excluir caso"
              quiet
              confirmText="Excluir este caso? Ele sai das listas e dos números, mas fica em “Excluídos” e pode ser restaurado."
            >
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="excluir" value="sim" />
            </ActionForm>
            <p className="mt-1 text-xs text-muted">Excluir não apaga: o caso vai para “Excluídos” e pode ser restaurado.</p>
          </section>
        ) : null}
      </div>
      <p className="mt-10 text-xs text-muted">Fotos, exames e planejamento ficam no Smile Cloud.</p>
    </article>
  )
}

function RecordRow({
  r,
  o,
  moduleName,
  modules,
  editable,
  archSupported,
}: {
  r: RecordVM
  o: StepOption | undefined
  moduleName: string | null
  modules: Array<{ id: string; label: string; title: string }>
  editable: boolean
  archSupported: boolean
}) {
  const summary = (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-[15px]">
        <span className="font-semibold">{o?.procedureName ?? 'Procedimento'}</span>
        {o && hasOwnStepName(o) ? <span className="text-ink-2"> · {o.stepName}</span> : null}
      </span>
      <span className="num text-sm">{o ? unitText(o.unit, r.quantity) : r.quantity}</span>
      {r.teeth.length ? <span className="num text-xs text-muted">{sortTeeth(r.teeth).join(' ')}</span> : null}
      {r.arch ? <span className="text-xs text-muted">Arcada {ARCH_LABEL[r.arch].toLowerCase()}</span> : null}
      {o?.completes ? <span className="text-xs text-muted">✓ conclui</span> : null}
      {moduleName ? <span className="text-xs text-muted">{moduleName}</span> : null}
      {r.description ? <span className="w-full text-xs text-ink-2">{r.description}</span> : null}
      {r.note ? <span className="w-full text-xs text-muted">{r.note}</span> : null}
    </span>
  )
  if (!editable) return <li className="rounded-xl border border-rule px-4 py-3">{summary}</li>
  return (
    <li data-registro={r.id}>
      <details className="group rounded-xl border border-rule">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">{summary}</span>
          <span className="shrink-0 pt-0.5 text-xs font-semibold text-muted group-open:hidden">Editar</span>
        </summary>
        <div className="border-t border-rule px-4 py-4">
          <ActionForm action={updateRecord}>
            <input type="hidden" name="id" value={r.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                Data
                <input type="date" name="data" defaultValue={r.performedOn} required className={inputCls} />
              </label>
              {o ? (
                <RecordPlacement location={o.location} unit={o.unit} positions={usesPositions(o)} teeth={r.teeth} arch={r.arch} quantity={r.quantity} archSupported={archSupported} inputCls={inputCls} />
              ) : (
                <input type="hidden" name="quantidade" value={r.quantity} />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Módulo
                <select name="modulo" defaultValue={r.moduleAuto ? 'auto' : (r.moduleId ?? 'nenhum')} className={inputCls}>
                  <option value="auto">Automático pela data</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.title}
                    </option>
                  ))}
                  <option value="nenhum">Sem módulo</option>
                </select>
              </label>
              {o?.requiresDescription ? (
                <label className="block text-sm font-semibold">
                  Descrição
                  <input name="descricao" defaultValue={r.description ?? ''} maxLength={120} required className={inputCls} />
                </label>
              ) : (
                <label className="block text-sm font-semibold">
                  Observação deste registro (opcional)
                  <input name="nota" defaultValue={r.note ?? ''} maxLength={200} className={inputCls} />
                  <span className="mt-1 block text-xs font-normal text-muted">Não é prontuário: a documentação clínica fica no Smile Cloud.</span>
                </label>
              )}
            </div>
          </ActionForm>
          <ActionForm action={setRecordRemoved} submit="Excluir este registro" quiet className="mt-3" confirmText="Excluir este registro? Ele sai dos números e pode ser restaurado.">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="excluir" value="sim" />
          </ActionForm>
        </div>
      </details>
    </li>
  )
}
