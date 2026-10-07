import { chooseCohort } from '@/lib/academic/actions'
import type { CohortVM } from '@/lib/academic/model'

/** Só para quem vê mais de uma turma (admin, coordenação de várias turmas). */
export function CohortSwitcher({ cohorts, current, back }: { cohorts: CohortVM[]; current: string; back: string }) {
  if (cohorts.length < 2) return null
  return (
    <form action={chooseCohort} className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="voltar" value={back} />
      <label htmlFor="turma" className="text-muted">
        Ver turma
      </label>
      <select id="turma" name="turma" defaultValue={current} className="field min-h-9 rounded-full px-3 text-sm">
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.status === 'encerrada' ? ' (encerrada)' : ''}
          </option>
        ))}
      </select>
      <button type="submit" className="glass glass-interactive min-h-9 rounded-full px-4 font-semibold">
        Ver
      </button>
    </form>
  )
}
