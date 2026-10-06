import type { Metadata } from 'next'
import { WorkflowEditor } from '@/components/admin/WorkflowEditor'
import { draftWorkflow } from '@/demo/workflows'

export const metadata: Metadata = { title: 'Novo workflow' }

export default function NewWorkflowPage() {
  return (
    <WorkflowEditor
      graph={draftWorkflow.graph}
      meta={{
        name: 'Alteração estética anterior',
        category: draftWorkflow.category,
        description: 'Por onde começar o raciocínio quando o paciente quer mudar o sorriso.',
        status: 'Rascunho',
        previewHref: '/admin/workflows/novo/previa',
      }}
    />
  )
}
