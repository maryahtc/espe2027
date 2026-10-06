import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowLeft, ArrowRight } from '@/components/ui/icons'
import { getEntity } from '@/config/editing'
import { requireEditor } from '@/server/auth'
import { createSheetWriter } from '@/server/data/source'
import { listRecords, loadTable } from '@/server/editing/records'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ entidade: string }>; searchParams: Promise<{ aviso?: string }> }

export async function generateMetadata({ params }: Props) {
  return { title: getEntity((await params).entidade)?.label ?? 'Registros' }
}

export default async function EntityList({ params, searchParams }: Props) {
  await requireEditor()
  const entity = getEntity((await params).entidade)
  if (!entity) notFound()
  const { aviso } = await searchParams
  const table = await loadTable(createSheetWriter(), entity)
  const records = listRecords(entity, table)
  const listFields = entity.fields.filter((f) => f.inList)
  const [titleField, ...metaFields] = [
    listFields.find((f) => ['title', 'name', 'material'].includes(f.key)) ?? listFields[0]!,
    ...listFields.filter((f) => !['title', 'name', 'material'].includes(f.key)),
  ]

  return (
    <>
      <div className="pt-4">
        <Link href="/coordenacao" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft width={15} height={15} /> Painel
        </Link>
      </div>
      <PageHeader title={entity.label} description={`Aba “${table.tabName}” da planilha.`}>
        <div className="mt-5">
          <Link
            href={`/coordenacao/${entity.slug}/novo`}
            className="inline-flex min-h-11 items-center rounded-md bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink-2"
          >
            {entity.newLabel}
          </Link>
        </div>
      </PageHeader>

      {aviso ? (
        <div role="status" className="mb-6 rounded-md border border-ok/40 bg-ok-bg px-4 py-3 text-sm text-ok">
          {aviso}
        </div>
      ) : null}

      {!table.rows ? (
        <EmptyState title={`A aba “${table.tabName}” ainda não existe na planilha.`}>
          Ela será criada automaticamente quando você cadastrar o primeiro registro.
        </EmptyState>
      ) : records.length === 0 ? (
        <EmptyState title="Nenhum registro ainda." />
      ) : (
        <ul className="border-t border-rule">
          {records.map((r) => (
            <li key={r.ref} className="border-b border-rule">
              <Link href={`/coordenacao/${entity.slug}/${r.ref}`} className="group flex items-center justify-between gap-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold text-ink">
                    {r.values[titleField.key] || <span className="text-muted">(sem {titleField.label.toLowerCase()})</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {metaFields
                      .map((f) => (r.values[f.key] ? `${f.label}: ${r.values[f.key]!.replace(/\s+/g, ' ')}` : null))
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="data text-xs text-faint">linha {r.row}</span>
                  <ArrowRight width={16} height={16} className="text-faint group-hover:text-ink" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
