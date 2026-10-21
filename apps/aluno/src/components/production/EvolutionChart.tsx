'use client'

import { cn } from '@portal/ui/cn'
import { useState } from 'react'
import type { MonthPoint } from '@/lib/production/model'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const label = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`

/**
 * Minha evolução: barras por mês, do início da turma até hoje (uma série por vez, um eixo só). Só a produção do
 * próprio aluno — nenhuma comparação. Tocar/passar numa barra mostra o valor; "Ver em tabela" para acessibilidade.
 */
export function EvolutionChart({ points, filtered }: { points: MonthPoint[]; filtered: boolean }) {
  const [mode, setMode] = useState<'experiences' | 'completions'>('experiences')
  const [active, setActive] = useState<string | null>(null)
  const value = (p: MonthPoint) => (mode === 'experiences' ? p.experiences : p.completions)
  const max = Math.max(1, ...points.map(value))
  const noun = (n: number) => (mode === 'experiences' ? (n === 1 ? 'experiência' : 'experiências') : n === 1 ? 'tratamento concluído' : 'tratamentos concluídos')
  const shown = points.find((p) => p.month === active)
  const every = points.length > 18 ? 6 : points.length > 9 ? 3 : 1

  return (
    <div data-evolucao={mode}>
      <div role="radiogroup" aria-label="Mostrar" className="grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-rule-strong p-1">
        {(
          [
            ['experiences', 'Experiências'],
            ['completions', 'Tratamentos concluídos'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={mode === k}
            onClick={() => setMode(k)}
            className={cn('min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors', mode === k ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="mt-5 min-h-6 text-sm" aria-live="polite" data-evolucao-valor>
        {shown ? (
          <>
            <span className="num font-semibold">{label(shown.month)}</span> · <span className="num">{value(shown)}</span> {noun(value(shown))}
          </>
        ) : (
          <span className="text-muted">Toque numa barra para ver o mês.</span>
        )}
      </p>

      <div className="relative mt-2 h-40 sm:h-48" onMouseLeave={() => setActive(null)}>
        {/* linha de base e referência do maior valor (recessivas) */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-rule-strong" />
        <span aria-hidden="true" className="num absolute -top-3.5 left-0 text-[10px] text-muted">
          {max}
        </span>
        <span aria-hidden="true" className="absolute inset-x-0 top-2 h-px border-t border-dashed border-rule" />
        <div className="absolute inset-0 top-2 flex items-end gap-[2px]">
          {points.map((p) => {
            const v = value(p)
            const dim = filtered && !p.inFilter
            return (
              <button
                key={p.month}
                type="button"
                aria-label={`${label(p.month)}: ${v} ${noun(v)}`}
                onClick={() => setActive(p.month)}
                onMouseEnter={() => setActive(p.month)}
                onFocus={() => setActive(p.month)}
                className="group flex h-full min-w-0 flex-1 items-end"
                data-mes={p.month}
              >
                <span
                  className={cn(
                    'block w-full rounded-t-[4px] transition-opacity',
                    v ? 'bg-[var(--brand)]' : 'bg-transparent',
                    dim ? 'opacity-30' : 'opacity-90',
                    active === p.month && 'opacity-100 ring-1 ring-ink',
                  )}
                  style={{ height: v ? `${Math.max(3, (v / max) * 100)}%` : 0 }}
                />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[2px]" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.month} className="num min-w-0 flex-1 overflow-visible text-[10px] whitespace-nowrap text-muted">
            {i % every === 0 ? label(p.month) : ''}
          </span>
        ))}
      </div>
      {filtered ? <p className="mt-2 text-xs text-muted">Em destaque: os meses do período escolhido.</p> : null}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Ver em tabela</summary>
        <table className="mt-2 w-full max-w-sm text-left text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 font-normal">Mês</th>
              <th className="py-1 text-right font-normal">Experiências</th>
              <th className="py-1 text-right font-normal">Concluídos</th>
            </tr>
          </thead>
          <tbody className="num">
            {points.map((p) => (
              <tr key={p.month} className="border-t border-rule">
                <td className="py-1">{label(p.month)}</td>
                <td className="py-1 text-right">{p.experiences}</td>
                <td className="py-1 text-right">{p.completions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
