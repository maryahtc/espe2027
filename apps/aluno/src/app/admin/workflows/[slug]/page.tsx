import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorkflowEditor } from '@/components/admin/WorkflowEditor'
import { workflowBySlug, workflows } from '@/demo/workflows'
import { PrototypeNotice } from '@/components/shell/PrototypeNotice'

export function generateStaticParams() {
  return workflows.map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: workflowBySlug((await params).slug)?.title ?? 'Workflow' }
}

export default async function EditWorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const w = workflowBySlug((await params).slug)
  if (!w) notFound()
  return (
    <>
      <PrototypeNotice etapa="Etapa 10 (Workflows)" />
      <WorkflowEditor
        graph={w.graph}
        meta={{ name: w.title, category: w.category, description: w.summary, status: w.status, previewHref: `/workflows/${w.slug}` }}
      />
    </>
  )
}
