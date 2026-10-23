import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { PlanAction } from '@/components/plans/PlanAction'
import { hasOwnStepName, type RecordVM, sortTeeth, type StepOption, usesPositions } from '@/lib/cases/model'
import { formatDayMonth, year } from '@/lib/dates'
import { carryPlanItem, deletePlanVisit, linkPlanVisit, movePlanVisit, unlinkPlanVisit } from '@/lib/plans/actions'
import { compareVisit, displayOrder, type ItemComparison, type ItemStatus, type PlanItem, type PlanVisit } from '@/lib/plans/model'
import { ARCH_LABEL, unitText } from '@/lib/procedures/model'

export const PLAN_NOTICE = 'Planejamento de estudo do caso. Não é prontuário nem agenda; o plano clínico oficial fica no Smile Cloud.'

const arrow = 'w-11 justify-center rounded-full border border-rule-strong text-base no-underline hover:border-ink hover:no-underline'
const ddmm = (d: string) => `${formatDayMonth(d)}/${year(d)}`
const posLabel = (p: string) => (p.startsWith('d') ? p.slice(1) : p === 'caso' ? 'caso' : p.slice(2))

/** Resultado calculado do item: forma + texto, na cor do texto (nunca o vermelho da marca). */
const STATUS: Record<ItemStatus, { mark: string; text: string }> = {
  planejado: { mark: '✓', text: 'registrado como planejado' },
  parcial: { mark: '◐', text: 'registrado em parte' },
  nao_registrado: { mark: '○', text: 'não registrado nesta consulta' },
}

/** ✓ ◐ ○ desenhados (a fonte do portal não tem ◐), na cor do texto — nunca o vermelho da marca. */
function Mark({ status }: { status: ItemStatus }) {
  return (
    <span aria-hidden="true" data-simbolo={STATUS[status].mark} className="mt-1 flex size-4 shrink-0 items-center justify-center text-ink">
      {status === 'planejado' ? (
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      ) : (
        <span className="block size-3.5 rounded-full border-[1.5px] border-current" style={status === 'parcial' ? { background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)' } : undefined} />
      )}
    </span>
  )
}

function ItemLine({ item, o }: { item: PlanItem; o: StepOption | undefined }) {
  const own = o && hasOwnStepName(o)
  const positions = usesPositions(o)
  return (
    <span className="block min-w-0">
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('text-[15px]', own ? 'text-ink' : 'text-ink-2')}>{own ? o.stepName : (item.description ?? 'Planejado')}</span>
        {item.teeth.length ? (
          <span className="num text-sm text-muted">
            · {positions ? 'posições ' : ''}
            {sortTeeth(item.teeth).join(', ')}
          </span>
        ) : null}
        {item.arch ? <span className="text-sm text-muted">· Arcada {ARCH_LABEL[item.arch].toLowerCase()}</span> : null}
        {!item.teeth.length && !item.arch && o && o.unit !== 'caso' ? <span className="num text-xs text-muted">· {unitText(o.unit, item.quantity)}</span> : null}
      </span>
      {own && item.description ? <span className="mt-0.5 block text-xs text-ink-2">{item.description}</span> : null}
    </span>
  )
}

/** Itens agrupados pelo procedimento (como na Jornada), na ordem do aluno. */
function grouped<T extends { item: PlanItem }>(rows: T[], byStep: Map<string, StepOption>) {
  const out = new Map<string, { name: string; rows: T[] }>()
  for (const r of rows) {
    const name = byStep.get(r.item.stepId)?.procedureName ?? 'Procedimento'
    const g = out.get(r.item.procedureId) ?? { name, rows: [] }
    g.rows.push(r)
    out.set(r.item.procedureId, g)
  }
  return [...out.entries()]
}

function Compared({ c, o, visitId, actions }: { c: ItemComparison; o: StepOption | undefined; visitId: string; actions: boolean }) {
  const st = STATUS[c.status]
  return (
    <div className="flex items-start gap-2.5" data-item-plano={c.item.id} data-resultado={c.status}>
      <Mark status={c.status} />
      <span className="min-w-0 flex-1">
        <ItemLine item={c.item} o={o} />
        <span className="mt-0.5 block text-xs text-muted">
          {st.text}
          {c.status === 'parcial' && c.planned.length ? ` · registrado: ${c.registered.map(posLabel).join(', ')} de ${c.planned.map(posLabel).join(', ')}` : ''}
          {c.status === 'parcial' && !c.planned.length ? ` · registrado ${c.registeredQuantity} de ${c.plannedQuantity}` : ''}
        </span>
        {actions && c.status !== 'planejado' ? (
          <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1" data-acoes-faltante>
            <PlanAction action={carryPlanItem} fields={{ id: visitId, item: c.item.id, modo: 'proxima' }} label="Levar para a próxima consulta planejada" data="levar-proxima" className="text-xs" />
            <PlanAction action={carryPlanItem} fields={{ id: visitId, item: c.item.id, modo: 'nova' }} label="Planejar em nova consulta" data="planejar-nova" className="text-xs" />
          </span>
        ) : null}
      </span>
    </div>
  )
}

/**
 * Planejamento do caso (Etapa 8): o que o aluno pretende fazer — separado da Jornada (o que aconteceu). Linha
 * tracejada, marcadores vazados, sem ✓ vermelho nem preenchimento da marca. O resultado de uma consulta vinculada é
 * sempre calculado dos registros reais ativos daquela data. `editable=false` → somente leitura (coordenação/Admin,
 * caso concluído, turma encerrada).
 */
export function CasePlan({
  caseId,
  visits,
  records,
  options,
  editable,
  link,
  staff = false,
}: {
  caseId: string
  visits: PlanVisit[]
  records: RecordVM[]
  options: StepOption[]
  editable: boolean
  link?: string | null
  staff?: boolean
}) {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const ordered = displayOrder(visits)
  const linkedDates = new Set(visits.map((v) => v.realizedOn).filter(Boolean))
  const eligible = [...new Set(records.filter((r) => !r.removed).map((r) => r.performedOn))].filter((d) => !linkedDates.has(d)).sort()
  const planned = ordered.filter((v) => !v.realizedOn)

  return (
    <div data-planejamento>
      <p className="mb-6 rounded-2xl border border-dashed border-rule-strong px-4 py-3 text-xs text-muted" data-aviso-planejamento>
        {PLAN_NOTICE}
      </p>
      {link === 'ok' ? (
        <p role="status" className="mb-4 text-sm" data-vinculo="ok">
          A consulta planejada foi vinculada à consulta registrada. O resultado abaixo é calculado dos registros reais.
        </p>
      ) : link === 'falhou' ? (
        <p role="status" className="mb-4 text-sm font-semibold" data-vinculo="falhou">
          Os registros foram salvos, mas não foi possível vincular a consulta planejada. Use “Vincular a uma consulta já registrada”.
        </p>
      ) : null}

      {ordered.length ? (
        <ol className="relative" data-plano-lista>
          {/* linha tracejada: o que se pretende fazer */}
          <span aria-hidden="true" className="absolute top-3 bottom-4 left-[7px] border-l border-dashed border-rule-strong" />
          {ordered.map((v) => {
            const cmp = compareVisit(v, records, options)
            const idx = planned.findIndex((x) => x.id === v.id)
            return (
              <li key={v.id} className="relative pb-10 pl-9 sm:pl-12" data-plano-consulta={v.id} data-estado={v.realizedOn ? 'vinculada' : 'planejada'}>
                <span
                  aria-hidden="true"
                  className={cn('absolute top-[5px] left-0 size-[15px] rounded-full border-2 bg-[#0a0a0a]', v.realizedOn ? 'border-ink-2' : 'border-dashed border-muted')}
                />
                <p className="eyebrow text-[10px] text-muted">Planejado</p>
                <p className="mt-1 text-lg font-light" data-titulo-consulta>
                  {v.realizedOn ? (
                    <>
                      Consulta vinculada · <span className="num">{ddmm(v.realizedOn)}</span>
                    </>
                  ) : (
                    `Consulta planejada ${v.number}`
                  )}
                </p>
                {v.realizedOn ? (
                  <Link href={`${staff ? '' : `/casos/${caseId}`}#linha-do-tempo`} className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
                    ver na Jornada
                  </Link>
                ) : null}

                <div className="mt-3 space-y-4 rounded-2xl border border-dashed border-rule-strong p-4">
                  {cmp?.noRecords ? (
                    <p className="text-sm font-semibold" data-sem-registros>
                      Nenhum registro ativo em {ddmm(v.realizedOn!)}. Os registros dessa data foram excluídos ou mudaram de data.
                    </p>
                  ) : null}
                  {cmp
                    ? grouped(cmp.items, byStep).map(([pid, g]) => (
                        <div key={pid}>
                          <p className="text-base font-semibold">{g.name}</p>
                          <div className="mt-2 space-y-2 border-l border-dashed border-rule-strong pl-4">
                            {g.rows.map((c) => (
                              <Compared key={c.item.id} c={c} o={byStep.get(c.item.stepId)} visitId={v.id} actions={editable} />
                            ))}
                          </div>
                        </div>
                      ))
                    : grouped(v.items.map((item) => ({ item })), byStep).map(([pid, g]) => (
                        <div key={pid}>
                          <p className="text-base font-semibold">{g.name}</p>
                          <ul className="mt-2 space-y-1.5 border-l border-dashed border-rule-strong pl-4">
                            {g.rows.map(({ item }) => (
                              <li key={item.id} data-item-plano={item.id}>
                                <ItemLine item={item} o={byStep.get(item.stepId)} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  {cmp?.extras.length ? (
                    <div data-tambem>
                      <p className="text-xs font-semibold text-muted">+ também realizado nesta consulta</p>
                      <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
                        {cmp.extras.map((x) => (
                          <li key={x.record.id}>
                            + {byStep.get(x.record.stepId)?.label ?? 'Procedimento'}
                            {x.positions.length ? <span className="num text-muted"> · {x.positions.map(posLabel).join(', ')}</span> : null}
                            {!x.positions.length && x.record.teeth.length ? <span className="num text-muted"> · {sortTeeth(x.record.teeth).join(', ')}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {v.note ? (
                    <p className="text-xs text-muted" data-observacao-plano>
                      Observação do planejamento: {v.note}
                    </p>
                  ) : null}
                </div>

                {editable ? (
                  v.realizedOn ? (
                    <div className="mt-3">
                      <PlanAction action={unlinkPlanVisit} fields={{ id: v.id }} label="Desfazer vínculo" data="desfazer-vinculo" />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/casos/novo?caso=${caseId}&plano=${v.id}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-ink px-4 text-sm font-semibold hover:bg-white/[0.06]"
                          data-registrar-realizado
                        >
                          Registrar o que foi realizado
                        </Link>
                        <Link href={`/casos/${caseId}/planejamento/${v.id}`} className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-sm hover:border-ink" data-editar-plano>
                          Editar
                        </Link>
                        <span className="inline-flex items-center gap-1">
                          <PlanAction action={movePlanVisit} fields={{ id: v.id, para: 'up' }} label="↑" ariaLabel="Subir consulta planejada" data="subir" className={cn(arrow, idx === 0 && 'invisible')} />
                          <PlanAction action={movePlanVisit} fields={{ id: v.id, para: 'down' }} label="↓" ariaLabel="Descer consulta planejada" data="descer" className={cn(arrow, idx === planned.length - 1 && 'invisible')} />
                        </span>
                      </div>
                      <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
                        {eligible.length ? (
                          <details className="text-sm" data-vincular>
                            <summary className="min-h-9 cursor-pointer py-1 text-muted hover:text-ink">Vincular a uma consulta já registrada</summary>
                            <ActionForm action={linkPlanVisit} submit="Vincular" row silent className="mt-2">
                              <input type="hidden" name="id" value={v.id} />
                              <select name="data" aria-label="Consulta registrada" className="field min-h-11 px-3 text-sm">
                                {eligible.map((d) => (
                                  <option key={d} value={d}>
                                    Consulta de {ddmm(d)}
                                  </option>
                                ))}
                              </select>
                            </ActionForm>
                          </details>
                        ) : null}
                        <PlanAction action={deletePlanVisit} fields={{ id: v.id }} label="Excluir consulta planejada" data="excluir-plano" className="text-xs" confirmText="Excluir esta consulta planejada? Os registros reais não mudam." />
                      </div>
                    </div>
                  )
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted" data-plano-vazio>
          Nenhuma consulta planejada.
        </p>
      )}

      {editable && planned.length < 20 ? (
        <Link href={`/casos/${caseId}/planejamento/nova`} className="inline-flex min-h-11 items-center rounded-full border border-dashed border-rule-strong px-5 text-sm font-semibold hover:border-ink" data-planejar>
          + Planejar consulta
        </Link>
      ) : null}
    </div>
  )
}
