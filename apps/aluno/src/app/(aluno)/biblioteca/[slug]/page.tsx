import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LessonView } from '@/components/library/LessonView'
import { currentCohort } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { loadAttachments, loadLibrary } from '@/lib/library/load'
import { relatedContents } from '@/lib/library/model'
import { playerFor } from '@/lib/library/video'

async function find(slug: string) {
  const auth = await requireUser()
  const cohort = await currentCohort()
  const all = await loadLibrary(auth?.userId ?? null, cohort?.id ?? null)
  return { item: all.find((c) => c.slug === slug) ?? null, all }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { item } = await find((await params).slug)
  return { title: item?.title ?? 'Biblioteca' }
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { item, all } = await find((await params).slug)
  if (!item) notFound()
  const [attachments, auth] = await Promise.all([loadAttachments(item.id), requireUser()])
  return <LessonView item={item} attachments={attachments} related={relatedContents(item, all)} video={playerFor(item, auth?.email ?? '')} />
}
