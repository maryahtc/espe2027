import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EditForm } from '@/components/editing/EditForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowLeft } from '@/components/ui/icons'
import { getEntity } from '@/config/editing'
import { requireEditor } from '@/server/auth'
import { createSheetWriter } from '@/server/data/source'
import { editorOptions } from '@/server/editing/options'
import { findRecord, loadTable } from '@/server/editing/records'

/** Tela de criação (ref = null) ou edição de um registro. */
export async function EditPage({ entitySlug, refValue }: { entitySlug: string; refValue: string | null }) {
  await requireEditor()
  const entity = getEntity(entitySlug)
  if (!entity) notFound()
  const writer = createSheetWriter()
  const table = await loadTable(writer, entity)
  const record = refValue ? findRecord(entity, table, decodeURIComponent(refValue)) : null
  if (refValue && !record) notFound()
  const options = await editorOptions(writer)

  return (
    <>
      <div className="pt-4">
        <Link href={`/coordenacao/${entity.slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft width={15} height={15} /> {entity.label}
        </Link>
      </div>
      <PageHeader
        eyebrow={record ? `Aba ${table.tabName} · linha ${record.row}${record.id ? ` · ${record.id}` : ''}` : `Aba ${table.tabName}`}
        title={record ? `Editar ${entity.singular}` : entity.newLabel}
        description="Só os campos que você alterar serão gravados. O resto da linha na planilha fica como está."
      />
      <div className="max-w-2xl">
        <EditForm
          entitySlug={entity.slug}
          singular={entity.singular}
          fields={entity.fields}
          values={record?.values ?? {}}
          refValue={record?.ref ?? null}
          version={record?.version ?? ''}
          modules={options.modules}
          professors={options.professors}
          archiveByStatus={!!entity.archiveByStatus}
        />
      </div>
    </>
  )
}
