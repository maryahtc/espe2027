import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AnnouncementDetail } from '@/components/announcements/AnnouncementDetail'
import { announcementHistory, loadAnnouncement } from '@/lib/announcements/load'
import { requireUser } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'

export const metadata: Metadata = { title: 'Aviso' }

export default async function CoordinationNoticePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) notFound()
  const [{ id }, { criado }] = await Promise.all([params, searchParams])
  const cohorts = await trackingCohorts(auth)
  const item = await loadAnnouncement(id)
  // Só avisos das turmas coordenadas (avisos "para todas" são do Admin).
  if (!item || !item.cohortId || !cohorts.some((c) => c.id === item.cohortId)) notFound()
  const history = await announcementHistory(id)
  return <AnnouncementDetail base="/coordenacao/avisos" item={item} cohorts={cohorts} allowAll={false} history={history} created={criado === '1'} />
}
