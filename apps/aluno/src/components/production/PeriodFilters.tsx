import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import type { ResolvedPeriod } from '@/lib/production/period'

/**
 * Filtros de período (Etapa 7): Todo o curso · Este ano do curso · Este módulo · Período. Mesmos filtros na Minha
 * Produção, na Visão da turma e na produção individual. `path` é a página; `keep` são parâmetros a preservar (turma…).
 */
export function PeriodFilters({
  r,
  path,
  keep = {},
  defaultFrom,
  today,
}: {
  r: ResolvedPeriod
  path: string
  keep?: Record<string, string>
  defaultFrom: string
  today: string
}) {
  const { period, thisYear, thisModule } = r
  const href = (filtro?: string) => {
    const q = new URLSearchParams({ ...keep, ...(filtro ? { filtro } : {}) }).toString()
    return q ? `${path}?${q}` : path
  }
  const filterLink = (key: string, label: string, enabled = true) => {
    const active = r.key === key && (key !== 'periodo' || period.kind === 'periodo')
    return enabled ? (
      <Link
        key={key}
        href={key === 'curso' ? href() : href(key)}
        aria-current={active ? 'page' : undefined}
        className={cn('glass inline-flex min-h-10 items-center rounded-full px-4 text-sm', active ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink')}
      >
        {label}
      </Link>
    ) : (
      <span key={key} className="inline-flex min-h-10 items-center rounded-full border border-rule px-4 text-sm text-faint" title="Ainda não há módulo em andamento ou concluído">
        {label}
      </span>
    )
  }
  return (
    <>
      <nav aria-label="Período" className="flex flex-wrap items-center gap-2" data-filtros>
        {filterLink('curso', 'Todo o curso')}
        {filterLink('ano', thisYear ? `Este ano do curso (${thisYear.index}º)` : 'Este ano do curso', !!thisYear)}
        {filterLink('modulo', 'Este módulo', !!thisModule)}
        <details className="relative">
          <summary
            className={cn(
              'glass inline-flex min-h-10 cursor-pointer list-none items-center rounded-full px-4 text-sm [&::-webkit-details-marker]:hidden',
              period.kind === 'periodo' ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink',
            )}
          >
            Período
          </summary>
          <form action={path} className="glass absolute left-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-3 rounded-2xl p-4">
            {Object.entries(keep).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input type="hidden" name="filtro" value="periodo" />
            <label className="block text-sm font-semibold">
              De
              <input type="date" name="de" required defaultValue={period.kind === 'periodo' ? period.from : defaultFrom} className="field mt-1 block min-h-11 w-full px-3" />
            </label>
            <label className="block text-sm font-semibold">
              Até
              <input type="date" name="ate" required defaultValue={period.kind === 'periodo' ? period.to : today} className="field mt-1 block min-h-11 w-full px-3" />
            </label>
            <button type="submit" className="min-h-11 w-full rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
              Aplicar
            </button>
          </form>
        </details>
      </nav>
      <p className="mt-3 text-xs text-muted" data-periodo>
        Mostrando: <span className="text-ink">{r.label}</span>
      </p>
    </>
  )
}
