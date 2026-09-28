import type { ReactNode } from 'react'
import { Activate } from '@/components/Enhancer'
import { FilterIcon } from '@/components/ui/icons'
import type { FilterDef } from '@/lib/filters'

const selectArrow =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236b6a66' stroke-width='1.4'/%3E%3C/svg%3E\")"

/**
 * Área filtrável: painel de filtros + conteúdo. Toda a marcação é gerada aqui (servidor);
 * src/client/filters.ts aplica os filtros instantaneamente e mantém a URL atualizada.
 */
export function Filterable({
  id,
  defs,
  countItem,
  countSub,
  initialCount,
  children,
}: {
  id: string
  defs: FilterDef[]
  countItem: [string, string]
  countSub?: [string, string]
  initialCount: string
  children: ReactNode
}) {
  return (
    <div
      data-filters=""
      data-count-item={countItem.join('|')}
      data-count-sub={(countSub ?? countItem).join('|')}
      className="group/filters"
    >
      <script type="application/json" data-filter-defs="" dangerouslySetInnerHTML={{ __html: JSON.stringify(defs) }} />
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button
            type="button"
            data-filter-toggle=""
            aria-expanded="false"
            aria-controls={`${id}-painel`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-rule-strong bg-surface px-4 text-sm font-medium"
          >
            <FilterIcon width={16} height={16} />
            Filtros
            <span data-filter-badge="" hidden className="data rounded-full bg-ink px-1.5 text-[11px] text-paper" />
          </button>
          <p data-filter-count="" className="data text-xs text-muted" aria-live="polite">
            {initialCount}
          </p>
        </div>

        <form
          id={`${id}-painel`}
          className="mt-3 hidden grid-cols-1 gap-3 rounded-lg border border-rule bg-surface p-4 group-data-[open]/filters:grid md:mt-0 md:grid md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] md:border-0 md:bg-transparent md:p-0"
        >
          {defs.map((def) => (
            <label key={def.param} className="flex flex-col gap-1.5">
              <span className="label">{def.label}</span>
              {def.kind === 'select' ? (
                <select
                  name={def.param}
                  data-filter-control={def.param}
                  defaultValue=""
                  className="h-11 w-full appearance-none rounded-md border border-rule-strong bg-surface bg-[length:10px] bg-[right_0.9rem_center] bg-no-repeat pr-8 pl-3 text-[15px] text-ink outline-none focus:border-ink"
                  style={{ backgroundImage: selectArrow }}
                >
                  <option value="">Todos</option>
                  {def.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="search"
                  name={def.param}
                  data-filter-control={def.param}
                  placeholder={def.placeholder}
                  autoComplete="off"
                  className="h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-[15px] text-ink placeholder:text-faint outline-none focus:border-ink"
                />
              )}
            </label>
          ))}
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p data-filter-count="" className="data mr-2 hidden text-xs text-muted md:block" aria-live="polite">
            {initialCount}
          </p>
          <div data-filter-chips="" hidden className="flex flex-wrap items-center gap-2 md:hidden" />
          <button type="button" data-filter-clear="" hidden className="link-underline min-h-9 text-[13px] md:text-sm">
            Limpar filtros
          </button>
        </div>
      </div>
      {children}
      <Activate />
    </div>
  )
}
