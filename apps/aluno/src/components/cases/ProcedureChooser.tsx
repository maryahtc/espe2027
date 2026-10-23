'use client'

import { cn } from '@portal/ui/cn'
import { useState } from 'react'
import { groupByProcedure, hasOwnStepName, type ProcedureGroup, type QuickItem, searchOptions, type StepOption } from '@/lib/cases/model'
import { UNIT_LABEL } from '@/lib/procedures/model'

const field = 'field mt-1.5 block min-h-12 w-full px-3 text-base'

/**
 * Escolha do procedimento → etapa (Etapa 6), compartilhada entre o registro rápido e o Planejamento do caso.
 * Só apresentação: o catálogo e as regras não mudam.
 */
/** Nome do procedimento em destaque e, abaixo, a etapa (quando a etapa tem nome próprio). */
export function StepText({ o, compact = false }: { o: StepOption; compact?: boolean }) {
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
export function ProcedureRow({ g, choose, compact = false }: { g: ProcedureGroup; choose: (o: StepOption) => void; compact?: boolean }) {
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
export function ProcedureChooser({
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
