import type { Metadata } from 'next'
import { AnnouncementsPanel } from '@/components/announcements/AnnouncementsPanel'
import { viewerCohorts } from '@/lib/academic/load'
import { loadAdminAnnouncements } from '@/lib/announcements/load'
import { SITUATIONS, type Situation } from '@/lib/announcements/model'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Avisos' }

export default async function AdminNoticesPage({ searchParams }: { searchParams: Promise<{ situacao?: string }> }) {
  await requireUser(['admin'])
  const { situacao } = await searchParams
  const [items, cohorts] = await Promise.all([loadAdminAnnouncements(null), viewerCohorts()])
  return (
    <AnnouncementsPanel
      base="/admin/avisos"
      items={items}
      cohorts={cohorts}
      allowAll
      filter={SITUATIONS.includes(situacao as Situation) ? (situacao as Situation) : null}
      eyebrow="Especialização"
      lead="Recados curtos que aparecem no Início da turma durante o período escolhido. Para uma turma ou para todas."
    />
  )
}
