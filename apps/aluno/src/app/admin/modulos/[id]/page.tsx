import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ModuleEditor } from '@/components/admin/academic/ModuleEditor'
import { loadAdminModule } from '@/lib/admin/academic'

export const metadata: Metadata = { title: 'Editar módulo' }

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const page = await loadAdminModule((await params).id)
  if (!page) notFound()
  return <ModuleEditor page={page} internalNotes={page.detail.internalNotes ?? ''} />
}
