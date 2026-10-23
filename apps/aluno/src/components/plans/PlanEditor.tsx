'use client'

import { cn } from '@portal/ui/cn'
import { useActionState, useMemo, useState } from 'react'
import { ArchPicker, Odontogram } from '@/components/cases/Odontogram'
import { ProcedureChooser } from '@/components/cases/ProcedureChooser'
import type { ActionState } from '@/lib/cases/actions'
import { hasOwnStepName, lineError, lineQuantity, quickAccess, sortTeeth, type StepOption, teethCount, usesPositions } from '@/lib/cases/model'
import { savePlanVisit } from '@/lib/plans/actions'
import { type DentalArch, UNIT_LABEL } from '@/lib/procedures/model'

type Item = { key: number; id?: string; option: StepOption; teeth: number[]; arch: DentalArch | null; quantity: number; description: string; showTeeth: boolean }
let seq = 0
const field = 'field mt-1.5 block min-h-12 w-full px-3 text-base'

/**
 * Editor de uma consulta planejada (Etapa 8). Reutiliza a escolha do registro (Por dente / Por procedimento, catálogo
 * procedimento → etapa, odontograma, arcada) e as mesmas regras de quantidade. Não é registro: nada aqui vai para a
 * Jornada ou para a Minha Produção. Sem data prevista, horário, diagnóstico ou nota por item.
 */
export function PlanEditor({
  caseId,
  visitId,
  title,
  options,
  history,
  initial,
  archSupported,
}: {
  caseId: string
  visitId?: string
  title: string
  options: StepOption[]
  history: Array<{ stepId: string; createdAt: string }>
  initial?: { note: string | null; items: Array<{ id: string; stepId: string; teeth: number[]; arch: DentalArch | null; quantity: number; description: string | null }> }
  archSupported: boolean
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePlanVisit, undefined)
  const byStep = useMemo(() => new Map(options.map((o) => [o.stepId, o])), [options])
  const [items, setItems] = useState<Item[]>(() =>
    (initial?.items ?? []).flatMap((i) => {
      const o = byStep.get(i.stepId)
      return o ? [{ key: ++seq, id: i.id, option: o, teeth: i.teeth, arch: i.arch, quantity: i.quantity, description: i.description ?? '', showTeeth: false }] : []
    }),
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [entry, setEntry] = useState<'dente' | 'procedimento'>('dente')
  const [adding, setAdding] = useState(!initial?.items.length)
  const [pick, setPick] = useState<number[]>([])
  const [stage, setStage] = useState<'dentes' | 'etapa'>('dentes')
  const [query, setQuery] = useState('')
  const [tried, setTried] = useState(false)

  const active = options.filter((o) => o.active)
  const pool = entry === 'dente' ? active.filter((o) => o.location === 'dentes') : active
  const quick = useMemo(() => quickAccess(pool, history), [pool, history])

  const errors: string[] = []
  if (!items.length) errors.push('Inclua pelo menos um procedimento na consulta planejada.')
  for (const it of items) {
    const e = lineError(it.option, it, archSupported)
    if (e) errors.push(e)
  }
  if (note.length > 200) errors.push('Observação do planejamento: no máximo 200 caracteres.')

  const update = (key: number, change: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...change } : x)))
  const choose = (o: StepOption) => {
    setItems((xs) => [...xs, { key: ++seq, option: o, teeth: entry === 'dente' ? pick : [], arch: null, quantity: entry === 'dente' ? pick.length || 1 : 1, description: '', showTeeth: entry !== 'dente' && o.location === 'dentes' }])
    setQuery('')
    setAdding(false)
  }
  const payload = JSON.stringify({
    caseId,
    visitId,
    note,
    items: items.map((it) => ({
      id: it.id,
      stepId: it.option.stepId,
      teeth: it.option.location === 'dentes' ? sortTeeth(it.teeth) : [],
      arch: it.option.location === 'arcada' ? it.arch : null,
      quantity: lineQuantity(it.option, it, archSupported),
      description: it.description,
    })),
  })

  return (
    <form
      action={action}
      onSubmit={(e) => {
        setTried(true)
        if (errors.length) e.preventDefault()
      }}
      className="space-y-8"
      data-editor-plano
    >
      <input type="hidden" name="payload" value={payload} />
      <p className="eyebrow text-[10px] text-muted">Planejado · {title}</p>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">O que você pretende fazer</legend>
        {items.map((it, i) => (
          <PlanItemCard key={it.key} it={it} index={i} archSupported={archSupported} update={update} remove={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} />
        ))}

        {adding ? (
          <div className="space-y-4 rounded-2xl border border-dashed border-rule-strong p-2.5 sm:p-4" data-composer>
            <div role="radiogroup" aria-label="Começar por" className="grid grid-cols-2 gap-1 rounded-2xl border border-rule-strong p-1">
              {(
                [
                  ['dente', 'Por dente'],
                  ['procedimento', 'Por procedimento'],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={entry === v}
                  onClick={() => (setEntry(v), setStage('dentes'), setQuery(''))}
                  className={cn('min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors', entry === v ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
                >
                  {l}
                </button>
              ))}
            </div>
            {entry === 'dente' && stage === 'dentes' ? (
              <>
                <Odontogram value={pick} onChange={setPick} label="Selecionar dentes" hint="Toque nos dentes ou deslize o dedo para marcar vários." />
                <div className="flex flex-col gap-3 rounded-2xl border border-rule-strong bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <span className="num text-sm" data-selecao>
                    {pick.length ? (
                      <>
                        <span className="font-semibold">{teethCount(pick.length, false, true)}</span>
                        <span className="text-muted"> · {sortTeeth(pick).join(' ')}</span>
                      </>
                    ) : (
                      <span className="text-muted">Nenhum dente selecionado</span>
                    )}
                  </span>
                  <button type="button" disabled={!pick.length} onClick={() => setStage('etapa')} className="min-h-12 shrink-0 rounded-full bg-ink px-5 text-[15px] font-semibold text-on-ink disabled:opacity-40">
                    Escolher procedimento →
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {entry === 'dente' ? (
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="num">
                      <span className="text-muted">{teethCount(pick.length, false, true)}: </span>
                      <span className="font-semibold">{sortTeeth(pick).join(' ')}</span>
                    </span>
                    <button type="button" className="min-h-9 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => setStage('dentes')}>
                      Alterar dentes
                    </button>
                  </p>
                ) : null}
                <ProcedureChooser pool={pool} quick={quick} query={query} setQuery={setQuery} choose={choose} byTooth={entry === 'dente'} />
              </div>
            )}
            {items.length ? (
              <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            ) : null}
          </div>
        ) : (
          <button type="button" onClick={() => (setPick([]), setStage('dentes'), setAdding(true))} className="min-h-11 text-sm font-semibold underline-offset-4 hover:underline" data-mais-item>
            + Outro procedimento nesta consulta planejada
          </button>
        )}
      </fieldset>

      <label className="block text-sm font-semibold">
        Observação do planejamento (opcional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={2}
          placeholder="Ex.: conferir a cor antes da cimentação"
          className="field mt-1.5 block w-full px-3 py-2.5 text-base"
          aria-describedby="obs-plano"
          name="observacao"
        />
        <span id="obs-plano" className="mt-1 flex justify-between gap-3 text-xs font-normal text-muted">
          <span>Planejamento de estudo, não é prontuário. Não escreva nome, CPF ou telefone do paciente.</span>
          <span className="num shrink-0">{note.length}/200</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-12 rounded-full border border-ink bg-white/[0.06] px-6 text-base font-semibold disabled:opacity-60" data-salvar-plano>
          {pending ? 'Salvando…' : 'Salvar consulta planejada'}
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
    </form>
  )
}

/** Um item planejado: etapa do catálogo, dentes ou arcada quando a etapa pede, quantidade. Sem nota por item. */
function PlanItemCard({ it, index, archSupported, update, remove }: { it: Item; index: number; archSupported: boolean; update: (k: number, c: Partial<Item>) => void; remove: () => void }) {
  const o = it.option
  const qty = lineQuantity(o, it, archSupported)
  const positions = usesPositions(o)
  const lockedByTeeth = o.location === 'dentes' && it.teeth.length > 0
  const lockedByArch = o.location === 'arcada' && archSupported
  return (
    <div data-item-editor={index} className="space-y-3 rounded-2xl border border-dashed border-rule-strong p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="leading-snug" aria-label={o.label}>
          <span className="block text-[17px] font-semibold">{o.procedureName}</span>
          {hasOwnStepName(o) ? <span className="block text-[15px] text-ink-2">{o.stepName}</span> : null}
          {!o.active ? <span className="block text-xs font-semibold">Etapa desativada no catálogo (mantida no plano).</span> : null}
        </p>
        <button type="button" className="min-h-9 shrink-0 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" onClick={remove}>
          Remover
        </button>
      </div>
      {o.location === 'dentes' ? (
        <div className="space-y-2">
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="num">
              {it.teeth.length ? (
                <>
                  <span className="text-muted">{positions ? 'Posições FDI' : 'Dentes'}: </span>
                  <span className="font-semibold">{sortTeeth(it.teeth).join(' ')}</span>
                </>
              ) : (
                <span className="text-muted">{positions ? 'Nenhuma posição marcada (opcional)' : 'Nenhum dente selecionado (opcional)'}</span>
              )}
            </span>
            <button type="button" aria-expanded={it.showTeeth} className="min-h-9 text-sm font-semibold underline-offset-4 hover:underline" onClick={() => update(it.key, { showTeeth: !it.showTeeth })}>
              {it.showTeeth ? 'Fechar odontograma' : it.teeth.length ? (positions ? 'Alterar posições' : 'Alterar dentes') : positions ? 'Marcar posições' : 'Selecionar dentes'}
            </button>
          </p>
          {it.showTeeth ? <Odontogram value={it.teeth} onChange={(teeth) => update(it.key, { teeth })} label={positions ? 'Posições FDI' : 'Dentes'} /> : null}
        </div>
      ) : null}
      {lockedByArch ? (
        <div className="space-y-1.5">
          <p className="text-sm text-muted">Arcada</p>
          <ArchPicker name={`arcada-plano-${it.key}`} value={it.arch} onChange={(arch) => update(it.key, { arch })} />
        </div>
      ) : null}
      {o.unit !== 'caso' ? (
        lockedByTeeth || lockedByArch ? (
          <p className="text-sm">
            <span className="text-muted">Quantidade: </span>
            <span className="num font-semibold" data-quantidade>
              {lockedByArch && !it.arch ? '—' : qty}
            </span>{' '}
            {lockedByArch && !it.arch ? <span className="text-muted">(escolha a arcada)</span> : <span>{qty === 1 ? UNIT_LABEL[o.unit].one : UNIT_LABEL[o.unit].many}</span>}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">Quantidade</span>
            <div className="flex items-center rounded-full border border-rule-strong">
              <button type="button" aria-label="Menos" className="size-11 text-xl" onClick={() => update(it.key, { quantity: Math.max(1, it.quantity - 1) })}>
                −
              </button>
              <span className="num w-8 text-center text-lg" data-quantidade>
                {it.quantity}
              </span>
              <button type="button" aria-label="Mais" className="size-11 text-xl" onClick={() => update(it.key, { quantity: Math.min(99, it.quantity + 1) })}>
                +
              </button>
            </div>
            <span className="text-sm">{it.quantity === 1 ? UNIT_LABEL[o.unit].one : UNIT_LABEL[o.unit].many}</span>
          </div>
        )
      ) : null}
      {o.requiresDescription ? (
        <input value={it.description} onChange={(e) => update(it.key, { description: e.target.value })} maxLength={120} placeholder="Descreva o procedimento (sem dados do paciente)" className={field} aria-label="Descrição do procedimento" />
      ) : null}
    </div>
  )
}
