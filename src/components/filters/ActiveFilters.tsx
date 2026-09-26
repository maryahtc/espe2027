import Link from 'next/link'
import { CloseIcon } from '@/components/ui/icons'
import type { ActiveFilter } from '@/lib/filters'

/** Chips dos filtros ativos (celular) + "Limpar filtros". */
export function ActiveFilters({ filters, clearHref }: { filters: ActiveFilter[]; clearHref: string }) {
  if (filters.length === 0) return null
  return (
    <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 md:hidden">
      {filters.map((filter) => (
        <Link
          key={filter.param}
          href={filter.removeHref}
          scroll={false}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink bg-ink px-3 text-[13px] text-paper"
          aria-label={`Remover filtro ${filter.label}: ${filter.valueLabel}`}
        >
          {filter.valueLabel}
          <CloseIcon width={13} height={13} />
        </Link>
      ))}
      <Link href={clearHref} scroll={false} className="link-underline ml-1 text-[13px]">
        Limpar filtros
      </Link>
    </div>
  )
}
