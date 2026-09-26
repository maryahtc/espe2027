import type { Metadata } from 'next'
import { DataList } from '@/components/data/DataList'
import { ActiveFilters } from '@/components/filters/ActiveFilters'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { AVAILABILITY_STATUS } from '@/config/vocab'
import { equipmentColumns } from '@/features/inventory/columns'
import { moduleLabel } from '@/lib/domain/selectors'
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

export const metadata: Metadata = { title: 'Equipamentos' }

const PATH = '/equipamentos'

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ds = await getDataset()
  const usedModules = [...new Set(ds.equipment.flatMap((e) => e.moduleNumbers))].sort((a, b) => a - b)
  const defs: FilterDef[] = [
    { param: 'q', label: 'Equipamento', kind: 'text', placeholder: 'Nome' },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      options: usedModules.map((n) => ({ value: padModuleNumber(n), label: moduleLabel({ number: n }) })),
    },
    { param: 'categoria', label: 'Categoria', kind: 'select', options: uniqueOptions(ds.equipment.map((e) => e.category)) },
    {
      param: 'status',
      label: 'Status',
      kind: 'select',
      options: Object.entries(AVAILABILITY_STATUS).map(([value, def]) => ({ value, label: def.label })),
    },
  ]
  const state = parseFilters(await searchParams, defs)
  const rows = applyFilters(ds.equipment, state, {
    q: (e, v) => textMatches(v, e.name, e.category),
    modulo: (e, v) => e.moduleNumbers.some((n) => padModuleNumber(n) === v),
    categoria: (e, v) => optionMatches(v, e.category),
    status: (e, v) => e.status === v,
  })

  return (
    <>
      <PageHeader title="Equipamentos" description="Equipamentos necessários por módulo e sua disponibilidade." />
      <FilterPanel pathname={PATH} defs={defs} state={state} resultLabel={`${rows.length} ${rows.length === 1 ? 'equipamento' : 'equipamentos'}`} />
      <ActiveFilters filters={activeFilters(PATH, defs, state)} clearHref={PATH} />
      {rows.length ? (
        <DataList rows={rows} columns={equipmentColumns({ withModule: true })} rowKey={(e) => e.id} caption="Equipamentos" />
      ) : (
        <EmptyState title={ds.equipment.length ? 'Nenhum equipamento encontrado com esses filtros.' : 'Nenhum equipamento cadastrado ainda.'} />
      )}
    </>
  )
}
