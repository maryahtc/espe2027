import { cn } from '@portal/ui/cn'
import type { ReactNode } from 'react'
import { QUADRANTS } from '@/lib/cases/model'

/**
 * Linha (no celular) de cada dente dentro do quadrante: os 4 mais próximos da linha média ficam junto do plano
 * oclusal (11–14 embaixo na superior; 41–44 em cima na inferior). A partir de 640 px, cada quadrante é uma linha de 8.
 */
function quadrantRow(t: number) {
  const anterior = t % 10 <= 4
  const upper = t < 30
  return upper === anterior ? 'row-start-2 sm:row-start-1' : 'row-start-1'
}

/**
 * Quatro quadrantes na orientação clínica (direita do paciente à esquerda da tela), separados pela linha média
 * (11 | 21 e 41 | 31) e pelo plano oclusal. Usado no registro (seletor) e na página do caso (mapa).
 */
export function QuadrantGrid({ cell, compact = false }: { cell: (t: number) => ReactNode; compact?: boolean }) {
  const quad = (teeth: readonly number[], side: 'r' | 'l') => (
    <div className={cn('grid grid-cols-4 sm:grid-cols-8', compact ? 'gap-1' : 'gap-[3px] sm:gap-1', side === 'r' ? 'pr-1 sm:pr-2' : 'pl-1 sm:pl-2')}>
      {teeth.map((t) => (
        <div key={t} className={cn('grid', quadrantRow(t))}>
          {cell(t)}
        </div>
      ))}
    </div>
  )
  return (
    <div className="relative grid grid-cols-2" data-quadrantes>
      {/* linha média e plano oclusal: só guias visuais */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-rule-strong" />
      <div role="group" aria-label="Superior direito (quadrante 1)" className={compact ? 'pb-1.5' : 'pb-2'}>
        {quad(QUADRANTS.upperRight, 'r')}
      </div>
      <div role="group" aria-label="Superior esquerdo (quadrante 2)" className={compact ? 'pb-1.5' : 'pb-2'}>
        {quad(QUADRANTS.upperLeft, 'l')}
      </div>
      <span aria-hidden="true" className="col-span-2 h-px bg-rule-strong" />
      <div role="group" aria-label="Inferior direito (quadrante 4)" className={compact ? 'pt-1.5' : 'pt-2'}>
        {quad(QUADRANTS.lowerRight, 'r')}
      </div>
      <div role="group" aria-label="Inferior esquerdo (quadrante 3)" className={compact ? 'pt-1.5' : 'pt-2'}>
        {quad(QUADRANTS.lowerLeft, 'l')}
      </div>
    </div>
  )
}

/** Rótulos discretos de orientação (texto pequeno). */
export function OrientationLegend({ top }: { top?: boolean }) {
  return (
    <p className={cn('flex justify-between text-[10px] tracking-wider text-muted uppercase', top ? 'mb-1' : 'mt-1')} aria-hidden="true">
      <span>{top ? 'Superior' : 'Inferior'}</span>
      {top ? <span className="normal-case tracking-normal">direita do paciente ← → esquerda</span> : null}
    </p>
  )
}
