import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WorkflowPlayer } from '@/components/workflow/Player'
import { workflowBySlug, workflows } from '@/demo/workflows'
import { enumeratePaths, resolvePath } from '@/lib/workflow'

export function generateStaticParams() {
  return workflows.flatMap((w) => enumeratePaths(w.graph).map((caminho) => ({ slug: w.slug, caminho })))
}

type Params = Promise<{ slug: string; caminho?: string[] }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const w = workflowBySlug((await params).slug)
  return { title: w ? `${w.title} · Workflow clínico` : 'Workflow clínico' }
}

export default async function WorkflowPage({ params }: { params: Params }) {
  const { slug, caminho = [] } = await params
  const workflow = workflowBySlug(slug)
  const resolved = workflow ? resolvePath(workflow.graph, caminho) : null
  if (!workflow || !resolved) notFound()
  return (
    <>
      <Link href="/workflows" className="text-sm text-muted hover:text-ink">
        ← Workflow clínico
      </Link>
      <header className="mt-4 mb-8 lg:mb-10">
        <p className="eyebrow">{workflow.category}</p>
        <h1 className="mt-1 text-3xl leading-tight font-light tracking-tight sm:text-4xl">{workflow.title}</h1>
      </header>
      <WorkflowPlayer workflow={workflow} resolved={resolved} />
    </>
  )
}
