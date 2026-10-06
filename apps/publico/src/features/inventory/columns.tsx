import Link from 'next/link'
import type { Column } from '@/components/data/DataList'
import { Num } from '@/components/data/DataList'
import { AvailabilityBadge, InventoryBadge } from '@/components/ui/StatusBadge'
import { formatNumericDate } from '@/lib/dates'
import { moduleHrefByNumber } from '@/lib/domain/selectors'
import { padModuleNumber } from '@/lib/text'
import type { PublicEquipment, PublicInventoryItem, PublicMaterial } from '@/schemas/public'

function ModuleLinks({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) return <span className="text-faint">—</span>
  return (
    <span className="data">
      {numbers.map((n, i) => (
        <span key={n}>
          {i > 0 ? ', ' : ''}
          <Link href={moduleHrefByNumber(n)} className="link-underline">
            {padModuleNumber(n)}
          </Link>
        </span>
      ))}
    </span>
  )
}

export function materialColumns({ withModule }: { withModule: boolean }): Column<PublicMaterial>[] {
  return [
    { key: 'name', header: 'Material', mobile: 'primary', cell: (m) => <span className="font-medium text-ink">{m.name}</span> },
    { key: 'brand', header: 'Marca / especificação', mobile: 'meta', cell: (m) => m.brandSpec ?? (withModule ? null : <span className="text-faint">—</span>) },
    ...(withModule
      ? [{ key: 'module', header: 'Módulo', mobile: 'meta' as const, cell: (m: PublicMaterial) => (
          <span>
            <span className="md:hidden">Módulo </span>
            <ModuleLinks numbers={[m.moduleNumber]} />
            {m.classTitle ? <span className="text-muted"> · {m.classTitle}</span> : null}
          </span>
        ) }]
      : [{ key: 'class', header: 'Aula', mobile: 'meta' as const, cell: (m: PublicMaterial) => m.classTitle }]),
    { key: 'required', header: 'Necessário', align: 'right', mobile: 'stat', cell: (m) => <Num value={m.required} /> },
    { key: 'available', header: 'Disponível', align: 'right', mobile: 'stat', cell: (m) => <Num value={m.available} /> },
    { key: 'missing', header: 'Faltam', align: 'right', mobile: 'stat', cell: (m) => <Num value={m.missing} emphasize /> },
    { key: 'status', header: 'Status', mobile: 'status', cell: (m) => <AvailabilityBadge status={m.status} /> },
  ]
}

export const inventoryColumns: Column<PublicInventoryItem>[] = [
  { key: 'name', header: 'Material', mobile: 'primary', cell: (i) => <span className="font-medium text-ink">{i.name}</span> },
  { key: 'category', header: 'Categoria', mobile: 'meta', cell: (i) => i.category ?? <span className="text-faint">—</span> },
  { key: 'brand', header: 'Marca', mobile: 'meta', cell: (i) => i.brandSpec ?? <span className="text-faint md:inline hidden">—</span> },
  { key: 'unit', header: 'Unidade', mobile: 'hidden', cell: (i) => i.unit ?? <span className="text-faint">—</span> },
  {
    key: 'current',
    header: 'Disponível',
    align: 'right',
    mobile: 'stat',
    cell: (i) => (
      <>
        <Num value={i.current} />
        {i.unit && i.current !== null ? <span className="ml-1 text-xs text-muted md:hidden">{i.unit}</span> : null}
      </>
    ),
  },
  { key: 'minimum', header: 'Mínimo', align: 'right', mobile: 'stat', cell: (i) => <Num value={i.minimum} /> },
  { key: 'modules', header: 'Módulos', mobile: 'stat', cell: (i) => <ModuleLinks numbers={i.moduleNumbers} /> },
  { key: 'updated', header: 'Atualizado', mobile: 'hidden', cell: (i) => <UpdatedAt date={i.updatedAt} /> },
  { key: 'status', header: 'Status', mobile: 'status', cell: (i) => <InventoryBadge status={i.status} /> },
]

export function equipmentColumns({ withModule }: { withModule: boolean }): Column<PublicEquipment>[] {
  return [
    { key: 'name', header: 'Equipamento', mobile: 'primary', cell: (e) => <span className="font-medium text-ink">{e.name}</span> },
    { key: 'category', header: 'Categoria', mobile: 'meta', cell: (e) => e.category ?? <span className="text-faint">—</span> },
    ...(withModule
      ? [{ key: 'modules', header: 'Módulos', mobile: 'meta' as const, cell: (e: PublicEquipment) =>
          e.moduleNumbers.length ? (
            <span>
              <span className="md:hidden">Módulos </span>
              <ModuleLinks numbers={e.moduleNumbers} />
            </span>
          ) : null }]
      : []),
    { key: 'required', header: 'Necessário', align: 'right', mobile: 'stat', cell: (e) => <Num value={e.required} /> },
    { key: 'available', header: 'Disponível', align: 'right', mobile: 'stat', cell: (e) => <Num value={e.available} /> },
    { key: 'missing', header: 'Faltam', align: 'right', mobile: 'stat', cell: (e) => <Num value={e.missing} emphasize /> },
    { key: 'status', header: 'Status', mobile: 'status', cell: (e) => <AvailabilityBadge status={e.status} /> },
  ]
}

function UpdatedAt({ date }: { date: string | null }) {
  return date ? <span className="data text-xs text-muted">{formatNumericDate(date)}</span> : <span className="text-faint">—</span>
}
