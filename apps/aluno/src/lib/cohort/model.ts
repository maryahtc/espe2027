/**
 * Etapa 10 — Visão da turma (coordenação/Admin). Regras puras, sem banco.
 *
 * Reaproveita EXATAMENTE as definições da Etapa 7 (Minha Produção): para cada aluno roda-se `productionBase` e
 * `slice` sobre os próprios casos dele, e a turma é a união desses resultados. Como experiências, consultas e
 * tratamentos concluídos são sempre de um caso, e cada caso tem um único dono, a união não conta nada duas vezes:
 * os números da turma batem com a Minha Produção de cada aluno. Nada aqui altera as regras da Etapa 7.
 *
 * Sem ranking, metas, cores de desempenho ou classificação: só fatos. Ausência de registro no portal não significa
 * ausência de atividade clínica.
 */
import type { CaseVM, ModuleSpan, StepOption } from '@/lib/cases/model'
import { categoryTree, evolution, type MonthPoint, type Period, type ProductionBase, productionBase, slice, summary, type Summary } from '@/lib/production/model'

export type CohortStudent = { id: string; name: string; active: boolean }
export type OwnedCase = CaseVM & { ownerId: string }

/** Produção de um aluno: o curso inteiro (`all`) e o recorte do filtro (`sliced`). */
export type StudentProduction = { student: CohortStudent; all: ProductionBase; sliced: ProductionBase }

const EMPTY: ProductionBase = { records: [], experiences: [], completions: [] }

/**
 * Base de cada aluno MATRICULADO na turma (matrícula ativa ou inativa), com as regras da Etapa 7. Casos de quem não é
 * aluno matriculado nesta turma não entram (não há denominador para eles).
 */
export function studentProductions(
  students: CohortStudent[],
  cases: OwnedCase[],
  cohortId: string,
  spans: ModuleSpan[],
  options: StepOption[],
  period: Period,
): StudentProduction[] {
  const byOwner = new Map<string, OwnedCase[]>()
  for (const c of cases) byOwner.set(c.ownerId, [...(byOwner.get(c.ownerId) ?? []), c])
  return students.map((student) => {
    const all = productionBase(byOwner.get(student.id) ?? [], cohortId, spans, options)
    return { student, all, sliced: slice(all, period) }
  })
}

/** União das bases (chaves sempre incluem o caso, então não há colisão entre alunos). */
export function merge(bases: ProductionBase[]): ProductionBase {
  return bases.reduce<ProductionBase>(
    (acc, b) => ({ records: [...acc.records, ...b.records], experiences: [...acc.experiences, ...b.experiences], completions: [...acc.completions, ...b.completions] }),
    EMPTY,
  )
}

// ─── Cobertura dos registros (denominadores) ─────────────────────────────────────────────────────

export type Split = { total: number; active: number; inactive: number }
export type Coverage = { enrolled: Split; withRecords: Split; withoutRecords: Split }

const split = (list: StudentProduction[]): Split => ({
  total: list.length,
  active: list.filter((p) => p.student.active).length,
  inactive: list.filter((p) => !p.student.active).length,
})

/**
 * Matriculados = alunos da turma (matrícula ativa ou inativa — situação ATUAL, o banco não guarda histórico).
 * Com registro = pelo menos um registro válido no período. Sem registro = matriculados − com registro.
 */
export function coverage(list: StudentProduction[]): Coverage {
  const withRec = list.filter((p) => p.sliced.records.length > 0)
  const without = list.filter((p) => p.sliced.records.length === 0)
  return { enrolled: split(list), withRecords: split(withRec), withoutRecords: split(without) }
}

// ─── Indicadores e evolução ──────────────────────────────────────────────────────────────────────

/** Indicadores da turma no período: as mesmas contas da Etapa 7, sobre a união dos alunos. */
export function cohortSummary(list: StudentProduction[]): Summary {
  return summary(merge(list.map((p) => p.sliced)))
}

/** Evolução mensal da turma (soma dos alunos), com os meses do filtro em destaque — mesma regra da Etapa 7. */
export function cohortEvolution(list: StudentProduction[], cohort: { startsOn: string; endsOn: string }, today: string): MonthPoint[] {
  return evolution(merge(list.map((p) => p.all)), merge(list.map((p) => p.sliced)), cohort, today)
}

// ─── Panorama de experiências clínicas ───────────────────────────────────────────────────────────

export type PanoramaStep = { stepId: string; name: string; completes: boolean; students: number; experiences: number }
export type PanoramaProcedure = { procedureId: string; name: string; students: number; experiences: number; completions: number; hasCompletion: boolean; steps: PanoramaStep[] }
export type PanoramaCategory = { name: string; students: number; experiences: number; completions: number; procedures: PanoramaProcedure[] }
export type Panorama = {
  categories: PanoramaCategory[]
  /** Procedimentos ATIVOS do catálogo sem registro no período (seção recolhida, sem juízo de valor). */
  withoutRecords: Array<{ category: string; procedures: Array<{ procedureId: string; name: string }> }>
}

/**
 * Categoria → procedimento → etapa, com quantos ALUNOS registraram cada um, experiências e tratamentos concluídos
 * (contagens da Etapa 7). Ordem do catálogo — nunca "mais" ou "menos" realizados. Nada é classificado como lacuna.
 */
export function panorama(list: StudentProduction[], options: StepOption[]): Panorama {
  const tree = categoryTree(merge(list.map((p) => p.sliced)), options)
  const byProc = new Map<string, Set<string>>()
  const byStep = new Map<string, Set<string>>()
  for (const p of list)
    for (const e of p.sliced.experiences) {
      byProc.set(e.procedureId, (byProc.get(e.procedureId) ?? new Set()).add(p.student.id))
      byStep.set(e.stepId, (byStep.get(e.stepId) ?? new Set()).add(p.student.id))
    }
  const stepPos = new Map(options.map((o) => [o.stepId, o.position]))
  const procPos = new Map<string, number>()
  for (const o of options) procPos.set(o.procedureId, Math.min(procPos.get(o.procedureId) ?? Number.MAX_SAFE_INTEGER, o.position))
  const pos = (pid: string) => procPos.get(pid) ?? Number.MAX_SAFE_INTEGER

  const categories = tree
    .map((c) => {
      const procedures = c.procedures
        .map((p) => ({
          procedureId: p.procedureId,
          name: p.name,
          students: byProc.get(p.procedureId)?.size ?? 0,
          experiences: p.experiences,
          completions: p.completions,
          hasCompletion: p.hasCompletion,
          steps: p.steps
            .map((s) => ({ stepId: s.stepId, name: s.name, completes: s.completes, students: byStep.get(s.stepId)?.size ?? 0, experiences: s.experiences }))
            .sort((a, b) => (stepPos.get(a.stepId) ?? 0) - (stepPos.get(b.stepId) ?? 0)),
        }))
        .sort((a, b) => pos(a.procedureId) - pos(b.procedureId))
      const students = new Set(c.procedures.flatMap((p) => [...(byProc.get(p.procedureId) ?? [])]))
      return { name: c.name, students: students.size, experiences: c.experiences, completions: c.completions, procedures }
    })
    .sort((a, b) => Math.min(...a.procedures.map((p) => pos(p.procedureId))) - Math.min(...b.procedures.map((p) => pos(p.procedureId))))

  // Procedimentos ativos (ao menos uma etapa ativa de procedimento ativo) que ninguém registrou no período.
  const seen = new Set(categories.flatMap((c) => c.procedures.map((p) => p.procedureId)))
  const groups = new Map<string, Map<string, { procedureId: string; name: string; position: number }>>()
  for (const o of [...options].sort((a, b) => a.position - b.position)) {
    if (!o.active || seen.has(o.procedureId)) continue
    const cat = o.categoryName || 'Outros'
    const g = groups.get(cat) ?? new Map()
    if (!g.has(o.procedureId)) g.set(o.procedureId, { procedureId: o.procedureId, name: o.procedureName, position: o.position })
    groups.set(cat, g)
  }
  const withoutRecords = [...groups.entries()]
    .map(([category, g]) => ({ category, procedures: [...g.values()].sort((a, b) => a.position - b.position), first: Math.min(...[...g.values()].map((p) => p.position)) }))
    .sort((a, b) => a.first - b.first)
    .map(({ category, procedures }) => ({ category, procedures: procedures.map(({ procedureId, name }) => ({ procedureId, name })) }))

  return { categories, withoutRecords }
}

// ─── Dificuldades por tema ───────────────────────────────────────────────────────────────────────

export type DifficultyRow = { topicId: string; name: string; cases: number; students: number }

/**
 * Temas marcados na reflexão dos casos com pelo menos um registro válido no período: quantos casos e quantos alunos.
 * O texto livre da dificuldade não sai daqui (fica na leitura do caso, auditada).
 */
export function difficulties(list: StudentProduction[], caseTopics: Map<string, string[]>, topicName: Map<string, string>): DifficultyRow[] {
  const cases = new Map<string, Set<string>>()
  const students = new Map<string, Set<string>>()
  for (const p of list) {
    const ids = new Set(p.sliced.records.map((r) => r.caseId))
    for (const caseId of ids)
      for (const t of caseTopics.get(caseId) ?? []) {
        cases.set(t, (cases.get(t) ?? new Set()).add(caseId))
        students.set(t, (students.get(t) ?? new Set()).add(p.student.id))
      }
  }
  return [...cases.entries()]
    .map(([topicId, set]) => ({ topicId, name: topicName.get(topicId) ?? 'Tema', cases: set.size, students: students.get(topicId)?.size ?? 0 }))
    .sort((a, b) => b.cases - a.cases || a.name.localeCompare(b.name, 'pt-BR'))
}

// ─── Tabela de alunos ────────────────────────────────────────────────────────────────────────────

export type StudentRow = {
  id: string
  name: string
  active: boolean
  cases: number
  visits: number
  experiences: number
  completions: number
  /** Data do registro válido mais recente no CURSO INTEIRO (contexto, mesmo sem registro no período). */
  lastRecord: string | null
}

export function studentRows(list: StudentProduction[]): StudentRow[] {
  return list.map((p) => {
    const s = summary(p.sliced)
    const last = p.all.records.reduce<string | null>((m, r) => (!m || r.performedOn > m ? r.performedOn : m), null)
    return { id: p.student.id, name: p.student.name, active: p.student.active, cases: s.cases, visits: s.visits, experiences: s.experiences, completions: s.completions, lastRecord: last }
  })
}

export const SORT_KEYS = ['nome', 'situacao', 'casos', 'consultas', 'experiencias', 'concluidos', 'ultimo'] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type SortDir = 'asc' | 'desc'

/** Ordenação por qualquer coluna; padrão alfabético. Empates sempre por nome (nunca uma "posição"). */
export function sortRows(rows: StudentRow[], key: SortKey = 'nome', dir: SortDir = 'asc'): StudentRow[] {
  const byName = (a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name, 'pt-BR')
  const value = (r: StudentRow): number | string => {
    switch (key) {
      case 'nome':
        return r.name
      case 'situacao':
        return r.active ? 0 : 1
      case 'casos':
        return r.cases
      case 'consultas':
        return r.visits
      case 'experiencias':
        return r.experiences
      case 'concluidos':
        return r.completions
      case 'ultimo':
        return r.lastRecord ?? ''
    }
  }
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'nome') return sign * byName(a, b)
    const va = value(a)
    const vb = value(b)
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sign * cmp || byName(a, b)
  })
}

// ─── Contexto do cronograma ──────────────────────────────────────────────────────────────────────

/** Só contexto: quantos módulos publicados já terminaram no cronograma. Nada é deduzido a partir disso. */
export function modulesContext(modules: Array<{ end: string | null }>, today: string): { done: number; total: number } {
  return { done: modules.filter((m) => !!m.end && m.end < today).length, total: modules.length }
}
