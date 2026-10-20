'use client'

import { cn } from '@portal/ui/cn'
import { useRef } from 'react'
import { FDI_LOWER, FDI_UPPER, TOOTH_SHORTCUTS, toggleGroup } from '@/lib/cases/model'

/**
 * Odontograma (FDI 11–48) — SÓ um seletor de posições. Nada de faces, condições, diagnóstico ou legenda clínica.
 * Celular: cada arcada em 2 linhas de 8 (≈ 42 px por posição); a partir de 640 px, 16 por linha.
 * Toque marca/desmarca; deslizar o dedo pela linha marca várias; atalhos para os grupos mais comuns.
 */
export function Odontogram({
  value,
  onChange,
  label = 'Posições FDI',
  hint,
  shortcuts = true,
}: {
  value: number[]
  onChange: (teeth: number[]) => void
  label?: string
  hint?: string
  shortcuts?: boolean
}) {
  const drag = useRef<{ start: number; on: boolean; moved: boolean; last: number } | null>(null)

  const set = (teeth: number[], tooth: number, on: boolean) => (on ? (teeth.includes(tooth) ? teeth : [...teeth, tooth]) : teeth.filter((t) => t !== tooth))
  const toothAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-dente]')
    return el ? Number(el.dataset.dente) : null
  }

  const arch = (name: string, teeth: number[]) => (
    <div role="group" aria-label={name}>
      <p className="mb-1 text-[10px] tracking-wider text-muted uppercase">{name}</p>
      <div className="grid grid-cols-8 gap-[3px] sm:grid-cols-16 sm:gap-1">
        {teeth.map((t, i) => {
          const on = value.includes(t)
          return (
            <button
              key={t}
              type="button"
              data-dente={t}
              aria-pressed={on}
              aria-label={`Posição ${t}${on ? ', marcada' : ''}`}
              onClick={(e) => {
                // Clique depois de arrastar não desfaz o que o arraste marcou.
                if (drag.current?.moved) {
                  e.preventDefault()
                  drag.current = null
                  return
                }
                drag.current = null
                onChange(on ? value.filter((x) => x !== t) : [...value, t])
              }}
              onPointerDown={() => {
                drag.current = { start: t, on: !on, moved: false, last: t }
              }}
              className={cn(
                'num relative h-11 rounded-md border text-sm font-semibold transition-colors select-none',
                i === 7 && 'sm:mr-1.5', // linha média (no celular, cada quadrante já é uma linha)
                on ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-rule-strong text-muted hover:border-ink hover:text-ink',
              )}
            >
              {t}
              {on ? <span aria-hidden="true" className="absolute top-0.5 right-1 text-[9px] leading-none">✓</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className="space-y-3 [touch-action:pan-y]"
      data-odontograma
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || (e.pointerType === 'mouse' && e.buttons !== 1)) return
        const t = toothAt(e.clientX, e.clientY)
        if (t === null || t === d.last) return
        // Primeiro movimento para outra posição: vira arraste (aplica também à posição inicial).
        let next = value
        if (!d.moved) next = set(next, d.start, d.on)
        d.moved = true
        d.last = t
        onChange(set(next, t, d.on))
      }}
      onPointerUp={() => {
        if (drag.current && !drag.current.moved) drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted">direita do paciente ← → esquerda</p>
      </div>
      {hint ? <p className="-mt-2 text-xs text-muted">{hint}</p> : null}
      {arch('Superior', FDI_UPPER)}
      {arch('Inferior', FDI_LOWER)}
      {shortcuts ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Atalhos">
          {TOOTH_SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onChange(toggleGroup(value, s.teeth))}
              className="min-h-9 rounded-full border border-rule px-3 text-xs font-semibold text-muted hover:border-ink hover:text-ink"
            >
              {s.label}
            </button>
          ))}
          {value.length ? (
            <button type="button" onClick={() => onChange([])} className="min-h-9 rounded-full px-3 text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
              Limpar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Superior · Inferior · Ambas (etapas por arcada). Obrigatório quando a etapa identifica arcada. */
export function ArchPicker({ value, onChange, name }: { value: 'superior' | 'inferior' | 'ambas' | null; onChange?: (a: 'superior' | 'inferior' | 'ambas') => void; name?: string }) {
  const opts = [
    ['superior', 'Superior'],
    ['inferior', 'Inferior'],
    ['ambas', 'Ambas'],
  ] as const
  return (
    <div role="radiogroup" aria-label="Arcada" className="grid grid-cols-3 gap-1 rounded-2xl border border-rule-strong p-1" data-arcada>
      {opts.map(([v, l]) => (
        <label key={v} className={cn('flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold', value === v ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}>
          <input
            type="radio"
            name={name ?? 'arcada-escolha'}
            value={v}
            checked={value === v}
            onChange={() => onChange?.(v)}
            className="sr-only"
          />
          {l}
        </label>
      ))}
    </div>
  )
}
