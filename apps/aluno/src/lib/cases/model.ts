/**
 * Meus casos (Etapa 6) — regras puras, testáveis sem banco.
 * As validações espelham as do banco (o banco confere de novo): o Conexo não é prontuário.
 */
import { archQuantity, type CountUnit, type DentalArch, type StepLocation } from '@/lib/procedures/model'

export type CaseStatus = 'em_andamento' | 'concluido'

/** Uma opção do registro = uma etapa clínica, já com o procedimento ("Laminado cerâmico · Cimentação"). */
export type StepOption = {
  stepId: string
  procedureId: string
  /** Identificador estável do procedimento no catálogo (só leitura; usado nos atalhos padrão). */
  procedureSlug: string
  procedureName: string
  stepName: string
  label: string
  unit: CountUnit
  completes: boolean
  requiresDescription: boolean
  /** O que se identifica no registro: posições FDI, arcada ou nada. */
  location: StepLocation
  categoryName: string
  /** Nome do procedimento, da etapa e sinônimos, normalizados (sem acento, minúsculas). */
  search: string
  position: number
  /** Etapa e procedimento ativos (aparecem no registro). Desativados continuam legíveis nos registros antigos. */
  active: boolean
}

export type RecordVM = {
  id: string
  stepId: string
  procedureId: string
  performedOn: string
  quantity: number
  teeth: number[]
  arch: DentalArch | null
  moduleId: string | null
  moduleAuto: boolean
  note: string | null
  description: string | null
  removed: boolean
  createdAt: string
}

export type CaseVM = {
  id: string
  cohortId: string
  patientLabel: string
  title: string | null
  status: CaseStatus
  startedOn: string | null
  lastActivityOn: string | null
  concludedOn: string | null
  supervisorId: string | null
  smileCloudUrl: string | null
  difficulty: string | null
  ease: string | null
  differently: string | null
  /** Caminho da foto de capa no Storage privado (nunca um endereço público). */
  coverPath: string | null
  removed: boolean
  createdAt: string
  topicIds: string[]
  records: RecordVM[]
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Privacidade (mesmas regras do banco) ────────────────────────────────────────────────────────

/** CPF, telefone ou sequência longa de dígitos. */
export function hasPersonalIdentifier(text: string | null | undefined): boolean {
  const t = text ?? ''
  return /[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}/.test(t) || /\(?[0-9]{2}\)?[ .-]?9?[0-9]{4}[ .-]?[0-9]{4}/.test(t) || /[0-9]{8,}/.test(t)
}

/** Identificação do paciente: iniciais ou código (até 12), nunca formato de nome, CPF ou telefone. Devolve o erro ou null. */
export function patientLabelError(label: string): string | null {
  const v = label.trim()
  if (!v) return 'Informe as iniciais ou o código do paciente.'
  if (v.length > 12) return 'Use no máximo 12 caracteres (iniciais ou código).'
  if (/[A-Za-zÀ-ÿ]{3,}\s+[A-Za-zÀ-ÿ]{3,}/.test(v) || /[A-Za-zÀ-ÿ]{6,}/.test(v)) return 'Parece um nome. Use só as iniciais (ex.: M.A.S.) ou o código.'
  if (hasPersonalIdentifier(v)) return 'Não use CPF, telefone ou documento. Use iniciais ou código.'
  return null
}

// ─── Busca e atalhos ─────────────────────────────────────────────────────────────────────────────

/** Busca por nome e sinônimos: todas as palavras digitadas precisam aparecer; começo do nome vem primeiro. */
export function searchOptions(options: StepOption[], query: string, limit = 8): StepOption[] {
  const q = normalize(query)
  if (!q) return []
  const words = q.split(' ')
  return options
    .filter((o) => words.every((w) => o.search.includes(w)))
    .sort((a, b) => {
      const pa = normalize(a.label).startsWith(q) ? 0 : 1
      const pb = normalize(b.label).startsWith(q) ? 0 : 1
      return pa - pb || a.position - b.position
    })
    .slice(0, limit)
}

/** Atalhos: as etapas que o aluno mais registrou (empate: a mais recente). */
export function topOptions(options: StepOption[], history: Array<{ stepId: string; createdAt: string }>, n = 6): StepOption[] {
  const stats = new Map<string, { count: number; last: string }>()
  for (const h of history) {
    const s = stats.get(h.stepId) ?? { count: 0, last: '' }
    s.count++
    if (h.createdAt > s.last) s.last = h.createdAt
    stats.set(h.stepId, s)
  }
  const byId = new Map(options.map((o) => [o.stepId, o]))
  return [...stats.entries()]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1].count - a[1].count || b[1].last.localeCompare(a[1].last))
    .slice(0, n)
    .map(([id]) => byId.get(id)!)
}

// ─── Módulo pela data (mesma regra do banco) ─────────────────────────────────────────────────────

export type ModuleSpan = { id: string; label: string; title: string; start: string | null; end: string | null }

/** O módulo acontecendo na data; senão o último que já terminou; senão nenhum. */
export function moduleForDate(modules: ModuleSpan[], date: string): ModuleSpan | null {
  const dated = modules.filter((m): m is ModuleSpan & { start: string; end: string } => !!m.start && !!m.end)
  const during = dated.filter((m) => m.start <= date && date <= m.end).sort((a, b) => b.start.localeCompare(a.start))[0]
  if (during) return during
  return dated.filter((m) => m.end < date).sort((a, b) => b.start.localeCompare(a.start))[0] ?? null
}

// ─── Temas sugeridos pela dificuldade (mesma regra do banco, sem IA) ─────────────────────────────

export function suggestTopics<T extends { id: string; name: string; synonyms: string[] }>(text: string, topics: T[], limit = 3): T[] {
  const t = normalize(text)
  if (t.length < 3) return []
  return topics.filter((tp) => [tp.name, ...tp.synonyms].some((term) => term.length >= 3 && t.includes(normalize(term)))).slice(0, limit)
}

// ─── Dentes (FDI) ────────────────────────────────────────────────────────────────────────────────

export const FDI_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const FDI_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export function validTooth(n: number): boolean {
  return Number.isInteger(n) && Math.floor(n / 10) >= 1 && Math.floor(n / 10) <= 4 && n % 10 >= 1 && n % 10 <= 8
}

/** "12, 11 21" → [12, 11, 21]; ignora o que não for dente FDI; sem repetidos. */
export function parseTeeth(text: string): number[] {
  return [...new Set((text.match(/\d{2}/g) ?? []).map(Number).filter(validTooth))]
}

// ─── Leitura do caso ─────────────────────────────────────────────────────────────────────────────

/** Procedimentos do caso, na ordem em que apareceram (o caso é multidisciplinar). */
export function caseProcedures(records: RecordVM[], options: StepOption[]): string[] {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const seen: string[] = []
  for (const r of [...records].filter((x) => !x.removed).sort((a, b) => a.performedOn.localeCompare(b.performedOn) || a.createdAt.localeCompare(b.createdAt))) {
    const name = byStep.get(r.stepId)?.procedureName ?? 'Procedimento'
    if (!seen.includes(name)) seen.push(name)
  }
  return seen
}

/** Título do cartão: o do aluno, senão os dois primeiros procedimentos (+n). */
export function caseHeadline(c: Pick<CaseVM, 'title' | 'records'>, options: StepOption[]): string {
  if (c.title) return c.title
  const procs = caseProcedures(c.records, options)
  if (!procs.length) return 'Sem registros'
  return procs.length > 2 ? `${procs.slice(0, 2).join(' · ')} +${procs.length - 2}` : procs.join(' · ')
}

/** Linha do tempo: registros ativos agrupados por data (consulta), em ordem cronológica. */
export function timeline(records: RecordVM[]): Array<{ date: string; records: RecordVM[] }> {
  const groups = new Map<string, RecordVM[]>()
  for (const r of records.filter((x) => !x.removed).sort((a, b) => a.performedOn.localeCompare(b.performedOn) || a.createdAt.localeCompare(b.createdAt))) {
    groups.set(r.performedOn, [...(groups.get(r.performedOn) ?? []), r])
  }
  return [...groups.entries()].map(([date, list]) => ({ date, records: list }))
}

// ─── Jornada do caso (só apresentação dos registros existentes) ─────────────────────────────────

export type JourneyVisit = {
  date: string
  /** Consulta N: ordem cronológica entre TODAS as datas do caso (não muda com o filtro por dente). */
  number: number
  procedures: Array<{ procedureId: string; procedureName: string; records: RecordVM[] }>
}

/**
 * Consultas = registros ativos agrupados pela data (nada novo no banco). Em cada consulta, os procedimentos na ordem
 * em que foram registrados e, dentro deles, as etapas na ordem do catálogo. `tooth` filtra só os registros daquele
 * dente/posição, mantendo o agrupamento e a numeração das consultas.
 */
export function caseJourney(records: RecordVM[], options: StepOption[], tooth: number | null = null): JourneyVisit[] {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const active = records.filter((r) => !r.removed)
  const numbers = new Map([...new Set(active.map((r) => r.performedOn))].sort().map((d, i) => [d, i + 1]))
  const out: JourneyVisit[] = []
  for (const g of timeline(tooth === null ? active : active.filter((r) => r.teeth.includes(tooth)))) {
    const procs = new Map<string, { procedureId: string; procedureName: string; records: RecordVM[] }>()
    for (const r of g.records) {
      const p = procs.get(r.procedureId) ?? { procedureId: r.procedureId, procedureName: byStep.get(r.stepId)?.procedureName ?? 'Procedimento', records: [] }
      p.records.push(r)
      procs.set(r.procedureId, p)
    }
    for (const p of procs.values()) p.records.sort((a, b) => (byStep.get(a.stepId)?.position ?? 0) - (byStep.get(b.stepId)?.position ?? 0) || a.createdAt.localeCompare(b.createdAt))
    out.push({ date: g.date, number: numbers.get(g.date) ?? 0, procedures: [...procs.values()] })
  }
  return out
}

export type TreatmentSummary = {
  procedureId: string
  procedureName: string
  steps: Array<{ name: string; unit: CountUnit; total: number; completes: boolean }>
  /** Dentes em etapas anteriores que ainda não aparecem na etapa que conclui (só quando há dentes informados). */
  pendingTeeth: number[]
  concluded: number
}

/** Resumo por tratamento no caso: "preparados 3 · cimentados 2 — falta 22". Só procedimentos com etapa que conclui. */
export function treatmentSummary(records: RecordVM[], options: StepOption[]): TreatmentSummary[] {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const out = new Map<string, TreatmentSummary>()
  const procOptions = (pid: string) => options.filter((o) => o.procedureId === pid).sort((a, b) => a.position - b.position)
  for (const r of records.filter((x) => !x.removed)) {
    const o = byStep.get(r.stepId)
    if (!o) continue
    if (!procOptions(o.procedureId).some((x) => x.completes)) continue
    const s = out.get(o.procedureId) ?? { procedureId: o.procedureId, procedureName: o.procedureName, steps: [], pendingTeeth: [], concluded: 0 }
    const step = s.steps.find((x) => x.name === o.stepName) ?? { name: o.stepName, unit: o.unit, total: 0, completes: o.completes }
    if (!s.steps.includes(step)) s.steps.push(step)
    step.total += r.quantity
    if (o.completes) s.concluded += r.quantity
    out.set(o.procedureId, s)
  }
  for (const s of out.values()) {
    const order = procOptions(s.procedureId)
    s.steps.sort((a, b) => (order.find((o) => o.stepName === a.name)?.position ?? 0) - (order.find((o) => o.stepName === b.name)?.position ?? 0))
    const active = records.filter((r) => !r.removed && byStep.get(r.stepId)?.procedureId === s.procedureId)
    const done = new Set(active.filter((r) => byStep.get(r.stepId)?.completes).flatMap((r) => r.teeth))
    const before = new Set(active.filter((r) => !byStep.get(r.stepId)?.completes).flatMap((r) => r.teeth))
    s.pendingTeeth = done.size || before.size ? sortTeeth([...before].filter((t) => !done.has(t))) : []
  }
  return [...out.values()]
}

export type CaseFilter = 'andamento' | 'concluidos' | 'excluidos'

export function filterCases<T extends Pick<CaseVM, 'status' | 'removed' | 'patientLabel' | 'title'>>(cases: T[], filter: CaseFilter | null, query: string): T[] {
  const q = normalize(query)
  // "rct" acha "R.C.T.": compara também sem pontuação.
  const bare = (t: string) => normalize(t).replace(/[^a-z0-9]/g, '')
  return cases
    .filter((c) => (filter === 'excluidos' ? c.removed : !c.removed))
    .filter((c) => (filter === 'andamento' ? c.status === 'em_andamento' : filter === 'concluidos' ? c.status === 'concluido' : true))
    .filter((c) => !q || normalize(`${c.patientLabel} ${c.title ?? ''}`).includes(q) || (bare(q) !== '' && bare(c.patientLabel).includes(bare(q))))
}

// ─── Odontograma e arcada (posições FDI só como seletor; nada de prontuário) ─────────────────────

/**
 * Quantidade de uma linha do registro (mesma regra do banco): com posições FDI marcadas = número de posições
 * (não editável); por arcada = 1 ou 2 (ambas); caso = 1; senão a quantidade escolhida.
 */
export function lineQuantity(o: Pick<StepOption, 'location' | 'unit'>, l: { quantity: number; teeth: number[]; arch: DentalArch | null }, archSupported = true): number {
  if (o.location === 'dentes' && l.teeth.length) return l.teeth.length
  if (o.location === 'arcada' && archSupported && l.arch) return archQuantity(l.arch)
  if (o.unit === 'caso') return 1
  return l.quantity
}

/** O que falta numa linha antes de salvar (mensagem curta) ou null. */
export function lineError(o: Pick<StepOption, 'location' | 'requiresDescription'>, l: { teeth: number[]; arch: DentalArch | null; description: string }, archSupported = true): string | null {
  if (o.requiresDescription && l.description.trim().length < 3) return 'Descreva o "Outro procedimento".'
  if (o.location === 'arcada' && archSupported && !l.arch) return 'Escolha a arcada: superior, inferior ou ambas.'
  if (o.location !== 'dentes' && l.teeth.length) return 'Esta etapa não identifica dentes.'
  return null
}

/** Posições FDI envolvidas no caso (registros ativos) e as que já tiveram a etapa que conclui — tudo derivado. */
export function caseTeeth(records: RecordVM[], options: StepOption[]): Map<number, { done: boolean }> {
  const byStep = new Map(options.map((o) => [o.stepId, o]))
  const out = new Map<number, { done: boolean }>()
  for (const r of records.filter((x) => !x.removed)) {
    const done = !!byStep.get(r.stepId)?.completes
    for (const t of r.teeth) out.set(t, { done: (out.get(t)?.done ?? false) || done })
  }
  return out
}

/** Atalhos do odontograma. */
export const TOOTH_SHORTCUTS: Array<{ label: string; teeth: number[] }> = [
  { label: 'Anteriores sup.', teeth: [13, 12, 11, 21, 22, 23] },
  { label: 'Anteriores inf.', teeth: [43, 42, 41, 31, 32, 33] },
  // "Arcada" é também a localização de algumas etapas: aqui são só atalhos de seleção de dentes.
  { label: 'Todos superiores', teeth: FDI_UPPER },
  { label: 'Todos inferiores', teeth: FDI_LOWER },
]
/** Liga/desliga um grupo: se todos já estão marcados, desmarca; senão marca os que faltam. */
export function toggleGroup(current: number[], group: number[]): number[] {
  return group.every((t) => current.includes(t)) ? current.filter((t) => !group.includes(t)) : [...current, ...group.filter((t) => !current.includes(t))]
}
/** Ordem de exibição: arcada superior da direita do paciente para a esquerda, depois a inferior. */
export function sortTeeth(teeth: number[]): number[] {
  const order = [...FDI_UPPER, ...FDI_LOWER]
  return [...teeth].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/**
 * Posições, arcada e quantidade de um registro (mesmas regras do gatilho do banco), validadas antes de gravar —
 * no registro real e no rascunho da simulação. Lança Error com mensagem clara; nunca descarta dado em silêncio.
 * `archSupported` = o banco já tem a coluna da arcada (antes da migração: comportamento anterior).
 */
export function resolvePlacement(
  step: { location: StepLocation; unit: CountUnit },
  input: { quantity: number; teeth: number[]; arch: DentalArch | null },
  archSupported = true,
): { quantity: number; teeth: number[]; arch: DentalArch | null } {
  const teeth = [...new Set(input.teeth.map(Number))]
  if (teeth.some((t) => !validTooth(t))) throw new Error('Posição FDI inválida (use 11 a 48).')
  const arch = archSupported ? input.arch : null
  let quantity = Number(input.quantity)
  if (step.location === 'dentes') {
    if (arch) throw new Error('Esta etapa identifica posições FDI, não arcada.')
    if (teeth.length) quantity = teeth.length
  } else if (step.location === 'arcada') {
    if (teeth.length) throw new Error('Esta etapa não identifica dentes: informe a arcada.')
    if (archSupported && !arch) throw new Error('Escolha a arcada: superior, inferior ou ambas.')
    if (arch) quantity = archQuantity(arch)
  } else {
    if (teeth.length) throw new Error('Esta etapa não identifica dentes.')
    if (arch) throw new Error('Esta etapa não identifica arcada.')
  }
  if (step.unit === 'caso') quantity = 1
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Quantidade inválida.')
  return { quantity, teeth, arch }
}

/**
 * Quadrantes na orientação clínica (direita do paciente à esquerda da tela). Cada quadrante em ordem FDI a partir
 * da linha média; `inner` = os 4 mais próximos da linha média (11–14 …), `outer` = 15–18 ….
 */
export const QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
} as const

// ─── Linguagem: dente × posição FDI ──────────────────────────────────────────────────────────────

/**
 * Procedimentos em que o número FDI marca uma posição que pode não ter dente presente (pôntico, implante, enxerto
 * em rebordo). Nos demais, a interface fala em "dentes".
 */
const POSITION_PROCEDURES = new Set(['protese-parcial-fixa-dentossuportada', 'implante', 'coroa-sobre-implante', 'enxerto-osseo'])
export function usesPositions(o: Pick<StepOption, 'procedureSlug'> | null | undefined): boolean {
  return !!o && POSITION_PROCEDURES.has(o.procedureSlug)
}
/** "3 dentes" / "1 posição" (com `selected`: "3 dentes selecionados"). */
export function teethCount(n: number, positions = false, selected = false): string {
  const noun = positions ? (n === 1 ? 'posição' : 'posições') : n === 1 ? 'dente' : 'dentes'
  const adj = selected ? (positions ? (n === 1 ? ' selecionada' : ' selecionadas') : n === 1 ? ' selecionado' : ' selecionados') : ''
  return `${n} ${noun}${adj}`
}

// ─── Procedimento → etapas (só apresentação) ─────────────────────────────────────────────────────

export type ProcedureGroup = { procedureId: string; procedureSlug: string; procedureName: string; categoryName: string; steps: StepOption[] }

/** Agrupa etapas pelo procedimento, mantendo a ordem em que aparecem (catálogo ou relevância da busca). */
export function groupByProcedure(options: StepOption[]): ProcedureGroup[] {
  const out = new Map<string, ProcedureGroup>()
  for (const o of options) {
    const g = out.get(o.procedureId) ?? { procedureId: o.procedureId, procedureSlug: o.procedureSlug, procedureName: o.procedureName, categoryName: o.categoryName, steps: [] }
    g.steps.push(o)
    out.set(o.procedureId, g)
  }
  return [...out.values()]
}

/** A etapa tem nome próprio (≠ do procedimento)? Ex.: Laminado cerâmico → "Cimentação". */
export const hasOwnStepName = (o: Pick<StepOption, 'stepName' | 'procedureName'>) => o.stepName !== o.procedureName

// ─── Acesso rápido (sem dado novo no banco) ──────────────────────────────────────────────────────

/**
 * Atalhos padrão quando o aluno ainda não tem histórico (ou na simulação): procedimentos do catálogo aprovado,
 * em ordem de prioridade. Só entram os que existem, estão ativos e combinam com o caminho escolhido.
 */
export const DEFAULT_QUICK_PROCEDURES = [
  'laminado-ceramico',
  'restauracao-em-resina-anterior',
  'restauracao-em-resina-posterior',
  'faceta-direta-em-resina',
  'coroa-total',
  'escaneamento-intraoral',
  'tratamento-endodontico',
  'clareamento-de-consultorio',
]

export type QuickItem =
  | { kind: 'etapa'; option: StepOption; source: 'recente' | 'frequente' }
  | { kind: 'procedimento'; group: ProcedureGroup; source: 'padrao' }

/**
 * Acesso rápido (até `max`): 1) etapas recentes do próprio aluno; 2) as mais frequentes (2+ registros);
 * 3) sem histórico, os atalhos padrão. Com pouco histórico, completa com os padrão até `min`.
 * `pool` = etapas compatíveis com o caminho (ex.: só as de dentes no "Por dente").
 */
export function quickAccess(pool: StepOption[], history: Array<{ stepId: string; createdAt: string }>, max = 6, min = 4): QuickItem[] {
  const byId = new Map(pool.map((o) => [o.stepId, o]))
  const usable = history.filter((h) => byId.has(h.stepId))
  const items: QuickItem[] = []
  const has = (stepId: string) => items.some((i) => i.kind === 'etapa' && i.option.stepId === stepId)
  // Recentes: as 3 últimas etapas distintas.
  for (const h of [...usable].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (items.length >= 3) break
    if (!has(h.stepId)) items.push({ kind: 'etapa', option: byId.get(h.stepId)!, source: 'recente' })
  }
  // Frequentes: registradas 2+ vezes, as mais usadas primeiro.
  const count = new Map<string, number>()
  for (const h of usable) count.set(h.stepId, (count.get(h.stepId) ?? 0) + 1)
  for (const [id] of [...count.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])) {
    if (items.length >= max) break
    if (!has(id)) items.push({ kind: 'etapa', option: byId.get(id)!, source: 'frequente' })
  }
  // Padrão: sem histórico, ou para completar o mínimo (sem repetir procedimento já sugerido).
  if (items.length < min) {
    const groups = groupByProcedure(pool)
    const target = items.length ? min : max
    for (const slug of DEFAULT_QUICK_PROCEDURES) {
      if (items.length >= target) break
      const g = groups.find((x) => x.procedureSlug === slug)
      if (!g || items.some((i) => (i.kind === 'etapa' ? i.option.procedureId : i.group.procedureId) === g.procedureId)) continue
      items.push({ kind: 'procedimento', group: g, source: 'padrao' })
    }
  }
  return items.slice(0, max)
}
