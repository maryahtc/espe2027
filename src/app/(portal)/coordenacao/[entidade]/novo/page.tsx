import { EditPage } from '../../EditPage'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Novo registro' }

export default async function NewRecordPage({ params }: { params: Promise<{ entidade: string }> }) {
  return <EditPage entitySlug={(await params).entidade} refValue={null} />
}
