import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WorkflowPlayer } from '@/components/workflow/Player'
import { draftWorkflow } from '@/demo/workflows'
import { enumeratePaths, resolvePath } from '@/lib/workflow'

export function generateStaticParams() {
  return enumeratePaths(draftWorkflow.graph).map((caminho) => ({ caminho }))
}

export const metadata: Metadata = { title: 'Pré-visualizar como aluno' }

export default async function DraftPreviewPage({ params }: { params: Promise<{ caminho?: string[] }> }) {
  const { caminho = [] } = await params
  const resolved = resolvePath(draftWorkflow.graph, caminho)
  if (!resolved) notFound()
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink bg-sunken px-4 py-3 text-sm">
        <span>
          <strong>Pré-visualização como aluno</strong> · rascunho, não publicado
        </span>
        <Link href="/admin/workflows/novo" className="font-semibold underline underline-offset-2">
          Voltar ao editor
        </Link>
      </div>
      <h1 className="mb-8 text-3xl font-light tracking-tight">Alteração estética anterior</h1>
      <WorkflowPlayer workflow={draftWorkflow} resolved={resolved} base="/admin/workflows/novo/previa" />
    </>
  )
}
