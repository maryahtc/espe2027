import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { type SortDir, type SortKey, SORT_KEYS, type StudentRow, sortRows } from '@/lib/cohort/model'
import { formatDayMonth, relativeDays, year } from '@/lib/dates'

/**
 * Tabela de alunos da Visão da turma: ordenável por qualquer coluna (padrão: nome, A→Z), sem ranking, cores ou
 * medalhas. No celular a mesma tabela vira uma lista (sem rolagem lateral), com a ordenação num menu.
 */

const COLS: Array<{ key: SortKey; label: string; short: string; numeric: boolean }> = [
  { key: 'nome', label: 'Aluno', short: 'Aluno', numeric: false },
  { key: 'situacao', label: 'Matrícula', short: 'Matrícula', numeric: false },
  { key: 'casos', label: 'Casos', short: 'Casos', numeric: true },
  { key: 'consultas', label: 'Consultas', short: 'Consultas', numeric: true },
  { key: 'experiencias', label: 'Experiências', short: 'Experiências', numeric: true },
  { key: 'concluidos', label: 'Tratamentos concluídos', short: 'Concluídos', numeric: true },
  { key: 'ultimo', label: 'Último registro', short: 'Último registro', numeric: false },
]

export function StudentTable({
  rows,
  path,
  query,
  sp,
  studentHref,
  today,
}: {
  rows: StudentRow[]
  path: string
  query: Record<string, string>
  sp: { ordem?: string; dir?: string }
  studentHref: (id: string) => string
  today: string
}) {
  const key: SortKey = (SORT_KEYS as readonly string[]).includes(sp.ordem ?? '') ? (sp.ordem as SortKey) : 'nome'
  const dir: SortDir = sp.dir === 'desc' ? 'desc' : 'asc'
  const sorted = sortRows(rows, key, dir)
  const href = (k: SortKey, d: SortDir) => `${path}?${new URLSearchParams({ ...query, ordem: k, dir: d })}#alunos`
  const next = (k: SortKey): SortDir => (k === key && dir === 'asc' ? 'desc' : 'asc')
  const arrow = (k: SortKey) => (k === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '')
  const current = COLS.find((c) => c.key === key)!
  const last = (d: string | null) => (d ? `${formatDayMonth(d)}/${year(d)}` : '—')

  return (
    <div data-tabela-alunos data-ordem={key} data-dir={dir}>
      {/* Ordenação no celular (no computador, pelos cabeçalhos) */}
      <details className="relative mb-3 sm:hidden" data-ordenar>
        <summary className="glass inline-flex min-h-10 cursor-pointer list-none items-center rounded-full px-4 text-sm [&::-webkit-details-marker]:hidden">
          Ordenar: {current.short}
          {arrow(key)}
        </summary>
        <ul className="glass absolute left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2 text-sm">
          {COLS.map((c) => (
            <li key={c.key}>
              <Link href={href(c.key, next(c.key))} className={cn('flex min-h-11 items-center rounded-xl px-3', c.key === key ? 'font-semibold text-ink' : 'text-muted hover:text-ink')} data-ordenar-por={c.key}>
                {c.short}
                {arrow(c.key)}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <div className="sm:overflow-x-auto sm:rounded-2xl sm:border sm:border-rule sm:bg-white/[0.02]">
      <table className="block w-full text-sm sm:table">
        <caption className="sr-only">
          Alunos da turma, ordenados por {current.label.toLowerCase()} ({dir === 'asc' ? 'crescente' : 'decrescente'})
        </caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-rule text-left text-xs text-muted">
            {COLS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.key === key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cn('px-3 py-3 font-semibold', c.numeric && 'text-right')}
              >
                <Link href={href(c.key, next(c.key))} className="hover:text-ink" data-coluna={c.key}>
                  {c.label}
                  {arrow(c.key)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block space-y-2 sm:table-row-group sm:space-y-0">
          {sorted.map((r) => (
            <tr key={r.id} data-aluno={r.id} className="max-sm:grid max-sm:grid-cols-4 max-sm:gap-2 max-sm:rounded-2xl max-sm:border max-sm:border-rule max-sm:bg-white/[0.03] max-sm:p-4 sm:table-row sm:border-b sm:border-rule sm:last:border-b-0">
              <td className="col-span-3 min-w-0 sm:table-cell sm:px-3 sm:py-3" data-col="nome">
                <Link href={studentHref(r.id)} prefetch={false} className="font-semibold break-words hover:underline" data-abrir-aluno>
                  {r.name}
                </Link>
              </td>
              <td className="col-span-1 text-right text-xs text-muted sm:table-cell sm:px-3 sm:py-3 sm:text-left sm:text-sm" data-col="situacao">
                {r.active ? 'Ativa' : 'Inativa'}
              </td>
              {(
                [
                  ['casos', r.cases],
                  ['consultas', r.visits],
                  ['experiencias', r.experiences],
                  ['concluidos', r.completions],
                ] as const
              ).map(([k, v]) => (
                <td key={k} className="sm:table-cell sm:px-3 sm:py-3 sm:text-right" data-col={k}>
                  <span className="block text-[10px] text-muted sm:hidden">{COLS.find((c) => c.key === k)!.short}</span>
                  <span className="num">{v}</span>
                </td>
              ))}
              <td className="col-span-4 text-xs text-muted sm:table-cell sm:px-3 sm:py-3 sm:text-sm" data-col="ultimo" data-data={r.lastRecord ?? ''}>
                <span className="sm:hidden">Último registro: </span>
                {last(r.lastRecord)}
                {r.lastRecord ? <span className="hidden lg:inline"> ({relativeDays(today, r.lastRecord)})</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
