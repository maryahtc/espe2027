import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AnnouncementDetail } from '@/components/announcements/AnnouncementDetail'
import { viewerCohorts } from '@/lib/academic/load'
import { announcementHistory, loadAnnouncement } from '@/lib/announcements/load'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Aviso' }

export default async function AdminNoticePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  await requireUser(['admin'])
  const [{ id }, { criado }] = await Promise.all([params, searchParams])
  const item = await loadAnnouncement(id)
  if (!item) notFound()
  const [cohorts, history] = await Promise.all([viewerCohorts(), announcementHistory(id)])
  return <AnnouncementDetail base="/admin/avisos" item={item} cohorts={cohorts} allowAll history={history} created={criado === '1'} />
}
