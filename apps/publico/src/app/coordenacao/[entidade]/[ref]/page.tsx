import { EditPage } from '../../EditPage'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editar registro' }

export default async function EditRecordPage({ params }: { params: Promise<{ entidade: string; ref: string }> }) {
  const { entidade, ref } = await params
  return <EditPage entitySlug={entidade} refValue={ref} />
}
