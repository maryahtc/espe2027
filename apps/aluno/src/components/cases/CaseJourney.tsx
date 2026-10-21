import { cn } from '@portal/ui/cn'
import { IconCheck } from '@portal/ui/icons'
import type { ReactNode } from 'react'
import { type CaseStatus, type JourneyVisit, type RecordVM, sortTeeth, type StepOption } from '@/lib/cases/model'
import { day, formatDayMonth, monthShort, weekday, year } from '@/lib/dates'
import { ARCH_LABEL, unitText } from '@/lib/procedures/model'

const longDate = (d: string) => `${String(day(d)).padStart(2, '0')} ${monthShort(d).toUpperCase()} ${year(d)}`
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * Uma etapa dentro da consulta: nome da etapa (o procedimento já está acima), dentes/posições discretos, quantidade
 * quando acrescenta algo, ✓ da etapa que conclui e, em segundo plano, módulo e observação. Só dados já registrados.
 */
export function JourneyStep({ r, o, moduleName }: { r: RecordVM; o: StepOption | undefined; moduleName: string | null }) {
  const own = o && o.stepName !== o.procedureName
  // Quantidade só quando acrescenta algo (não repete "4 dentes" ao lado dos dentes, nem "2 arcadas" ao lado de "ambas").
  const qty = o && o.unit !== 'caso' && !(r.teeth.length && o.unit === 'dente') && !(r.arch && o.unit === 'arcada') ? unitText(o.unit, r.quantity) : null
  return (
    <span className="block min-w-0">
      {/* rótulo completo para leitores de tela (o procedimento visual fica no cabeçalho do grupo) */}
      <span className="sr-only">{o?.label ?? 'Procedimento'}: </span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('text-[15px]', own ? 'font-medium text-ink' : 'text-ink-2')} aria-hidden="true">
          {own ? o.stepName : (r.description ?? 'Realizado')}
        </span>
        {r.teeth.length ? <span className="num text-sm text-muted">· {sortTeeth(r.teeth).join(', ')}</span> : null}
        {r.arch ? <span className="text-sm text-muted">· Arcada {ARCH_LABEL[r.arch].toLowerCase()}</span> : null}
        {qty ? <span className="num text-xs text-muted">· {qty}</span> : null}
        {o?.completes ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]" title="Etapa que conclui o tratamento">
            <IconCheck size={13} /> <span className="sr-only">etapa final</span>
          </span>
        ) : null}
      </span>
      {r.description && own ? <span className="mt-0.5 block text-xs text-ink-2">{r.description}</span> : null}
      {r.note || moduleName ? (
        <span className="mt-0.5 block text-xs text-muted">
          {[moduleName, r.note].filter(Boolean).join(' · ')}
        </span>
      ) : null}
    </span>
  )
}

/**
 * Jornada do caso: uma linha vertical contínua com um marco por consulta (a data dos registros — nenhuma "consulta"
 * existe no banco), os procedimentos daquele dia e, subordinadas, as etapas. Termina no status real do caso.
 * Não é prontuário: sem evolução, diagnóstico, plano ou previsões. `renderStep` permite envolver cada etapa (edição).
 */
export function CaseJourney({
  visits,
  byStep,
  moduleName,
  status,
  concludedOn,
  renderStep,
}: {
  visits: JourneyVisit[]
  byStep: Map<string, StepOption>
  moduleName: (id: string | null) => string | null
  status: CaseStatus
  concludedOn: string | null
  renderStep?: (r: RecordVM, step: ReactNode) => ReactNode
}) {
  return (
    <ol className="relative" data-jornada>
      {/* linha contínua */}
      <span aria-hidden="true" className="absolute top-3 bottom-4 left-[7px] w-px bg-gradient-to-b from-[var(--brand)]/70 via-rule-strong to-rule-strong" />
      {visits.map((v) => (
        <li key={v.date} className="relative pb-12 pl-9 sm:pl-12" data-consulta={v.number}>
          <span aria-hidden="true" className="absolute top-[7px] left-0 size-[15px] rounded-full border-2 border-[var(--brand)] bg-[#0a0a0a] shadow-[0_0_14px_-2px_var(--brand)]" />
          <p className="num text-lg leading-none font-semibold tracking-[0.12em] sm:text-xl" data-data>
            {longDate(v.date)}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            <span className="eyebrow text-[10px]">Consulta {v.number}</span> · {cap(weekday(v.date))}
          </p>
          <div className="glass mt-4 space-y-5 rounded-2xl p-4 sm:p-5">
            {v.procedures.map((p) => (
              <div key={p.procedureId} data-procedimento-consulta={p.procedureName}>
                <p className="text-base font-semibold">{p.procedureName}</p>
                <ul className="mt-2 space-y-2 border-l border-rule-strong pl-4">
                  {p.records.map((r) => {
                    const step = <JourneyStep r={r} o={byStep.get(r.stepId)} moduleName={moduleName(r.moduleId)} />
                    return renderStep ? (
                      <li key={r.id} data-registro={r.id}>
                        {renderStep(r, step)}
                      </li>
                    ) : (
                      <li key={r.id} data-registro={r.id} className="py-0.5">
                        {step}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </li>
      ))}
      {/* fim da linha: só o status real do caso, nada previsto */}
      <li className="relative pl-9 sm:pl-12" data-jornada-fim={status}>
        {status === 'em_andamento' ? (
          <>
            <span aria-hidden="true" className="absolute top-[5px] left-[3px] size-[9px] rounded-full bg-rule-strong" />
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <span className="glow-dot !size-2" /> Em andamento
            </p>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="absolute top-0 left-0 flex size-[15px] items-center justify-center rounded-full bg-[var(--brand)] text-white">
              <IconCheck size={10} />
            </span>
            <p className="text-sm font-semibold">
              Caso concluído
              {concludedOn ? <span className="num font-normal text-muted"> · {formatDayMonth(concludedOn)}/{year(concludedOn)}</span> : null}
            </p>
          </>
        )}
      </li>
    </ol>
  )
}
