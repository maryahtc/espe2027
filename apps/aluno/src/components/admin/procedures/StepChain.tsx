import { cn } from '@portal/ui/cn'
import { isSingleStep, type ProcedureVM, UNIT_LABEL } from '@/lib/procedures/model'

/** Etapas de um procedimento em linha: "Preparo · dente → Provisório · peça → Cimentação · peça ✓". */
export function StepChain({ procedure, className }: { procedure: ProcedureVM; className?: string }) {
  const steps = procedure.steps
  return (
    <span className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted', className)}>
      {steps.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span aria-hidden="true">→</span> : null}
          <span className={cn(!s.active && 'line-through')}>
            {isSingleStep(procedure) ? 'Etapa única' : s.name} · {UNIT_LABEL[s.unit].one}
            {s.completes ? <span className="ml-1 font-semibold text-ink" title="Conclui o tratamento">✓</span> : null}
            {s.requiresDescription ? <span className="ml-1">(descrição obrigatória)</span> : null}
          </span>
        </span>
      ))}
    </span>
  )
}
