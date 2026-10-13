import type { Metadata } from 'next'
import { AnnouncementsPanel } from '@/components/announcements/AnnouncementsPanel'
import { loadAdminAnnouncements } from '@/lib/announcements/load'
import { SITUATIONS, type Situation } from '@/lib/announcements/model'
import { requireUser } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'

export const metadata: Metadata = { title: 'Avisos' }

/** Coordenação: avisos só das turmas que coordena (a RLS garante o mesmo no banco). */
export default async function CoordinationNoticesPage({ searchParams }: { searchParams: Promise<{ situacao?: string }> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) return null
  const { situacao } = await searchParams
  const cohorts = await trackingCohorts(auth)
  const items = await loadAdminAnnouncements(cohorts.map((c) => c.id))
  return (
    <AnnouncementsPanel
      base="/coordenacao/avisos"
      items={items}
      cohorts={cohorts}
      allowAll={false}
      filter={SITUATIONS.includes(situacao as Situation) ? (situacao as Situation) : null}
      eyebrow="Coordenação"
      lead="Recados curtos para a sua turma. Aparecem no Início dos alunos durante o período escolhido."
    />
  )
}
