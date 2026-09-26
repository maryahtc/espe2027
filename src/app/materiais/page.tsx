import type { Metadata } from 'next'
import { DataList, Num } from '@/components/data/DataList'
import { ActiveFilters } from '@/components/filters/ActiveFilters'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader'
import { AvailabilityBadge } from '@/components/ui/StatusBadge'
import { AVAILABILITY_STATUS } from '@/config/vocab'
import { materialColumns } from '@/features/inventory/columns'
import { todayISO } from '@/lib/dates'
import { aggregateDemand } from '@/lib/domain/availability'
import { moduleLabel, moduleTiming } from '@/lib/domain/selectors'
import {
  activeFilters,
  applyFilters,
  optionMatches,
  parseFilters,
  textMatches,
  uniqueOptions,
  type FilterDef,
  type SearchParams,
} from '@/lib/filters'
import { padModuleNumber } from '@/lib/text'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Materiais' }

const PATH = '/materiais'

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ds = await getDataset()
  const today = todayISO()
  const usedModules = [...new Set(ds.materials.map((m) => m.moduleNumber))].sort((a, b) => a - b)
  const usedProfessors = new Set(ds.materials.map((m) => m.professorSlug))

  const defs: FilterDef[] = [
    { param: 'q', label: 'Material', kind: 'text', placeholder: 'Nome ou marca' },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      options: usedModules.map((n) => ({ value: padModuleNumber(n), label: moduleLabel({ number: n }) })),
    },
    { param: 'categoria', label: 'Categoria', kind: 'select', options: uniqueOptions(ds.materials.map((m) => m.category)) },
    {
      param: 'professor',
      label: 'Professor',
      kind: 'select',
      options: ds.professors.filter((p) => usedProfessors.has(p.slug)).map((p) => ({ value: p.slug, label: p.name })),
    },
    {
      param: 'status',
      label: 'Status',
      kind: 'select',
      options: Object.entries(AVAILABILITY_STATUS).map(([value, def]) => ({ value, label: def.label })),
    },
  ]
  const state = parseFilters(await searchParams, defs)
  const rows = applyFilters(ds.materials, state, {
    q: (m, v) => textMatches(v, m.name, m.brandSpec),
    modulo: (m, v) => padModuleNumber(m.moduleNumber) === v,
    categoria: (m, v) => optionMatches(v, m.category),
    professor: (m, v) => m.professorSlug === v,
    status: (m, v) => m.status === v,
  })

  const moduleByNumber = new Map(ds.modules.map((m) => [m.number, m]))
  const demand = aggregateDemand(
    ds.materials,
    new Map(ds.inventory.map((i) => [i.key, i.current])),
    (n) => {
      const mod = moduleByNumber.get(n)
      return !!mod && moduleTiming(mod, today) !== 'past'
    },
  )
  const demandRows = ds.inventory
    .filter((i) => demand.has(i.key))
    .map((i) => ({ item: i, ...demand.get(i.key)! }))
    .sort((a, b) => (b.missing ?? 0) - (a.missing ?? 0))

  return (
    <>
      <PageHeader
        title="Materiais"
        description="O que cada módulo precisa, comparado ao estoque atual."
      />
      <FilterPanel pathname={PATH} defs={defs} state={state} resultLabel={`${rows.length} ${rows.length === 1 ? 'item' : 'itens'}`} />
      <ActiveFilters filters={activeFilters(PATH, defs, state)} clearHref={PATH} />

      {rows.length ? (
        <DataList rows={rows} columns={materialColumns({ withModule: true })} rowKey={(m) => m.id} caption="Materiais por módulo" />
      ) : (
        <EmptyState title={ds.materials.length ? 'Nenhum material encontrado com esses filtros.' : 'Nenhum material cadastrado ainda.'} />
      )}

      {demandRows.length && Object.keys(state).length === 0 ? (
        <section className="mt-16" aria-label="Demanda acumulada">
          <SectionHeader title="Demanda acumulada dos próximos módulos" />
          <p className="-mt-1 mb-4 max-w-2xl text-sm text-muted">
            Soma do que todos os módulos ainda não realizados pedem de cada item, comparada ao estoque atual.
          </p>
          <div className="label hidden grid-cols-[1fr_repeat(3,6rem)_8rem] gap-x-4 border-b border-ink pb-2 !text-ink md:grid" aria-hidden>
            <span>Material</span>
            <span className="text-right">Total</span>
            <span className="text-right">Disponível</span>
            <span className="text-right">Faltam</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-rule border-b border-rule">
            {demandRows.map(({ item, required, available, missing, status, modules }) => (
              <li key={item.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[1fr_repeat(3,6rem)_8rem]">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="data text-xs text-muted">Módulos {modules.map(padModuleNumber).join(', ')}</p>
                </div>
                <div className="md:order-last"><AvailabilityBadge status={status} /></div>
                <p className="data col-span-2 text-sm text-muted md:col-span-1 md:text-right md:text-ink">
                  <span className="md:hidden">Total </span><Num value={required} />
                  <span className="md:hidden"> · disponível <Num value={available} /> · faltam <Num value={missing} emphasize /></span>
                </p>
                <p className="data hidden text-right text-sm md:block"><Num value={available} /></p>
                <p className="data hidden text-right text-sm md:block"><Num value={missing} emphasize /></p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
