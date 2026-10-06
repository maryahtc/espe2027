import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PreviewFrame } from '@/components/admin/PreviewFrame'
import { LessonView } from '@/components/library/LessonView'
import { draftContents } from '@/demo/admin-content'

export function generateStaticParams() {
  return draftContents.map((c) => ({ slug: c.slug }))
}

export const metadata: Metadata = { title: 'Pré-visualizar conteúdo' }

export default async function ContentPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = draftContents.find((c) => c.slug === slug)
  if (!item) notFound()
  return (
    <PreviewFrame backHref="/admin/conteudos" label={item.status === 'arquivado' ? 'Conteúdo arquivado' : 'Conteúdo em rascunho, ainda invisível para os alunos'}>
      <LessonView item={item} />
    </PreviewFrame>
  )
}
