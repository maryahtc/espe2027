import type { Metadata } from 'next'
import { DataList } from '@/components/data/DataList'
import { Filterable } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { INVENTORY_STATUS } from '@/config/vocab'
import { inventoryColumns } from '@/features/inventory/columns'
import { moduleLabel } from '@/lib/domain/selectors'
import { filterDataAttrs, optionKey, searchText, uniqueOptions, type FilterDef } from '@/lib/filters'
import { padModuleNumber } from '@/lib/text'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Estoque' }
export const revalidate = 60

export default async function InventoryPage() {
  const ds = await getDataset()
  const usedModules = [...new Set(ds.inventory.flatMap((i) => i.moduleNumbers))].sort((a, b) => a - b)
  const defs: FilterDef[] = [
    { param: 'q', label: 'Material', kind: 'text', level: 'item', placeholder: 'Nome ou marca' },
    { param: 'categoria', label: 'Categoria', kind: 'select', level: 'item', options: uniqueOptions(ds.inventory.map((i) => i.category)) },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      level: 'item',
      options: usedModules.map((n) => ({ value: padModuleNumber(n), label: moduleLabel({ number: n }) })),
    },
    {
      param: 'status',
      label: 'Status',
      kind: 'select',
      level: 'item',
      options: Object.entries(INVENTORY_STATUS).map(([value, def]) => ({ value, label: def.label })),
    },
  ]
  const total = ds.inventory.length
  const insuficiente = ds.inventory.filter((i) => i.status === 'insuficiente').length
  const baixo = ds.inventory.filter((i) => i.status === 'baixo').length

  return (
    <>
      <PageHeader
        title="Estoque"
        description={
          total
            ? `${total} ${total === 1 ? 'item' : 'itens'} · ${insuficiente} ${insuficiente === 1 ? 'insuficiente' : 'insuficientes'} · ${baixo} abaixo do mínimo.`
            : 'Disponibilidade real dos materiais.'
        }
      />
      {total === 0 ? (
        <EmptyState title="Nenhum item de estoque cadastrado ainda.">
          Os itens aparecerão aqui quando a aba ESTOQUE da planilha for preenchida.
        </EmptyState>
      ) : (
        <Filterable id="estoque" defs={defs} countItem={['item', 'itens']} initialCount={`${total} ${total === 1 ? 'item' : 'itens'}`}>
          <div data-filter-empty="" hidden>
            <EmptyState title="Nenhum item encontrado com esses filtros." />
          </div>
          <DataList
            rows={ds.inventory}
            columns={inventoryColumns}
            rowKey={(i) => i.key}
            caption="Estoque"
            filterAttrs={(i) =>
              filterDataAttrs(
                {
                  categoria: i.category ? [optionKey(i.category)] : [],
                  modulo: i.moduleNumbers.map(padModuleNumber),
                  status: [i.status],
                },
                searchText(i.name, i.brandSpec),
              )
            }
          />
        </Filterable>
      )}
    </>
  )
}
