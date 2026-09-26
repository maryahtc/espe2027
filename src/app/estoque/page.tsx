import type { Metadata } from 'next'
import { DataList } from '@/components/data/DataList'
import { ActiveFilters } from '@/components/filters/ActiveFilters'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { INVENTORY_STATUS } from '@/config/vocab'
import { inventoryColumns } from '@/features/inventory/columns'
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

export const metadata: Metadata = { title: 'Estoque' }

const PATH = '/estoque'

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ds = await getDataset()
  const usedModules = [...new Set(ds.inventory.flatMap((i) => i.moduleNumbers))].sort((a, b) => a - b)
  const defs: FilterDef[] = [
    { param: 'q', label: 'Material', kind: 'text', placeholder: 'Nome ou marca' },
    { param: 'categoria', label: 'Categoria', kind: 'select', options: uniqueOptions(ds.inventory.map((i) => i.category)) },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      options: usedModules.map((n) => ({ value: padModuleNumber(n), label: moduleLabel({ number: n }) })),
    },
    {
      param: 'status',
      label: 'Status',
      kind: 'select',
      options: Object.entries(INVENTORY_STATUS).map(([value, def]) => ({ value, label: def.label })),
    },
  ]
  const state = parseFilters(await searchParams, defs)
  const rows = applyFilters(ds.inventory, state, {
    q: (i, v) => textMatches(v, i.name, i.brandSpec),
    categoria: (i, v) => optionMatches(v, i.category),
    modulo: (i, v) => i.moduleNumbers.some((n) => padModuleNumber(n) === v),
    status: (i, v) => i.status === v,
  })
  const counts = {
    baixo: ds.inventory.filter((i) => i.status === 'baixo').length,
    insuficiente: ds.inventory.filter((i) => i.status === 'insuficiente').length,
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        description={
          ds.inventory.length
            ? `${ds.inventory.length} ${ds.inventory.length === 1 ? 'item' : 'itens'} · ${counts.insuficiente} ${counts.insuficiente === 1 ? 'insuficiente' : 'insuficientes'} · ${counts.baixo} abaixo do mínimo.`
            : 'Disponibilidade real dos materiais.'
        }
      />
      <FilterPanel pathname={PATH} defs={defs} state={state} resultLabel={`${rows.length} ${rows.length === 1 ? 'item' : 'itens'}`} />
      <ActiveFilters filters={activeFilters(PATH, defs, state)} clearHref={PATH} />
      {rows.length ? (
        <DataList rows={rows} columns={inventoryColumns} rowKey={(i) => i.key} caption="Estoque" />
      ) : (
        <EmptyState title={ds.inventory.length ? 'Nenhum item encontrado com esses filtros.' : 'Nenhum item de estoque cadastrado ainda.'} />
      )}
    </>
  )
}
