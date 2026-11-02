'use client'

import { useEffect, useState } from 'react'
import { checklistKey, parseChecked, serializeChecked, toggleChecked } from '@/lib/workflows/model'

/**
 * Checklist de materiais: ajuda momentânea para separar o material. Vive só no `sessionStorage` desta aba —
 * nenhuma escrita no servidor, sem progresso, porcentagem ou conclusão. Fechada a sessão, as marcações somem.
 */
export function MaterialChecklist({ stageId, items }: { stageId: string; items: Array<{ id: string; text: string }> }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const ids = items.map((i) => i.id)
  const idsKey = ids.join(',')

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = window.sessionStorage.getItem(checklistKey(stageId))
    } catch {
      saved = null
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marcações lidas uma vez da aba (sessionStorage)
    setChecked(parseChecked(saved, idsKey.split(',')))
  }, [stageId, idsKey])

  const save = (next: Set<string>) => {
    setChecked(next)
    try {
      if (next.size) window.sessionStorage.setItem(checklistKey(stageId), serializeChecked(next))
      else window.sessionStorage.removeItem(checklistKey(stageId))
    } catch {
      // Sem armazenamento (aba privada, bloqueio): a lista funciona, só não lembra as marcações.
    }
  }

  return (
    <div data-checklist>
      <ul className="divide-y divide-rule">
        {items.map((item) => {
          const on = checked.has(item.id)
          return (
            <li key={item.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3.5 py-2 text-[16px] leading-snug" data-material={item.text}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => save(toggleChecked(checked, item.id))}
                  className="size-5 shrink-0 cursor-pointer accent-[var(--ink)]"
                />
                <span className={on ? 'text-ink-2' : undefined}>{item.text}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-faint">Marcações só neste aparelho, enquanto a aba estiver aberta.</p>
        {checked.size ? (
          <button type="button" onClick={() => save(new Set())} className="min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline" data-desmarcar>
            Desmarcar tudo
          </button>
        ) : null}
      </div>
    </div>
  )
}
