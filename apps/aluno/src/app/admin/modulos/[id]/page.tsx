import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ModuleEditor } from '@/components/admin/academic/ModuleEditor'
import { ModuleLibraryBlock } from '@/components/admin/library/ModuleLibraryBlock'
import { ModuleTasksBlock } from '@/components/tasks/ModuleTasksBlock'
import { loadAdminModule } from '@/lib/admin/academic'
import { tasksReady } from '@/lib/tasks/schema'

export const metadata: Metadata = { title: 'Editar módulo' }

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const page = await loadAdminModule((await params).id)
  if (!page) notFound()
  const tasks = (await tasksReady()) ? <ModuleTasksBlock moduleId={page.detail.module.id} /> : undefined
  return (
    <ModuleEditor page={page} internalNotes={page.detail.internalNotes ?? ''} library={<ModuleLibraryBlock moduleId={page.detail.module.id} />} tasks={tasks} />
  )
}
