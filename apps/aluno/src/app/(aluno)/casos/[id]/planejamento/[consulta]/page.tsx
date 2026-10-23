import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PLAN_NOTICE } from '@/components/plans/CasePlan'
import { PlanAction } from '@/components/plans/PlanAction'
import { PlanEditor } from '@/components/plans/PlanEditor'
import { deletePlanVisit } from '@/lib/plans/actions'
import { planEditorData } from '@/lib/plans/editor'

export const metadata: Metadata = { title: 'Editar consulta planejada' }

/** Editar uma consulta planejada ainda sem vínculo (Etapa 8). */
export default async function EditPlanVisitPage({ params }: { params: Promise<{ id: string; consulta: string }> }) {
  const { id, consulta } = await params
  const d = await planEditorData(id, consulta)
  const v = d.visit!
  return (
    <div className="max-w-3xl">
      <Link href={`/casos/${id}#planejamento`} className="text-sm text-muted hover:text-ink">
        ← Voltar ao caso {d.c.patientLabel}
      </Link>
      <PageTitle eyebrow="Planejamento do caso" title={`Editar ${d.title.toLowerCase()}`} lead={PLAN_NOTICE} />
      <PlanEditor
        caseId={id}
        visitId={v.id}
        title={d.title}
        options={d.options}
        history={d.history}
        archSupported={d.archSupported}
        initial={{ note: v.note, items: v.items.map((i) => ({ id: i.id, stepId: i.stepId, teeth: i.teeth, arch: i.arch, quantity: i.quantity, description: i.description })) }}
      />
      <div className="mt-10 border-t border-rule pt-6">
        <PlanAction action={deletePlanVisit} fields={{ id: v.id }} label="Excluir consulta planejada" data="excluir-plano" confirmText="Excluir esta consulta planejada? Os registros reais não mudam." />
      </div>
    </div>
  )
}
