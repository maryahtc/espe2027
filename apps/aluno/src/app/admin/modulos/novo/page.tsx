import type { Metadata } from 'next'
import { ModuleEditor } from '@/components/admin/ModuleEditor'
import { draftModule } from '@/demo/draft-module'

export const metadata: Metadata = { title: 'Novo módulo' }

export default function NewModulePage() {
  return <ModuleEditor m={draftModule} status="rascunho" previewHref="/admin/modulos/novo/previa" />
}
