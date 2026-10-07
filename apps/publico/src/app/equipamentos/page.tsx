import type { Metadata } from 'next'
import { DataList } from '@/components/data/DataList'
import { Filterable } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { AVAILABILITY_STATUS } from '@/config/vocab'
import { equipmentColumns } from '@/features/inventory/columns'
import { moduleLabel } from '@/lib/domain/selectors'
import { filterDataAttrs, optionKey, searchText, uniqueOptions, type FilterDef } from '@/lib/filters'
import { padModuleNumber } from '@/lib/text'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Equipamentos' }
export const revalidate = 60

export default async function EquipmentPage() {
  const ds = await getDataset()
  const usedModules = [...new Set(ds.equipment.flatMap((e) => e.moduleNumbers))].sort((a, b) => a - b)
  const defs: FilterDef[] = [
    { param: 'q', label: 'Equipamento', kind: 'text', level: 'item', placeholder: 'Nome' },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      level: 'item',
      options: usedModules.map((n) => ({ value: padModuleNumber(n), label: moduleLabel({ number: n }) })),
    },
    { param: 'categoria', label: 'Categoria', kind: 'select', level: 'item', options: uniqueOptions(ds.equipment.map((e) => e.category)) },
    {
      param: 'status',
      label: 'Status',
      kind: 'select',
      level: 'item',
      options: Object.entries(AVAILABILITY_STATUS).map(([value, def]) => ({ value, label: def.label })),
    },
  ]
  const count = `${ds.equipment.length} ${ds.equipment.length === 1 ? 'equipamento' : 'equipamentos'}`

  return (
    <>
      <PageHeader title="Equipamentos" description="Equipamentos necessários por módulo e sua disponibilidade." />
      {ds.equipment.length === 0 ? (
        <EmptyState title="Nenhum equipamento cadastrado ainda." />
      ) : (
        <Filterable id="equipamentos" defs={defs} countItem={['equipamento', 'equipamentos']} initialCount={count}>
          <div data-filter-empty="" hidden>
            <EmptyState title="Nenhum equipamento encontrado com esses filtros." />
          </div>
          <DataList
            rows={ds.equipment}
            columns={equipmentColumns({ withModule: true })}
            rowKey={(e) => e.id}
            caption="Equipamentos"
            filterAttrs={(e) =>
              filterDataAttrs(
                {
                  modulo: e.moduleNumbers.map(padModuleNumber),
                  categoria: e.category ? [optionKey(e.category)] : [],
                  status: [e.status],
                },
                searchText(e.name, e.category),
              )
            }
          />
        </Filterable>
      )}
    </>
  )
}
