/**
 * Filtro de período da Minha Produção (Etapa 7), lido do endereço. Compartilhado com a Visão da turma e a produção
 * individual (Etapa 10) para que os filtros sejam exatamente os mesmos. Puro, sem banco.
 */
import { type ModuleSpan, moduleForDate } from '@/lib/cases/model'
import { formatDayMonth, monthShort, year } from '@/lib/dates'
import { type CourseYear, courseYears, currentCourseYear, type Period } from './model'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const monthYear = (d: string) => `${monthShort(d)}/${year(d)}`

export type PeriodParams = { filtro?: string; de?: string; ate?: string }

export type ResolvedPeriod = {
  period: Period
  label: string
  /** Algum filtro diferente de "Todo o curso". */
  filtered: boolean
  /** Filtro pedido no endereço ('curso' quando nenhum). */
  key: string
  thisYear: CourseYear | null
  thisModule: ModuleSpan | null
}

export function resolvePeriod(sp: PeriodParams, cohort: { startsOn: string; endsOn: string }, spans: ModuleSpan[], today: string): ResolvedPeriod {
  const thisYear = currentCourseYear(courseYears(cohort), today)
  const thisModule = moduleForDate(spans, today)
  let period: Period = { kind: 'curso' }
  let label = 'Todo o curso'
  if (sp.filtro === 'ano' && thisYear) {
    period = { kind: 'ano', year: thisYear }
    label = `${thisYear.index}º ano do curso · ${monthYear(thisYear.start)}–${monthYear(thisYear.end)}`
  } else if (sp.filtro === 'modulo' && thisModule) {
    period = { kind: 'modulo', moduleId: thisModule.id }
    label = `Módulo ${thisModule.label} · ${thisModule.title}`
  } else if (sp.filtro === 'periodo' && sp.de && sp.ate && ISO.test(sp.de) && ISO.test(sp.ate)) {
    const [from, to] = sp.de <= sp.ate ? [sp.de, sp.ate] : [sp.ate, sp.de]
    period = { kind: 'periodo', from, to }
    label = `${formatDayMonth(from)}/${year(from)} a ${formatDayMonth(to)}/${year(to)}`
  }
  return { period, label, filtered: period.kind !== 'curso', key: sp.filtro ?? 'curso', thisYear, thisModule }
}

/** Parâmetros do filtro para repetir em outros links da página (ordenação, turma…). */
export function periodQuery(r: ResolvedPeriod): Record<string, string> {
  if (r.period.kind === 'periodo') return { filtro: 'periodo', de: r.period.from, ate: r.period.to }
  if (r.period.kind === 'curso') return {}
  return { filtro: r.period.kind }
}
