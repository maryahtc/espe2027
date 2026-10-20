'use client'

import { cn } from '@portal/ui/cn'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { ArchPicker, Odontogram } from '@/components/cases/Odontogram'
import { type ActionState, registerProcedures } from '@/lib/cases/actions'
import {
  lineError,
  lineQuantity,
  type ModuleSpan,
  moduleForDate,
  patientLabelError,
  searchOptions,
  sortTeeth,
  type StepOption,
  suggestTopics,
} from '@/lib/cases/model'
import { type DentalArch, UNIT_LABEL } from '@/lib/procedures/model'

type OpenCase = { id: string; patientLabel: string; headline: string; lastActivityOn: string | null }
type Line = {
  key: number
  option: StepOption
  quantity: number
  teeth: number[]
  arch: DentalArch | null
  description: string
  note: string
  showNote: boolean
  showTeeth: boolean
}
type Entry = 'dente' | 'procedimento'
const ENTRY_KEY = 'conexo.registro.entrada'

/** Ajuda curta: o número FDI é só a posição (inclui elemento protético/pôntico), nunca uma condição. */
function teethHint(o: StepOption): string {
  return o.unit === 'peca'
    ? 'Marque a posição FDI de cada elemento (inclusive pôntico ou implante). O número indica só a posição.'
    : 'Marque os dentes (posição FDI). Opcional.'
}

const chip =
  'inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-[15px] transition-colors hover:border-ink active:scale-[0.98]'
const field = 'field mt-1.5 block min-h-12 w-full px-3 text-base'

let seq = 0
const newLine = (option: StepOption, teeth: number[] = [], showTeeth = false): Line => ({
  key: ++seq,
  option,
  quantity: teeth.length || 1,
  teeth,
  arch: null,
  description: '',
  note: '',
  showNote: false,
  showTeeth,
})

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
  archSupported = true,
}: {
  options: StepOption[]
  top: StepOption[]
  openCases: OpenCase[]
  modules: ModuleSpan[]
  today: string
  supervisors: Array<{ id: string; name: string }>
  topics: Array<{ id: string; name: string; synonyms: string[] }>
  initialCaseId: string | null
  /** O banco já tem a arcada (migração do odontograma). Sem ela: comportamento anterior. */
  archSupported?: boolean
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerProcedures, undefined)
  const [mode, setMode] = useState<'novo' | 'existente'>(initialCaseId ? 'existente' : 'novo')
  const [patient, setPatient] = useState('')
  const [caseId, setCaseId] = useState<string | null>(initialCaseId)
  const [caseQuery, setCaseQuery] = useState('')
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<Line[]>([])
  // Dois caminhos para o mesmo registro: começa "Por dente" na primeira vez e depois lembra a última escolha.
  const [entry, setEntryState] = useState<Entry>('dente')
  const [adding, setAdding] = useState(true)
  const [pick, setPick] = useState<number[]>([])
  const [pickStage, setPickStage] = useState<'dentes' | 'etapa'>('dentes')
  const [query, setQuery] = useState('')
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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ENTRY_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência lida uma vez do aparelho
      if (saved === 'dente' || saved === 'procedimento') setEntryState(saved)
    } catch {
      // sem armazenamento local: começa "Por dente"
    }
  }, [])
  const setEntry = (e: Entry) => {
    setEntryState(e)
    setAdding(true)
    setQuery('')
    try {
      window.localStorage.setItem(ENTRY_KEY, e)
    } catch {
      // ignora
    }
  }

  const active = options.filter((o) => o.active)
  // "Por dente": só etapas que identificam posições FDI (definido na etapa, não pela unidade).
  const toothOptions = active.filter((o) => o.location === 'dentes')
  const pool = entry === 'dente' ? toothOptions : active
  const poolTop = top.filter((o) => pool.some((p) => p.stepId === o.stepId))
  const results = searchOptions(pool, query)

  const errors: string[] = []
  if (mode === 'novo' && labelError) errors.push(labelError)
  if (mode === 'existente' && !caseId) errors.push('Escolha o caso em andamento.')
  if (!date || date > today) errors.push('Informe a data (não pode ser no futuro).')
  if (!lines.length) errors.push('Escolha o que você fez.')
  for (const l of lines) {
    const e = lineError(l.option, l, archSupported)
    if (e) errors.push(e)
  }

  const update = (key: number, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)))
  const choose = (o: StepOption) => {
    // Por dente: a etapa vale para as posições escolhidas. Por procedimento: posições/arcada na própria linha.
    setLines((ls) => [...ls, entry === 'dente' ? newLine(o, pick) : newLine(o, [], o.location === 'dentes')])
    setQuery('')
    setAdding(false)
  }

  const payload = JSON.stringify({
    mode,
    caseId: mode === 'existente' ? caseId : undefined,
    patient: mode === 'novo' ? patient.trim() : undefined,
    date,
    lines: lines.map((l) => ({
      stepId: l.option.stepId,
      quantity: lineQuantity(l.option, l, archSupported),
      teeth: l.option.location === 'dentes' ? l.teeth : [],
      arch: archSupported && l.option.location === 'arcada' ? l.arch : null,
      description: l.description,
      note: l.note,
    })),
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

      {/* O que você fez — dois caminhos para o mesmo registro */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">O que você fez</legend>
        <div role="radiogroup" aria-label="Começar por" className="grid grid-cols-2 gap-1 rounded-2xl border border-rule-strong p-1" data-entrada={entry}>
          {(
            [
              ['dente', 'Por dente'],
              ['procedimento', 'Por procedimento'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={entry === v}
              onClick={() => setEntry(v)}
              className={cn('min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors', entry === v ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>

        {lines.map((l, i) => (
          <LineCard key={l.key} l={l} index={i} archSupported={archSupported} update={update} remove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
        ))}

        {adding ? (
          <div className="space-y-4 rounded-2xl border border-rule p-3 sm:p-4" data-composer>
            {entry === 'dente' && pickStage === 'dentes' ? (
              <>
                <Odontogram value={pick} onChange={setPick} label="Selecione os dentes" hint="Toque nas posições ou deslize o dedo pela linha. O número indica só a posição FDI." />
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-rule-strong bg-white/[0.04] px-4 py-3">
                  <span className="num text-sm" data-selecao>
                    {pick.length ? `${pick.length} ${pick.length === 1 ? 'posição' : 'posições'} · ${sortTeeth(pick).join(' ')}` : 'Nenhuma posição marcada'}
                  </span>
                  <button
                    type="button"
                    disabled={!pick.length}
                    onClick={() => setPickStage('etapa')}
                    className="min-h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-40"
                  >
                    Escolher procedimento →
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {entry === 'dente' ? (
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="num">
                      Posições: <span className="font-semibold">{sortTeeth(pick).join(' ')}</span>
                    </span>
                    <button type="button" className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => setPickStage('dentes')}>
                      Alterar posições
                    </button>
                  </p>
                ) : null}
                {poolTop.length ? (
                  <div className="flex flex-wrap gap-2" aria-label="Seus mais registrados">
                    {poolTop.map((o) => (
                      <button key={o.stepId} type="button" className={chip} onClick={() => choose(o)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={entry === 'dente' ? 'Buscar procedimento para estes dentes…' : 'Buscar: laminado, resina, extração…'}
                  className={field}
                  aria-label="Buscar procedimento"
                  autoComplete="off"
                />
                {results.length ? (
                  <ul className="divide-y divide-rule rounded-xl border border-rule" aria-label="Resultados">
                    {results.map((o) => (
                      <li key={o.stepId}>
                        <button type="button" onClick={() => choose(o)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-[15px] hover:bg-white/[0.04]">
                          <span>{o.label}</span>
                          <span className="shrink-0 text-xs text-muted">{UNIT_LABEL[o.unit].one}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : query.trim() ? (
                  <p className="text-sm text-muted">
                    {entry === 'dente' ? 'Nada encontrado entre as etapas por dente. Procedimento por arcada ou caso? Use “Por procedimento”.' : 'Nada encontrado. Use “Outro procedimento” e descreva.'}
                  </p>
                ) : null}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted hover:text-ink">Ver lista completa</summary>
                  <div className="mt-2 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {[...new Set(pool.map((o) => o.categoryName))].map((cat) => (
                      <div key={cat}>
                        <p className="eyebrow text-[10px]">{cat}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {pool
                            .filter((o) => o.categoryName === cat)
                            .map((o) => (
                              <button key={o.stepId} type="button" className="rounded-full border border-rule px-3 py-1.5 text-left text-sm hover:border-ink" onClick={() => choose(o)}>
                                {o.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            {lines.length ? (
              <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            ) : null}
          </div>
        ) : entry === 'dente' ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => (setPickStage('etapa'), setAdding(true))}
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              + Outra etapa nos mesmos dentes
            </button>
            <button
              type="button"
              onClick={() => (setPick([]), setPickStage('dentes'), setAdding(true))}
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              + Outros dentes
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="text-sm font-semibold underline-offset-4 hover:underline">
            + Outro procedimento nesta consulta
          </button>
        )}
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

/** Uma linha do registro (os dois caminhos chegam aqui): etapa, posições FDI ou arcada, quantidade e observação. */
function LineCard({
  l,
  index,
  archSupported,
  update,
  remove,
}: {
  l: Line
  index: number
  archSupported: boolean
  update: (key: number, change: Partial<Line>) => void
  remove: () => void
}) {
  const o = l.option
  const qty = lineQuantity(o, l, archSupported)
  const unit = qty === 1 ? UNIT_LABEL[o.unit].one : UNIT_LABEL[o.unit].many
  const lockedByTeeth = o.location === 'dentes' && l.teeth.length > 0
  const lockedByArch = o.location === 'arcada' && archSupported
  return (
    <div data-linha={index} className="space-y-3 rounded-2xl border border-rule p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[17px] leading-snug font-semibold" data-escolhido>
          {o.label}
        </p>
        <button type="button" className="shrink-0 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={remove}>
          Remover
        </button>
      </div>

      {o.location === 'dentes' ? (
        <div className="space-y-2">
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="num" data-posicoes>
              {l.teeth.length ? (
                <>
                  Posições: <span className="font-semibold">{sortTeeth(l.teeth).join(' ')}</span>
                </>
              ) : (
                <span className="text-muted">Sem posições marcadas (opcional)</span>
              )}
            </span>
            <button
              type="button"
              aria-expanded={l.showTeeth}
              className="text-sm font-semibold underline-offset-4 hover:underline"
              onClick={() => update(l.key, { showTeeth: !l.showTeeth })}
            >
              {l.showTeeth ? 'Fechar odontograma' : l.teeth.length ? 'Alterar posições' : 'Marcar no odontograma'}
            </button>
          </p>
          {l.showTeeth ? <Odontogram value={l.teeth} onChange={(teeth) => update(l.key, { teeth })} hint={teethHint(o)} /> : null}
        </div>
      ) : null}

      {lockedByArch ? (
        <div className="space-y-1.5">
          <p className="text-sm text-muted">Arcada</p>
          <ArchPicker name={`arcada-${l.key}`} value={l.arch} onChange={(arch) => update(l.key, { arch })} />
        </div>
      ) : null}

      {o.unit !== 'caso' ? (
        lockedByTeeth || lockedByArch ? (
          <p className="text-sm">
            <span className="text-muted">Quantidade: </span>
            <span className="num font-semibold" data-quantidade>
              {lockedByArch && !l.arch ? '—' : qty}
            </span>{' '}
            {lockedByArch && !l.arch ? <span className="text-muted">(escolha a arcada)</span> : <span>{unit}</span>}
            <span className="text-xs text-muted">{lockedByTeeth ? ' · pelas posições marcadas' : ''}</span>
          </p>
        ) : (
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
            <span className="text-sm">{l.quantity === 1 ? UNIT_LABEL[o.unit].one : UNIT_LABEL[o.unit].many}</span>
          </div>
        )
      ) : null}

      {o.requiresDescription ? (
        <input
          value={l.description}
          onChange={(e) => update(l.key, { description: e.target.value })}
          maxLength={120}
          placeholder="Descreva o procedimento (sem dados do paciente)"
          className={field}
          aria-label="Descrição do procedimento"
        />
      ) : null}

      {l.showNote ? (
        <label className="block text-sm font-semibold">
          Observação deste registro (opcional)
          <input
            value={l.note}
            onChange={(e) => update(l.key, { note: e.target.value })}
            maxLength={200}
            placeholder="Ex.: refeito, troca de cor"
            className={field}
            aria-describedby={`obs-${l.key}`}
          />
          <span id={`obs-${l.key}`} className="mt-1 block text-xs font-normal text-muted">
            Nota rápida para você. Não é prontuário: a documentação clínica fica no Smile Cloud. Não escreva nome, CPF ou telefone.
          </span>
        </label>
      ) : (
        <button type="button" className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => update(l.key, { showNote: true })}>
          + Observação (opcional)
        </button>
      )}
    </div>
  )
}
