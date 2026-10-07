'use client'

import { useOptimistic, useTransition } from 'react'
import { toggleMaterial } from '@/lib/academic/actions'
import type { MaterialVM } from '@/lib/academic/load'

/** Lista de materiais: o aluno marca o que já separou (fica salvo só para ele). */
export function MaterialChecklist({ groups, disabled = false }: { groups: Array<{ title: string; items: MaterialVM[] }>; disabled?: boolean }) {
  const all = groups.flatMap((g) => g.items)
  const [checked, setChecked] = useOptimistic(new Set(all.filter((i) => i.checked).map((i) => i.id)), (prev: Set<string>, change: { id: string; on: boolean }) => {
    const next = new Set(prev)
    if (change.on) next.add(change.id)
    else next.delete(change.id)
    return next
  })
  const [, startTransition] = useTransition()
  return (
    <>
      {groups.map((g) => (
        <fieldset key={g.title} className="min-w-0">
          <legend className="eyebrow">{g.title}</legend>
          <ul className="mt-2 divide-y divide-white/[0.07]">
            {g.items.map((item) => (
              <li key={item.id}>
                <label htmlFor={`mat-${item.id}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-3 text-[15px] has-[:checked]:text-muted has-[:checked]:line-through">
                  <input
                    id={`mat-${item.id}`}
                    type="checkbox"
                    disabled={disabled}
                    checked={checked.has(item.id)}
                    onChange={(e) => {
                      const on = e.currentTarget.checked
                      startTransition(async () => {
                        setChecked({ id: item.id, on })
                        await toggleMaterial(item.id, on)
                      })
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span className="leading-snug">
                    {item.item}
                    {item.note ? <span className="block text-xs text-muted no-underline">{item.note}</span> : null}
                    {!item.required ? <span className="block text-xs text-muted">Opcional</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
    </>
  )
}
