'use client'

import { cn } from '@portal/ui/cn'
import { useState } from 'react'
import { OrientationLegend, QuadrantGrid } from '@/components/cases/ToothQuadrants'
import type { ToothCell } from '@/lib/production/model'

/** Intensidade = só quantidade (1 hue, do mais claro ao mais forte). */
const LEVEL_BG = ['', 'bg-[var(--brand)]/15', 'bg-[var(--brand)]/35', 'bg-[var(--brand)]/60', 'bg-[var(--brand)]/90'] as const

export type MapCell = ToothCell & { /** Só procedimentos em que o FDI é posição (PPF, implante…). */ positionsOnly: boolean }

/**
 * Meu mapa clínico: as mesmas posições FDI do registro, com intensidade proporcional à quantidade de experiências do
 * próprio aluno. Não é prontuário: a cor não representa condição, qualidade, complexidade nem diagnóstico.
 */
export function ProductionMap({ cells }: { cells: MapCell[] }) {
  const byTooth = new Map(cells.map((c) => [c.tooth, c]))
  const [selected, setSelected] = useState<number | null>(null)
  const sel = selected !== null ? byTooth.get(selected) : undefined

  const cell = (t: number) => {
    const c = byTooth.get(t)
    const lvl = c?.level ?? 0
    return (
      <button
        type="button"
        disabled={!c}
        onClick={() => setSelected(selected === t ? null : t)}
        aria-pressed={selected === t}
        aria-label={c ? `${c.positionsOnly ? 'Posição' : 'Dente'} ${t}: ${c.experiences} ${c.experiences === 1 ? 'experiência' : 'experiências'}` : `Dente ${t}: nenhuma experiência`}
        data-dente-producao={t}
        data-nivel={lvl}
        className={cn(
          'num relative flex h-10 min-w-0 items-center justify-center rounded-md border text-xs transition-colors sm:h-9',
          c ? 'border-[var(--brand)]/60 font-semibold text-ink' : 'border-rule text-faint',
          LEVEL_BG[lvl],
          selected === t && 'ring-2 ring-ink',
        )}
      >
        {t}
      </button>
    )
  }

  return (
    <div data-mapa-producao>
      <OrientationLegend top />
      <QuadrantGrid cell={cell} compact />
      <OrientationLegend />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted" data-legenda>
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          menos
          {[1, 2, 3, 4].map((l) => (
            <span key={l} className={cn('inline-block size-3 rounded-sm border border-[var(--brand)]/60', LEVEL_BG[l])} />
          ))}
          mais
        </span>
        <span>
          A intensidade indica só a quantidade de experiências registradas naquela posição. Não representa condição do dente,
          qualidade, complexidade ou diagnóstico.
        </span>
      </div>

      <div className="mt-4 min-h-12" aria-live="polite">
        {sel ? (
          <div className="glass rounded-2xl p-4" data-dente-detalhe={sel.tooth}>
            <p className="text-base font-semibold">
              {sel.positionsOnly ? 'Posição FDI' : 'Dente'} <span className="num">{sel.tooth}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              <span className="num text-ink">{sel.experiences}</span> {sel.experiences === 1 ? 'experiência' : 'experiências'} · em{' '}
              <span className="num text-ink">{sel.cases}</span> {sel.cases === 1 ? 'caso' : 'casos'} ·{' '}
              <span className="num text-ink">{sel.visits}</span> {sel.visits === 1 ? 'consulta' : 'consultas'}
            </p>
            <ul className="mt-3 space-y-2">
              {sel.procedures.map((p) => (
                <li key={p.procedureId}>
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{p.name}</span>
                    <span className="num shrink-0 text-muted">{p.experiences}</span>
                  </p>
                  {p.steps.length > 1 || (p.steps[0] && p.steps[0].name !== p.name) ? (
                    <ul className="mt-1 space-y-0.5 border-l border-rule-strong pl-3 text-xs text-ink-2">
                      {p.steps.map((s) => (
                        <li key={s.name} className="flex justify-between gap-3">
                          <span>{s.name}</span>
                          <span className="num text-muted">{s.experiences}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">Toque num dente destacado para ver o que você fez ali.</p>
        )}
      </div>
    </div>
  )
}
