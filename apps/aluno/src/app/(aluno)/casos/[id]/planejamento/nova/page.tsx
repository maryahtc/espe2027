import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PLAN_NOTICE } from '@/components/plans/CasePlan'
import { PlanEditor } from '@/components/plans/PlanEditor'
import { planEditorData } from '@/lib/plans/editor'

export const metadata: Metadata = { title: 'Planejar consulta' }

/** Nova consulta planejada (Etapa 8). */
export default async function NewPlanVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await planEditorData(id)
  return (
    <div className="max-w-3xl">
      <Link href={`/casos/${id}#planejamento`} className="text-sm text-muted hover:text-ink">
        ← Voltar ao caso {d.c.patientLabel}
      </Link>
      <PageTitle eyebrow="Planejamento do caso" title="Planejar consulta" lead={PLAN_NOTICE} />
      <PlanEditor caseId={id} title={d.title} options={d.options} history={d.history} archSupported={d.archSupported} />
    </div>
  )
}
