import type { ReactNode } from 'react'

/**
 * Dados tabulares responsivos: tabela no desktop, cartões compactos no celular.
 * Cada coluna declara seu papel no cartão mobile.
 */
export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** primary = título do cartão · status = canto superior direito · meta = linha secundária · stat = números · hidden */
  mobile: 'primary' | 'status' | 'meta' | 'stat' | 'hidden'
}

export function DataList<T>({ rows, columns, rowKey, caption, filterAttrs }: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  caption: string
  /** Atributos de filtro (data-f-*, data-text) — torna as linhas filtráveis no navegador. */
  filterAttrs?: (row: T) => Record<string, string>
}) {
  const itemProps = (row: T) =>
    filterAttrs ? { 'data-item': '', 'data-key': rowKey(row), ...filterAttrs(row) } : {}
  const primary = columns.find((c) => c.mobile === 'primary')
  const status = columns.find((c) => c.mobile === 'status')
  const meta = columns.filter((c) => c.mobile === 'meta')
  const stats = columns.filter((c) => c.mobile === 'stat')

  return (
    <>
      {/* Celular: cartões */}
      <ul className="divide-y divide-rule border-y border-rule md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="py-4" {...itemProps(row)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-semibold text-ink">{primary?.cell(row)}</div>
              {status ? <div className="shrink-0 pt-0.5">{status.cell(row)}</div> : null}
            </div>
            {meta.map((c) => {
              const content = c.cell(row)
              return content ? (
                <div key={c.key} className="mt-0.5 text-sm text-muted">
                  {content}
                </div>
              ) : null
            })}
            {stats.length ? (
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {stats.map((c) => (
                  <div key={c.key}>
                    <dt className="label !text-[10px]">{c.header}</dt>
                    <dd className="data mt-0.5 text-[15px] text-ink">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ink">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`label py-2.5 pr-4 !text-ink last:pr-0 ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-rule transition-colors hover:bg-surface" {...itemProps(row)}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-3 pr-4 align-top last:pr-0 ${c.align === 'right' ? 'data text-right' : ''}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Número ou traço quando desconhecido. */
export function Num({ value, emphasize = false }: { value: number | null; emphasize?: boolean }) {
  if (value === null) return <span className="text-faint">—</span>
  return <span className={emphasize && value > 0 ? 'font-semibold text-warn' : ''}>{value.toLocaleString('pt-BR')}</span>
}
