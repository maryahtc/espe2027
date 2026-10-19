'use client'

import { cn } from '@portal/ui/cn'
import { useActionState, useMemo, useState } from 'react'
import { type ActionState, registerProcedures } from '@/lib/cases/actions'
import {
  FDI_LOWER,
  FDI_UPPER,
  type ModuleSpan,
  moduleForDate,
  patientLabelError,
  searchOptions,
  type StepOption,
  suggestTopics,
} from '@/lib/cases/model'
import { UNIT_LABEL } from '@/lib/procedures/model'

type OpenCase = { id: string; patientLabel: string; headline: string; lastActivityOn: string | null }
type Line = { key: number; option: StepOption | null; quantity: number; teeth: number[]; description: string; showTeeth: boolean; query: string }

/** Quadrantes FDI, um por linha (cabe no celular sem rolar para o lado). */
const QUADRANTS: Array<[string, number[]]> = [
  ['Superior direito', FDI_UPPER.slice(0, 8)],
  ['Superior esquerdo', FDI_UPPER.slice(8)],
  ['Inferior direito', FDI_LOWER.slice(0, 8)],
  ['Inferior esquerdo', FDI_LOWER.slice(8)],
]

const chip =
  'inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-[15px] transition-colors hover:border-ink active:scale-[0.98]'
const field = 'field mt-1.5 block min-h-12 w-full px-3 text-base'

let seq = 0
const newLine = (option: StepOption | null = null): Line => ({ key: ++seq, option, quantity: 1, teeth: [], description: '', showTeeth: false, query: '' })

/**
 * Registro rápido (meta: 20–30 s no celular). Essenciais: paciente/código, data, procedimento (etapa) e quantidade.
 * Dentes, módulo (automático pela data) e "Completar depois" são opcionais.
 */
export function QuickRegister({
  options,
  top,
  openCases,
  modules,
  today,
  supervisors,
  topics,
  initialCaseId,
}: {
  options: StepOption[]
  top: StepOption[]
  openCases: OpenCase[]
  modules: ModuleSpan[]
  today: string
  supervisors: Array<{ id: string; name: string }>
  topics: Array<{ id: string; name: string; synonyms: string[] }>
  initialCaseId: string | null
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerProcedures, undefined)
  const [mode, setMode] = useState<'novo' | 'existente'>(initialCaseId ? 'existente' : 'novo')
  const [patient, setPatient] = useState('')
  const [caseId, setCaseId] = useState<string | null>(initialCaseId)
  const [caseQuery, setCaseQuery] = useState('')
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [moduleOverride, setModuleOverride] = useState<{ id: string | null } | null>(null)
  const [extras, setExtras] = useState({ title: '', supervisorId: '', smile: '', difficulty: '', ease: '', differently: '' })
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [tried, setTried] = useState(false)

  const autoModule = useMemo(() => moduleForDate(modules, date), [modules, date])
  const shownModule = moduleOverride ? (modules.find((m) => m.id === moduleOverride.id) ?? null) : autoModule
  const sameLabel = mode === 'novo' && patient.trim() ? openCases.find((c) => c.patientLabel === patient.trim().toUpperCase()) : undefined
  const labelError = mode === 'novo' ? patientLabelError(patient) : null
  const suggested = useMemo(() => suggestTopics(extras.difficulty, topics, 5), [extras.difficulty, topics])
  const caseList = caseQuery
    ? openCases.filter((c) => `${c.patientLabel} ${c.headline}`.toLowerCase().includes(caseQuery.toLowerCase()))
    : openCases.slice(0, 3)

  const errors: string[] = []
  if (mode === 'novo' && labelError) errors.push(labelError)
  if (mode === 'existente' && !caseId) errors.push('Escolha o caso em andamento.')
  if (!date || date > today) errors.push('Informe a data (não pode ser no futuro).')
  if (!lines.some((l) => l.option)) errors.push('Escolha o que você fez.')
  if (lines.some((l) => l.option?.requiresDescription && l.description.trim().length < 3)) errors.push('Descreva o "Outro procedimento".')

  const update = (key: number, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)))
  const toggleTooth = (l: Line, t: number) => {
    const teeth = l.teeth.includes(t) ? l.teeth.filter((x) => x !== t) : [...l.teeth, t]
    const counts = l.option && (l.option.unit === 'dente' || l.option.unit === 'peca')
    update(l.key, { teeth, ...(counts && teeth.length ? { quantity: teeth.length } : {}) })
  }

  const payload = JSON.stringify({
    mode,
    caseId: mode === 'existente' ? caseId : undefined,
    patient: mode === 'novo' ? patient.trim() : undefined,
    date,
    lines: lines
      .filter((l) => l.option)
      .map((l) => ({ stepId: l.option!.stepId, quantity: l.option!.unit === 'caso' ? 1 : l.quantity, teeth: l.teeth, description: l.description })),
    module: moduleOverride ? { auto: false, id: moduleOverride.id } : { auto: true },
    extras: mode === 'novo' ? { ...extras, topicIds } : undefined,
  })

  return (
    <form
      action={action}
      onSubmit={(e) => {
        setTried(true)
        if (errors.length) e.preventDefault()
      }}
      className="space-y-8 pb-28"
      data-registro
    >
      <input type="hidden" name="payload" value={payload} />

      {/* Novo caso × caso em andamento */}
      <div role="radiogroup" aria-label="Tipo de registro" className="grid grid-cols-2 gap-1 rounded-2xl border border-rule-strong p-1">
        {(
          [
            ['novo', 'Novo caso'],
            ['existente', `Caso em andamento${openCases.length ? ` (${openCases.length})` : ''}`],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            disabled={m === 'existente' && !openCases.length}
            onClick={() => setMode(m)}
            className={cn('min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors disabled:opacity-40', mode === m ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'novo' ? (
        <div>
          <label htmlFor="paciente" className="block text-sm font-semibold">
            Paciente
          </label>
          <input
            id="paciente"
            name="paciente"
            value={patient}
            onChange={(e) => setPatient(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            placeholder="Iniciais ou código (ex.: M.A.S.)"
            className={cn(field, 'num text-lg tracking-wide')}
            aria-invalid={tried && !!labelError}
            aria-describedby="paciente-dica"
          />
          <p id="paciente-dica" className={cn('mt-1 text-xs', tried && labelError ? 'font-semibold text-danger' : 'text-muted')}>
            {tried && labelError ? labelError : 'Nunca o nome completo, CPF ou telefone.'}
          </p>
          {sameLabel ? (
            <button type="button" onClick={() => (setMode('existente'), setCaseId(sameLabel.id))} className="mt-2 text-left text-sm font-semibold underline underline-offset-4">
              Você já tem um caso em andamento com {sameLabel.patientLabel} ({sameLabel.headline}). Registrar nele?
            </button>
          ) : null}
        </div>
      ) : (
        <fieldset>
          <legend className="text-sm font-semibold">Caso</legend>
          {openCases.length > 3 ? (
            <input value={caseQuery} onChange={(e) => setCaseQuery(e.target.value)} placeholder="Buscar pelo código" className={field} aria-label="Buscar caso" />
          ) : null}
          <div className="mt-2 grid gap-2">
            {caseList.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={caseId === c.id}
                onClick={() => setCaseId(c.id)}
                className={cn('flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 text-left', caseId === c.id ? 'border-ink bg-white/[0.06]' : 'border-rule-strong')}
              >
                <span>
                  <span className="num block text-lg leading-tight">{c.patientLabel}</span>
                  <span className="block text-xs text-muted">{c.headline}</span>
                </span>
                {caseId === c.id ? <span className="text-sm font-semibold">✓</span> : null}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="data" className="block text-sm font-semibold">
          Data
        </label>
        <input id="data" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={cn(field, 'num max-w-[14rem]')} />
      </div>

      {/* O que você fez */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">O que você fez</legend>
        {lines.map((l, i) => {
          const results = searchOptions(options, l.query)
          return (
            <div key={l.key} data-linha={i} className="rounded-2xl border border-rule p-4">
              {!l.option ? (
                <div className="space-y-3">
                  {top.length ? (
                    <div className="flex flex-wrap gap-2" aria-label="Seus mais registrados">
                      {top.map((o) => (
                        <button key={o.stepId} type="button" className={chip} onClick={() => update(l.key, { option: o, quantity: 1 })}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <input
                    value={l.query}
                    onChange={(e) => update(l.key, { query: e.target.value })}
                    placeholder="Buscar: laminado, resina, extração…"
                    className={field}
                    aria-label="Buscar procedimento"
                    autoComplete="off"
                  />
                  {results.length ? (
                    <ul className="divide-y divide-rule rounded-xl border border-rule" aria-label="Resultados">
                      {results.map((o) => (
                        <li key={o.stepId}>
                          <button type="button" onClick={() => update(l.key, { option: o, quantity: 1, query: '' })} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-[15px] hover:bg-white/[0.04]">
                            <span>{o.label}</span>
                            <span className="shrink-0 text-xs text-muted">{UNIT_LABEL[o.unit].one}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : l.query.trim() ? (
                    <p className="text-sm text-muted">Nada encontrado. Use “Outro procedimento” e descreva.</p>
                  ) : null}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted hover:text-ink">Ver lista completa</summary>
                    <div className="mt-2 max-h-80 space-y-3 overflow-y-auto pr-1">
                      {[...new Set(options.map((o) => o.categoryName))].map((cat) => (
                        <div key={cat}>
                          <p className="eyebrow text-[10px]">{cat}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {options
                              .filter((o) => o.categoryName === cat)
                              .map((o) => (
                                <button key={o.stepId} type="button" className="rounded-full border border-rule px-3 py-1.5 text-left text-sm hover:border-ink" onClick={() => update(l.key, { option: o, quantity: 1 })}>
                                  {o.label}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[17px] leading-snug font-semibold" data-escolhido>
                      {l.option.label}
                    </p>
                    <button type="button" className="shrink-0 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => update(l.key, { option: null })}>
                      Trocar
                    </button>
                  </div>
                  {l.option.unit !== 'caso' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted">Quantidade</span>
                      <div className="flex items-center rounded-full border border-rule-strong">
                        <button type="button" aria-label="Menos" className="size-11 text-xl" onClick={() => update(l.key, { quantity: Math.max(1, l.quantity - 1) })}>
                          −
                        </button>
                        <span className="num w-8 text-center text-lg" aria-live="polite" data-quantidade>
                          {l.quantity}
                        </span>
                        <button type="button" aria-label="Mais" className="size-11 text-xl" onClick={() => update(l.key, { quantity: Math.min(99, l.quantity + 1) })}>
                          +
                        </button>
                      </div>
                      <span className="text-sm">{l.quantity === 1 ? UNIT_LABEL[l.option.unit].one : UNIT_LABEL[l.option.unit].many}</span>
                      <button type="button" className="ml-auto text-sm font-semibold underline-offset-4 hover:underline" aria-expanded={l.showTeeth} onClick={() => update(l.key, { showTeeth: !l.showTeeth })}>
                        {l.teeth.length ? `Dentes: ${l.teeth.join(' ')}` : 'Dentes (opcional)'}
                      </button>
                    </div>
                  ) : null}
                  {l.showTeeth ? (
                    <div className="space-y-2" aria-label="Dentes">
                      {QUADRANTS.map(([name, teeth]) => (
                        <div key={name}>
                          <p className="text-[10px] tracking-wider text-muted uppercase">{name}</p>
                          <div className="mt-0.5 grid grid-cols-8 gap-1">
                            {teeth.map((t) => (
                              <button
                                key={t}
                                type="button"
                                aria-pressed={l.teeth.includes(t)}
                                onClick={() => toggleTooth(l, t)}
                                className={cn('num h-10 rounded-md border text-sm', l.teeth.includes(t) ? 'border-ink bg-ink text-on-ink' : 'border-rule-strong text-muted')}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {l.option.requiresDescription ? (
                    <input
                      value={l.description}
                      onChange={(e) => update(l.key, { description: e.target.value })}
                      maxLength={120}
                      placeholder="Descreva o procedimento (sem dados do paciente)"
                      className={field}
                      aria-label="Descrição do procedimento"
                    />
                  ) : null}
                </div>
              )}
              {lines.length > 1 ? (
                <button type="button" className="mt-3 text-xs text-muted hover:text-ink" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  Remover esta linha
                </button>
              ) : null}
            </div>
          )
        })}
        <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="text-sm font-semibold underline-offset-4 hover:underline">
          + Outro procedimento nesta consulta
        </button>
      </fieldset>

      {/* Módulo automático pela data, corrigível */}
      <div className="text-sm">
        <p>
          <span className="text-muted">Módulo: </span>
          <span className="font-semibold" data-modulo>
            {shownModule ? `${shownModule.label} · ${shownModule.title}` : 'nenhum'}
          </span>
          <span className="text-muted">{moduleOverride ? ' (escolhido por você)' : ' (pela data)'}</span>
        </p>
        <details className="mt-1">
          <summary className="cursor-pointer text-muted hover:text-ink">Alterar módulo</summary>
          <select
            aria-label="Módulo"
            className={cn(field, 'max-w-md')}
            value={moduleOverride ? (moduleOverride.id ?? 'nenhum') : 'auto'}
            onChange={(e) => setModuleOverride(e.target.value === 'auto' ? null : { id: e.target.value === 'nenhum' ? null : e.target.value })}
          >
            <option value="auto">Automático pela data</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.title}
              </option>
            ))}
            <option value="nenhum">Sem módulo</option>
          </select>
        </details>
      </div>

      {mode === 'novo' ? (
        <details className="rounded-2xl border border-rule p-4">
          <summary className="cursor-pointer text-sm font-semibold">Completar depois (opcional)</summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted">Pode deixar em branco e completar na página do caso. Não escreva dados que identifiquem o paciente.</p>
            <label className="block text-sm font-semibold">
              Título do caso
              <input value={extras.title} onChange={(e) => setExtras({ ...extras, title: e.target.value })} maxLength={80} placeholder="Ex.: Reabilitação anterior superior" className={field} />
            </label>
            <label className="block text-sm font-semibold">
              Supervisor (só informativo)
              <select value={extras.supervisorId} onChange={(e) => setExtras({ ...extras, supervisorId: e.target.value })} className={field}>
                <option value="">—</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Link do Smile Cloud
              <input value={extras.smile} onChange={(e) => setExtras({ ...extras, smile: e.target.value })} inputMode="url" placeholder="https://… (o link que exige login)" className={field} />
            </label>
            <label className="block text-sm font-semibold">
              Maior dificuldade
              <textarea value={extras.difficulty} onChange={(e) => setExtras({ ...extras, difficulty: e.target.value })} rows={2} maxLength={1000} className="field mt-1.5 block w-full px-3 py-2.5 text-base" />
            </label>
            {suggested.length ? (
              <div>
                <p className="text-xs text-muted">Tem a ver com algum destes temas? (até 3)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggested.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={topicIds.includes(t.id)}
                      onClick={() => setTopicIds((ids) => (ids.includes(t.id) ? ids.filter((x) => x !== t.id) : ids.length < 3 ? [...ids, t.id] : ids))}
                      className={cn(chip, 'min-h-9 text-sm', topicIds.includes(t.id) && 'border-ink bg-ink text-on-ink')}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="block text-sm font-semibold">
              Maior facilidade
              <textarea value={extras.ease} onChange={(e) => setExtras({ ...extras, ease: e.target.value })} rows={2} maxLength={1000} className="field mt-1.5 block w-full px-3 py-2.5 text-base" />
            </label>
            <label className="block text-sm font-semibold">
              Faria diferente?
              <textarea value={extras.differently} onChange={(e) => setExtras({ ...extras, differently: e.target.value })} rows={2} maxLength={1000} className="field mt-1.5 block w-full px-3 py-2.5 text-base" />
            </label>
          </div>
        </details>
      ) : null}

      {/* Ação fixa no rodapé (polegar) */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 border-t border-rule bg-black/85 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="min-h-12 flex-1 rounded-full bg-[var(--brand)] px-6 text-base font-semibold text-white disabled:opacity-60 lg:flex-none">
            {pending ? 'Salvando…' : 'Salvar registro'}
          </button>
          {tried && errors.length ? (
            <p role="alert" className="w-full text-xs font-semibold text-danger">
              {errors[0]}
            </p>
          ) : state?.erro ? (
            <p role="alert" className="w-full text-xs font-semibold text-danger">
              ⚠ {state.erro}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  )
}
