/**
 * Minha Produção (Etapa 7) — regras puras, testáveis sem banco. Tudo é DERIVADO dos registros da Etapa 6 no momento
 * da leitura: nada é gravado, nenhuma tabela nova. Vale igual para o aluno real e para o rascunho da simulação.
 *
 * Definições aprovadas em 21/10/2026:
 * - Registro válido: registro e caso não removidos, caso da turma atual do aluno.
 * - Posições de um registro (dados gravados no registro, não o catálogo atual): cada dente; arcada (ambas =
 *   superior + inferior); unidade caso = posição única "caso"; sem dente/arcada informados = unidades anônimas.
 * - Experiência clínica: chave distinta caso + data + etapa + posição (repetição real em outra data conta de novo).
 * - Tratamento concluído: só etapas que concluem; chave distinta caso + procedimento + posição; vale a data (e o módulo)
 *   da PRIMEIRA conclusão daquela unidade — repetir a etapa final depois não aumenta o número.
 * - Consulta clínica: par distinto caso + data. Caso clínico: caso com algum registro válido no recorte.
 * - Módulo efetivo: automático → recalculado pela data e pelo cronograma atual; corrigido pelo aluno → o gravado.
 * Não é prontuário: nada de condição, diagnóstico, comparação, ranking, meta ou previsão.
 */
import type { CaseStatus, CaseVM, ModuleSpan, RecordVM, StepOption } from '@/lib/cases/model'
import { moduleForDate } from '@/lib/cases/model'
import type { DentalArch } from '@/lib/procedures/model'

export type ArchSide = 'superior' | 'inferior'

/** Um registro válido, com o caso e o módulo efetivo. */
export type ValidRecord = RecordVM & { caseId: string; caseStatus: CaseStatus; effectiveModuleId: string | null }

/** Uma experiência (já sem duplicidade). */
export type ExperienceUnit = {
  key: string
  caseId: string
  date: string
  stepId: string
  procedureId: string
  moduleId: string | null
  tooth: number | null
  arch: DentalArch | null
  /** Unidade "caso" (sem posição a marcar). */
  caseLevel: boolean
  /** Sem dente/arcada informados: conta, mas não aparece no mapa. */
  anonymous: boolean
}

/** Um tratamento concluído (unidade distinta), na data e no módulo da primeira conclusão. */
export type CompletionUnit = { key: string; caseId: string; procedureId: string; date: string; moduleId: string | null }

// ─── Registros válidos e módulo efetivo ──────────────────────────────────────────────────────────

/** Módulo do registro: automático → pela data e pelo cronograma atual; manual → o que o aluno escolheu. */
export function effectiveModule(r: Pick<RecordVM, 'moduleAuto' | 'moduleId' | 'performedOn'>, spans: ModuleSpan[]): string | null {
  return r.moduleAuto ? (moduleForDate(spans, r.performedOn)?.id ?? null) : r.moduleId
}

/** Registros válidos da turma atual, em ordem (data, criação). Removidos/restaurados: lidos do estado atual. */
export function validRecords(cases: CaseVM[], cohortId: string, spans: ModuleSpan[]): ValidRecord[] {
  return cases
    .filter((c) => !c.removed && c.cohortId === cohortId)
    .flatMap((c) => c.records.filter((r) => !r.removed).map((r) => ({ ...r, caseId: c.id, caseStatus: c.status, effectiveModuleId: effectiveModule(r, spans) })))
    .sort((a, b) => a.performedOn.localeCompare(b.performedOn) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

// ─── Posições e unidades ─────────────────────────────────────────────────────────────────────────

const archSides = (a: DentalArch): ArchSide[] => (a === 'ambas' ? ['superior', 'inferior'] : [a])

type Position = { id: string; tooth: number | null; caseLevel: boolean }

/** Posições identificáveis do registro; null = sem posição informada (unidades anônimas pela quantidade). */
export function positions(r: Pick<RecordVM, 'teeth' | 'arch'>, unit: StepOption['unit'] | undefined): Position[] | null {
  if (r.teeth.length) return [...new Set(r.teeth)].map((t) => ({ id: `d${t}`, tooth: t, caseLevel: false }))
  if (r.arch) return archSides(r.arch).map((s) => ({ id: `a-${s}`, tooth: null, caseLevel: false }))
  if (unit === 'caso') return [{ id: 'caso', tooth: null, caseLevel: true }]
  return null
}

/** Experiências sem duplicidade: caso + data + etapa + posição. */
export function experienceUnits(records: ValidRecord[], byStep: Map<string, StepOption>): ExperienceUnit[] {
  const out = new Map<string, ExperienceUnit>()
  for (const r of records) {
    const o = byStep.get(r.stepId)
    const pos = positions(r, o?.unit)
    const base = { caseId: r.caseId, date: r.performedOn, stepId: r.stepId, procedureId: r.procedureId, moduleId: r.effectiveModuleId, arch: r.arch }
    if (pos) {
      for (const p of pos) {
        const key = `${r.caseId}|${r.performedOn}|${r.stepId}|${p.id}`
        if (!out.has(key)) out.set(key, { key, ...base, tooth: p.tooth, caseLevel: p.caseLevel, anonymous: false })
      }
    } else {
      for (let i = 0; i < r.quantity; i++) {
        const key = `${r.id}#${i}`
        out.set(key, { key, ...base, tooth: null, caseLevel: false, anonymous: true })
      }
    }
  }
  return [...out.values()]
}

/** Tratamentos concluídos: unidades distintas caso + procedimento + posição, na primeira conclusão. */
export function completionUnits(records: ValidRecord[], byStep: Map<string, StepOption>): CompletionUnit[] {
  const out = new Map<string, CompletionUnit>()
  // `records` já vem em ordem (data, criação): o primeiro a chegar é a primeira conclusão.
  for (const r of records) {
    const o = byStep.get(r.stepId)
    if (!o?.completes) continue
    const pos = positions(r, o.unit)
    const keys = pos ? pos.map((p) => `${r.caseId}|${r.procedureId}|${p.id}`) : Array.from({ length: r.quantity }, (_, i) => `${r.id}#${i}`)
    for (const key of keys) if (!out.has(key)) out.set(key, { key, caseId: r.caseId, procedureId: r.procedureId, date: r.performedOn, moduleId: r.effectiveModuleId })
  }
  return [...out.values()]
}

// ─── Anos do curso e filtros ─────────────────────────────────────────────────────────────────────

function addYears(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const ny = y + n
  const leap = (ny % 4 === 0 && ny % 100 !== 0) || ny % 400 === 0
  const dd = m === 2 && d === 29 && !leap ? 28 : d
  return `${ny}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}
function dayBefore(date: string): string {
  const t = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) - 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export type CourseYear = { index: number; start: string; end: string }

/** 1º ano: do início da turma à véspera do mesmo dia no ano seguinte; o último termina no fim da turma (pode ser menor). */
export function courseYears(cohort: { startsOn: string; endsOn: string }): CourseYear[] {
  const years: CourseYear[] = []
  for (let i = 0; ; i++) {
    const start = addYears(cohort.startsOn, i)
    if (start > cohort.endsOn) break
    const next = addYears(cohort.startsOn, i + 1)
    const end = dayBefore(next) < cohort.endsOn ? dayBefore(next) : cohort.endsOn
    years.push({ index: i + 1, start, end })
    if (i > 20) break
  }
  return years
}

/** Ano do curso de hoje: o que contém a data; antes do início = 1º; depois do fim = o último. */
export function currentCourseYear(years: CourseYear[], today: string): CourseYear | null {
  if (!years.length) return null
  return years.find((y) => y.start <= today && today <= y.end) ?? (today < years[0]!.start ? years[0]! : years.at(-1)!)
}

export type Period =
  | { kind: 'curso' }
  | { kind: 'ano'; year: CourseYear }
  | { kind: 'modulo'; moduleId: string }
  | { kind: 'periodo'; from: string; to: string }

export function inPeriod(p: Period, date: string, moduleId: string | null): boolean {
  switch (p.kind) {
    case 'curso':
      return true
    case 'ano':
      return p.year.start <= date && date <= p.year.end
    case 'modulo':
      return moduleId === p.moduleId
    case 'periodo':
      return p.from <= date && date <= p.to
  }
}

// ─── Indicadores ─────────────────────────────────────────────────────────────────────────────────

export type ProductionBase = {
  records: ValidRecord[]
  experiences: ExperienceUnit[]
  completions: CompletionUnit[]
}

export function productionBase(cases: CaseVM[], cohortId: string, spans: ModuleSpan[], options: StepOption[]): ProductionBase {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const records = validRecords(cases, cohortId, spans)
  return { records, experiences: experienceUnits(records, byStep), completions: completionUnits(records, byStep) }
}

/** O recorte do filtro (experiências pela data/módulo delas; concluídos pela primeira conclusão). */
export function slice(base: ProductionBase, p: Period): ProductionBase {
  return {
    records: base.records.filter((r) => inPeriod(p, r.performedOn, r.effectiveModuleId)),
    experiences: base.experiences.filter((e) => inPeriod(p, e.date, e.moduleId)),
    completions: base.completions.filter((c) => inPeriod(p, c.date, c.moduleId)),
  }
}

export type Summary = {
  cases: number
  casesInProgress: number
  casesConcluded: number
  visits: number
  experiences: number
  completions: number
  /** Informação secundária. */
  distinctProcedures: number
}

export function summary(s: ProductionBase): Summary {
  const cases = new Map<string, CaseStatus>()
  for (const r of s.records) cases.set(r.caseId, r.caseStatus)
  return {
    cases: cases.size,
    casesInProgress: [...cases.values()].filter((v) => v === 'em_andamento').length,
    casesConcluded: [...cases.values()].filter((v) => v === 'concluido').length,
    visits: new Set(s.records.map((r) => `${r.caseId}|${r.performedOn}`)).size,
    experiences: s.experiences.length,
    completions: s.completions.length,
    distinctProcedures: new Set(s.records.map((r) => r.procedureId)).size,
  }
}

// ─── Minha evolução (por mês) ────────────────────────────────────────────────────────────────────

export type MonthPoint = { month: string; experiences: number; completions: number; inFilter: boolean }

const monthOf = (date: string) => date.slice(0, 7)
function nextMonth(m: string): string {
  const [y, mm] = m.split('-').map(Number) as [number, number]
  return mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, '0')}`
}

/**
 * Do início da turma (ou do primeiro registro, se anterior) até o mês atual (limitado ao fim da turma, mas nunca antes
 * do último registro). Sempre o curso inteiro; `inFilter` destaca os meses com algo dentro do filtro.
 */
export function evolution(all: ProductionBase, filtered: ProductionBase, cohort: { startsOn: string; endsOn: string }, today: string): MonthPoint[] {
  const dates = [...all.experiences.map((e) => e.date), ...all.completions.map((c) => c.date)].sort()
  const first = [monthOf(cohort.startsOn), dates[0] ? monthOf(dates[0]) : null].filter(Boolean).sort()[0]!
  let last = monthOf(today < cohort.endsOn ? today : cohort.endsOn)
  if (dates.length && monthOf(dates.at(-1)!) > last) last = monthOf(dates.at(-1)!)
  if (last < first) return []
  const exp = new Map<string, number>()
  const comp = new Map<string, number>()
  for (const e of all.experiences) exp.set(monthOf(e.date), (exp.get(monthOf(e.date)) ?? 0) + 1)
  for (const c of all.completions) comp.set(monthOf(c.date), (comp.get(monthOf(c.date)) ?? 0) + 1)
  const marked = new Set([...filtered.experiences.map((e) => monthOf(e.date)), ...filtered.completions.map((c) => monthOf(c.date))])
  const out: MonthPoint[] = []
  for (let m = first; m <= last; m = nextMonth(m)) out.push({ month: m, experiences: exp.get(m) ?? 0, completions: comp.get(m) ?? 0, inFilter: marked.has(m) })
  return out
}

// ─── Categoria → procedimento → etapas ───────────────────────────────────────────────────────────

export type StepNode = { stepId: string; name: string; completes: boolean; experiences: number }
export type ProcedureNode = { procedureId: string; name: string; hasCompletion: boolean; experiences: number; completions: number; steps: StepNode[] }
export type CategoryNode = { name: string; experiences: number; completions: number; procedures: ProcedureNode[] }

export function categoryTree(s: ProductionBase, options: StepOption[]): CategoryNode[] {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const procInfo = new Map<string, StepOption>()
  for (const o of [...options].sort((a, b) => a.position - b.position)) if (!procInfo.has(o.procedureId)) procInfo.set(o.procedureId, o)
  const hasCompletion = (pid: string) => options.some((o) => o.procedureId === pid && o.completes)
  const pos = (pid: string) => procInfo.get(pid)?.position ?? Number.MAX_SAFE_INTEGER
  const cats = new Map<string, CategoryNode>()
  const procs = new Map<string, ProcedureNode>()
  for (const e of s.experiences) {
    const o = byStep.get(e.stepId)
    const catName = o?.categoryName || 'Outros'
    const cat = cats.get(catName) ?? { name: catName, experiences: 0, completions: 0, procedures: [] }
    cats.set(catName, cat)
    let p = procs.get(e.procedureId)
    if (!p) {
      p = { procedureId: e.procedureId, name: o?.procedureName ?? 'Procedimento', hasCompletion: hasCompletion(e.procedureId), experiences: 0, completions: 0, steps: [] }
      procs.set(e.procedureId, p)
      cat.procedures.push(p)
    }
    let st = p.steps.find((x) => x.stepId === e.stepId)
    if (!st) {
      st = { stepId: e.stepId, name: o?.stepName ?? 'Etapa', completes: !!o?.completes, experiences: 0 }
      p.steps.push(st)
    }
    st.experiences++
    p.experiences++
    cat.experiences++
  }
  for (const c of s.completions) {
    const p = procs.get(c.procedureId)
    if (!p) continue
    p.completions++
    const cat = [...cats.values()].find((x) => x.procedures.includes(p))
    if (cat) cat.completions++
  }
  const catPos = (c: CategoryNode) => Math.min(...c.procedures.map((p) => pos(p.procedureId)))
  for (const c of cats.values()) {
    c.procedures.sort((a, b) => b.experiences - a.experiences || pos(a.procedureId) - pos(b.procedureId))
    for (const p of c.procedures) p.steps.sort((a, b) => (byStep.get(a.stepId)?.position ?? 0) - (byStep.get(b.stepId)?.position ?? 0))
  }
  return [...cats.values()].sort((a, b) => b.experiences - a.experiences || catPos(a) - catPos(b))
}

// ─── Meu mapa clínico ────────────────────────────────────────────────────────────────────────────

export type ToothCell = {
  tooth: number
  experiences: number
  /** 0 = nenhuma; 1–4 = faixas relativas ao maior valor do PRÓPRIO aluno (só quantidade). */
  level: 0 | 1 | 2 | 3 | 4
  cases: number
  visits: number
  procedures: Array<{ procedureId: string; name: string; experiences: number; steps: Array<{ name: string; experiences: number }> }>
}

export function toothMap(s: ProductionBase, options: StepOption[]): Map<number, ToothCell> {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const groups = new Map<number, ExperienceUnit[]>()
  for (const e of s.experiences) if (e.tooth !== null) groups.set(e.tooth, [...(groups.get(e.tooth) ?? []), e])
  const max = Math.max(0, ...[...groups.values()].map((g) => g.length))
  const out = new Map<number, ToothCell>()
  for (const [tooth, list] of groups) {
    const procs = new Map<string, { procedureId: string; name: string; experiences: number; steps: Map<string, { name: string; experiences: number; position: number }> }>()
    for (const e of list) {
      const o = byStep.get(e.stepId)
      const p = procs.get(e.procedureId) ?? { procedureId: e.procedureId, name: o?.procedureName ?? 'Procedimento', experiences: 0, steps: new Map() }
      p.experiences++
      const st = p.steps.get(e.stepId) ?? { name: o?.stepName ?? 'Etapa', experiences: 0, position: o?.position ?? 0 }
      st.experiences++
      p.steps.set(e.stepId, st)
      procs.set(e.procedureId, p)
    }
    out.set(tooth, {
      tooth,
      experiences: list.length,
      level: Math.max(1, Math.ceil((4 * list.length) / max)) as 1 | 2 | 3 | 4,
      cases: new Set(list.map((e) => e.caseId)).size,
      visits: new Set(list.map((e) => `${e.caseId}|${e.date}`)).size,
      procedures: [...procs.values()]
        .sort((a, b) => b.experiences - a.experiences)
        .map((p) => ({ procedureId: p.procedureId, name: p.name, experiences: p.experiences, steps: [...p.steps.values()].sort((a, b) => a.position - b.position).map(({ name, experiences }) => ({ name, experiences })) })),
    })
  }
  return out
}

export type OffMap = {
  /** Registros por arcada, como registrados (sem distribuir entre dentes): nº de registros e experiências. */
  arch: Record<DentalArch, { records: number; experiences: number }>
  /** Experiências sem dente informado (contam, mas não estão no mapa). */
  unpositioned: number
  /** Experiências de etapas por caso (sem posição). */
  caseLevel: number
}

export function offMap(s: ProductionBase): OffMap {
  const arch: OffMap['arch'] = { superior: { records: 0, experiences: 0 }, inferior: { records: 0, experiences: 0 }, ambas: { records: 0, experiences: 0 } }
  const regs = new Set<string>()
  for (const e of s.experiences) {
    if (!e.arch || e.tooth !== null) continue
    arch[e.arch].experiences++
    const reg = `${e.caseId}|${e.date}|${e.stepId}|${e.arch}`
    if (!regs.has(reg)) {
      regs.add(reg)
      arch[e.arch].records++
    }
  }
  return { arch, unpositioned: s.experiences.filter((e) => e.anonymous).length, caseLevel: s.experiences.filter((e) => e.caseLevel).length }
}

// ─── Por módulo ──────────────────────────────────────────────────────────────────────────────────

export type ModuleRow = { moduleId: string | null; label: string; title: string; experiences: number; completions: number; topCategories: Array<{ name: string; experiences: number }> }

/**
 * Um bloco por módulo já iniciado (ou com produção), na ordem do cronograma, e "Sem módulo" se houver.
 * Usa o módulo efetivo (automático recalculado; correção manual respeitada).
 */
export function byModule(s: ProductionBase, options: StepOption[], modules: Array<ModuleSpan & { position?: number }>, today: string): ModuleRow[] {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const row = (moduleId: string | null, label: string, title: string): ModuleRow => {
    const exps = s.experiences.filter((e) => e.moduleId === moduleId)
    const cats = new Map<string, number>()
    for (const e of exps) {
      const name = byStep.get(e.stepId)?.categoryName || 'Outros'
      cats.set(name, (cats.get(name) ?? 0) + 1)
    }
    return {
      moduleId,
      label,
      title,
      experiences: exps.length,
      completions: s.completions.filter((c) => c.moduleId === moduleId).length,
      topCategories: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, experiences]) => ({ name, experiences })),
    }
  }
  const rows = modules.filter((m) => (m.start && m.start <= today) || s.experiences.some((e) => e.moduleId === m.id)).map((m) => row(m.id, m.label, m.title))
  const none = row(null, '—', 'Sem módulo')
  return none.experiences || none.completions ? [...rows, none] : rows
}

// ─── Áreas para explorar (fatos, sem classificação) ──────────────────────────────────────────────

export type ExploreArea = {
  /** Categorias do catálogo sem nenhum registro no curso. */
  categories: Array<{ name: string; procedures: Array<{ procedureId: string; name: string }> }>
  /** Procedimentos sem registro dentro de categorias que já têm registro. */
  procedures: Array<{ category: string; procedureId: string; name: string }>
}

/**
 * Sempre sobre o curso inteiro (não o filtro). Só procedimentos ativos do catálogo; "Outro procedimento" (descrição
 * livre) fica de fora. Sem metas, cortes ou alertas: só "ainda sem registro".
 */
export function exploreAreas(all: ProductionBase, options: StepOption[]): ExploreArea {
  const done = new Set(all.records.map((r) => r.procedureId))
  const procs = new Map<string, { procedureId: string; name: string; category: string; position: number }>()
  for (const o of [...options].sort((a, b) => a.position - b.position)) {
    if (!o.active || o.requiresDescription || procs.has(o.procedureId)) continue
    procs.set(o.procedureId, { procedureId: o.procedureId, name: o.procedureName, category: o.categoryName || 'Outros', position: o.position })
  }
  const byCat = new Map<string, Array<{ procedureId: string; name: string }>>()
  for (const p of procs.values()) byCat.set(p.category, [...(byCat.get(p.category) ?? []), { procedureId: p.procedureId, name: p.name }])
  const doneCats = new Set([...procs.values()].filter((p) => done.has(p.procedureId)).map((p) => p.category))
  const categories = [...byCat.entries()].filter(([c]) => !doneCats.has(c)).map(([name, list]) => ({ name, procedures: list }))
  const procedures = [...procs.values()].filter((p) => doneCats.has(p.category) && !done.has(p.procedureId)).map((p) => ({ category: p.category, procedureId: p.procedureId, name: p.name }))
  return { categories, procedures }
}
