import type { Metadata } from 'next'
import { PreviewFrame } from '@/components/admin/PreviewFrame'
import { ModuleView } from '@/components/modules/ModuleView'
import { draftModule } from '@/demo/draft-module'

export const metadata: Metadata = { title: 'Pré-visualizar módulo' }

export default function DraftModulePreview() {
  return (
    <PreviewFrame backHref="/admin/modulos/novo" label="Módulo em rascunho, ainda invisível para os alunos">
      <ModuleView m={draftModule} />
    </PreviewFrame>
  )
}
