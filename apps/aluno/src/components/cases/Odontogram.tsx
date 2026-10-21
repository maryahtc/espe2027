'use client'

import { cn } from '@portal/ui/cn'
import { useRef } from 'react'
import { OrientationLegend, QuadrantGrid } from '@/components/cases/ToothQuadrants'
import { TOOTH_SHORTCUTS, toggleGroup } from '@/lib/cases/model'

/**
 * Odontograma (FDI 11–48) — SÓ um seletor de dentes/posições. Nada de faces, condições, diagnóstico ou legenda clínica.
 * Toque marca/desmarca; deslizar o dedo marca vários; atalhos para os grupos mais comuns.
 */
export function Odontogram({
  value,
  onChange,
  label = 'Dentes',
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

  const cell = (t: number) => {
    const on = value.includes(t)
    return (
      <button
        type="button"
        data-dente={t}
        aria-pressed={on}
        aria-label={`Dente ${t}${on ? ', selecionado' : ''}`}
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
          'num relative h-11 min-w-0 rounded-lg border text-sm font-semibold transition-colors select-none',
          on ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-[0_0_12px_-2px_var(--brand)]' : 'border-rule-strong bg-white/[0.02] text-muted hover:border-ink hover:text-ink',
        )}
      >
        {t}
      </button>
    )
  }

  return (
    <div
      className="space-y-3 [touch-action:pan-y]"
      data-odontograma
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || (e.pointerType === 'mouse' && e.buttons !== 1)) return
        const t = toothAt(e.clientX, e.clientY)
        if (t === null || t === d.last) return
        // Primeiro movimento para outro dente: vira arraste (aplica também ao dente inicial).
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
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <div>
        <OrientationLegend top />
        <QuadrantGrid cell={cell} />
        <OrientationLegend />
      </div>
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
