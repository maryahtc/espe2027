'use client'

import { cn } from '@portal/ui/cn'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { ArchPicker, Odontogram } from '@/components/cases/Odontogram'
import { type ActionState, registerProcedures } from '@/lib/cases/actions'
import {
  groupByProcedure,
  hasOwnStepName,
  lineError,
  lineQuantity,
  type ModuleSpan,
  moduleForDate,
  patientLabelError,
  type ProcedureGroup,
  quickAccess,
  type QuickItem,
  searchOptions,
  sortTeeth,
  type StepOption,
  suggestTopics,
  teethCount,
  usesPositions,
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

/** Ajuda curta. Em PPF/pôntico/implante o número FDI é a posição (pode não haver dente); nunca uma condição. */
function teethHint(o: StepOption): string {
  return usesPositions(o)
    ? 'Marque a posição FDI de cada elemento (inclusive pôntico ou implante). O número indica só a posição.'
    : 'Selecione os dentes (opcional).'
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
  history,
  openCases,
  modules,
  today,
  supervisors,
  topics,
  initialCaseId,
  archSupported = true,
}: {
  options: StepOption[]
  /** Histórico real do próprio aluno (vazio na simulação) — base do acesso rápido. */
  history: Array<{ stepId: string; createdAt: string }>
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
  const quick = useMemo(() => quickAccess(pool, history), [pool, history])

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
      teeth: l.option.location === 'dentes' ? sortTeeth(l.teeth) : [],
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
          <LineCard key={l.key} l={l} index={i} archSupported={archSupported} update={update} remove={() => {
              const rest = lines.filter((x) => x.key !== l.key)
              setLines(rest)
              // Sem nenhuma linha: volta direto à escolha (não deixa o aluno sem caminho).
              if (!rest.length) setAdding(true)
            }} />
        ))}

        {adding ? (
          <div className="space-y-4 rounded-2xl border border-rule p-2.5 sm:p-4" data-composer>
            {entry === 'dente' && pickStage === 'dentes' ? (
              <>
                <Odontogram value={pick} onChange={setPick} label="Selecionar dentes" hint="Toque nos dentes ou deslize o dedo para marcar vários." />
                <div className="flex flex-col gap-3 rounded-2xl border border-rule-strong bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <span className="num min-w-0 text-sm" data-selecao>
                    {pick.length ? (
                      <>
                        <span className="font-semibold">{teethCount(pick.length, false, true)}</span>
                        <span className="text-muted"> · {sortTeeth(pick).join(' ')}</span>
                      </>
                    ) : (
                      <span className="text-muted">Nenhum dente selecionado</span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={!pick.length}
                    onClick={() => setPickStage('etapa')}
                    className="min-h-12 shrink-0 rounded-full bg-ink px-5 text-[15px] font-semibold text-on-ink disabled:opacity-40"
                  >
                    Escolher procedimento →
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {entry === 'dente' ? (
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm" data-dentes-escolhidos>
                    <span className="num">
                      <span className="text-muted">{teethCount(pick.length, false, true)}: </span>
                      <span className="font-semibold">{sortTeeth(pick).join(' ')}</span>
                    </span>
                    <button type="button" className="min-h-9 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => setPickStage('dentes')}>
                      Alterar dentes
                    </button>
                  </p>
                ) : null}
                <ProcedureChooser pool={pool} quick={quick} query={query} setQuery={setQuery} choose={choose} byTooth={entry === 'dente'} />
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
  const positions = usesPositions(o)
  return (
    <div data-linha={index} className="space-y-3 rounded-2xl border border-rule p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="leading-snug" data-escolhido aria-label={o.label}>
          <span className="block text-[17px] font-semibold">{o.procedureName}</span>
          {hasOwnStepName(o) ? <span className="block text-[15px] text-ink-2">{o.stepName}</span> : null}
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
                  <span className="text-muted">{positions ? 'Posições FDI' : 'Dentes'}: </span>
                  <span className="font-semibold">{sortTeeth(l.teeth).join(' ')}</span>
                </>
              ) : (
                <span className="text-muted">{positions ? 'Nenhuma posição marcada (opcional)' : 'Nenhum dente selecionado (opcional)'}</span>
              )}
            </span>
            <button
              type="button"
              aria-expanded={l.showTeeth}
              className="text-sm font-semibold underline-offset-4 hover:underline"
              onClick={() => update(l.key, { showTeeth: !l.showTeeth })}
            >
              {l.showTeeth ? 'Fechar odontograma' : l.teeth.length ? (positions ? 'Alterar posições' : 'Alterar dentes') : positions ? 'Marcar posições' : 'Selecionar dentes'}
            </button>
          </p>
          {l.showTeeth ? (
            <Odontogram value={l.teeth} onChange={(teeth) => update(l.key, { teeth })} label={positions ? 'Posições FDI' : 'Dentes'} hint={teethHint(o)} />
          ) : null}
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
            <span className="text-xs text-muted">{lockedByTeeth ? (positions ? ' · pelas posições marcadas' : ' · pelos dentes selecionados') : ''}</span>
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

/** Nome do procedimento em destaque e, abaixo, a etapa (quando a etapa tem nome próprio). */
function StepText({ o, compact = false }: { o: StepOption; compact?: boolean }) {
  return (
    <span className="min-w-0">
      <span className={cn('block font-semibold', compact ? 'text-sm' : 'text-[15px]')}>{o.procedureName}</span>
      {hasOwnStepName(o) ? <span className={cn('block text-ink-2', compact ? 'text-xs' : 'text-sm')}>{o.stepName}</span> : null}
    </span>
  )
}

/**
 * Um procedimento e suas etapas (só apresentação): primeiro o tratamento, abaixo a etapa realizada.
 * Com uma única etapa no caminho atual, um toque basta.
 */
function ProcedureRow({ g, choose, compact = false }: { g: ProcedureGroup; choose: (o: StepOption) => void; compact?: boolean }) {
  if (g.steps.length === 1) {
    const o = g.steps[0]!
    return (
      <button
        type="button"
        onClick={() => choose(o)}
        aria-label={o.label}
        data-etapa={o.label}
        className={cn('flex w-full items-center justify-between gap-3 px-3 text-left hover:bg-white/[0.04]', compact ? 'min-h-11 py-1.5' : 'min-h-12 py-2')}
      >
        <StepText o={o} compact={compact} />
        <span className="shrink-0 text-xs text-muted">{UNIT_LABEL[o.unit].one}</span>
      </button>
    )
  }
  return (
    <div className={cn('px-3', compact ? 'py-2' : 'py-2.5')} data-procedimento={g.procedureName}>
      <p className={cn('font-semibold', compact ? 'text-sm' : 'text-[15px]')}>{g.procedureName}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`Etapas de ${g.procedureName}`}>
        {g.steps.map((o) => (
          <button
            key={o.stepId}
            type="button"
            onClick={() => choose(o)}
            aria-label={o.label}
            data-etapa={o.label}
            className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-sm transition-colors hover:border-ink active:scale-[0.98]"
          >
            {o.stepName}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Escolha do procedimento/etapa: acesso rápido (recentes, frequentes ou padrão — no máximo 6), busca e lista
 * completa por categoria. `pool` já vem filtrado pelo caminho (no "Por dente", só etapas que identificam dentes).
 */
function ProcedureChooser({
  pool,
  quick,
  query,
  setQuery,
  choose,
  byTooth,
}: {
  pool: StepOption[]
  quick: QuickItem[]
  query: string
  setQuery: (q: string) => void
  choose: (o: StepOption) => void
  byTooth: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const results = groupByProcedure(searchOptions(pool, query))
  const openGroup = quick.find((i): i is Extract<QuickItem, { kind: 'procedimento' }> => i.kind === 'procedimento' && i.group.procedureId === open)?.group
  const personal = quick.some((i) => i.source !== 'padrao')
  return (
    <div className="space-y-3">
      {quick.length && !query.trim() ? (
        <div data-acesso-rapido>
          <p className="text-xs text-muted">{personal ? 'Acesso rápido · seus recentes e mais usados' : 'Acesso rápido'}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {quick.map((i) => {
              if (i.kind === 'etapa') {
                return (
                  <button
                    key={i.option.stepId}
                    type="button"
                    onClick={() => choose(i.option)}
                    aria-label={i.option.label}
                    data-etapa={i.option.label}
                    data-fonte={i.source}
                    className="flex min-h-14 items-center rounded-2xl border border-rule-strong px-3 py-2 text-left transition-colors hover:border-ink active:scale-[0.98]"
                  >
                    <StepText o={i.option} compact />
                  </button>
                )
              }
              const g = i.group
              const single = g.steps.length === 1 ? g.steps[0]! : null
              const isOpen = open === g.procedureId
              return (
                <button
                  key={g.procedureId}
                  type="button"
                  onClick={() => (single ? choose(single) : setOpen(isOpen ? null : g.procedureId))}
                  aria-label={single ? single.label : g.procedureName}
                  aria-expanded={single ? undefined : isOpen}
                  data-etapa={single ? single.label : undefined}
                  data-procedimento-rapido={single ? undefined : g.procedureName}
                  data-fonte={i.source}
                  className={cn(
                    'flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition-colors hover:border-ink active:scale-[0.98]',
                    isOpen ? 'border-ink bg-white/[0.06]' : 'border-rule-strong',
                  )}
                >
                  {single ? (
                    <StepText o={single} compact />
                  ) : (
                    <>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{g.procedureName}</span>
                        <span className="block text-xs text-muted">{g.steps.length} etapas</span>
                      </span>
                      <span aria-hidden="true" className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-90')}>
                        ›
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
          {openGroup ? (
            <div className="mt-2 rounded-2xl border border-rule bg-white/[0.03]" data-etapas-abertas>
              <ProcedureRow g={openGroup} choose={choose} />
            </div>
          ) : null}
        </div>
      ) : null}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={byTooth ? 'Buscar procedimento para estes dentes…' : 'Buscar: laminado, resina, extração…'}
        className={field}
        aria-label="Buscar procedimento"
        autoComplete="off"
      />
      {results.length ? (
        <ul className="divide-y divide-rule rounded-xl border border-rule" aria-label="Resultados">
          {results.map((g) => (
            <li key={g.procedureId}>
              <ProcedureRow g={g} choose={choose} />
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <p className="text-sm text-muted">
          {byTooth ? 'Nada encontrado entre os procedimentos por dente. Procedimento por arcada ou caso? Use “Por procedimento”.' : 'Nada encontrado. Use “Outro procedimento” e descreva.'}
        </p>
      ) : null}
      <details className="text-sm">
        <summary className="min-h-9 cursor-pointer py-1 text-muted hover:text-ink">Ver lista completa</summary>
        <div className="mt-2 max-h-96 space-y-4 overflow-y-auto pr-1" data-lista-completa>
          {[...new Set(pool.map((o) => o.categoryName))].map((cat) => (
            <div key={cat}>
              <p className="eyebrow text-[10px]">{cat}</p>
              <div className="mt-1 divide-y divide-rule rounded-xl border border-rule">
                {groupByProcedure(pool.filter((o) => o.categoryName === cat)).map((g) => (
                  <ProcedureRow key={g.procedureId} g={g} choose={choose} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
