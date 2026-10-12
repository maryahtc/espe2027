'use client'

import { Button } from '@portal/ui/button'
import { useActionState } from 'react'
import { setContentDone } from '@/lib/library/actions'

/** "Marcar como concluído" / "✓ Concluído" (clicar de novo desmarca). */
export function ProgressButton({ contentId, done }: { contentId: string; done: boolean }) {
  const [state, action, pending] = useActionState(setContentDone, undefined)
  return (
    <form action={action} className="inline-flex flex-col">
      <input type="hidden" name="conteudo" value={contentId} />
      <input type="hidden" name="concluido" value={done ? 'nao' : 'sim'} />
      <Button type="submit" variant="secondary" disabled={pending} title={done ? 'Clique para desmarcar' : undefined}>
        {done ? '✓ Concluído' : 'Marcar como concluído'}
      </Button>
      {state?.erro ? (
        <span role="alert" className="mt-1 text-xs text-signal">
          {state.erro}
        </span>
      ) : null}
    </form>
  )
}
