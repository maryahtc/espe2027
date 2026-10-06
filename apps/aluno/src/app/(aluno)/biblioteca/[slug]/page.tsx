import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonView } from '@/components/library/LessonView'
import { library, librarySlug } from '@/demo/library'

export function generateStaticParams() {
  return library.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: librarySlug((await params).slug)?.title ?? 'Biblioteca' }
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = librarySlug((await params).slug)
  if (!item) notFound()
  return <LessonView item={item} />
}
