import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonView } from '@/components/library/LessonView'
import { requireUser } from '@/lib/auth/session'
import { loadAdminContent } from '@/lib/admin/library'
import { playerFor } from '@/lib/library/video'

export const metadata: Metadata = { title: 'Pré-visualização' }

/** Como o aluno verá o conteúdo (inclusive rascunho). Não grava progresso. */
export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  const page = await loadAdminContent((await params).id)
  if (!page) notFound()
  return (
    <>
      <p className="mb-4 rounded-full border border-dashed border-rule-strong px-4 py-2 text-center text-xs text-muted">
        Pré-visualização · {page.content.status === 'publicado' ? 'publicado' : 'ainda não visível para os alunos'}
      </p>
      <LessonView item={page.content} attachments={page.attachments} related={[]} preview video={playerFor(page.content, auth?.email ?? '')} backHref={`/admin/conteudos/${page.content.id}`} />
    </>
  )
}
