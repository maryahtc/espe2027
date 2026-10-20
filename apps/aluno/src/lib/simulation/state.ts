/**
 * Modo de simulação do aluno — o rascunho temporário (Etapa 6, ajuste final).
 *
 * Tudo o que o Admin "faz como aluno" durante a simulação vive SÓ aqui: um objeto pequeno, guardado cifrado num
 * cookie da sessão, que some ao sair ou ao expirar (2 h). Nada disto vai para o banco ou para o Storage.
 * As regras dos casos repetem as do banco (gatilhos e restrições), para a experiência ser a mesma do aluno real.
 * Funções puras: testáveis sem banco.
 */
import { hasPersonalIdentifier, type CaseVM, type ModuleSpan, moduleForDate, patientLabelError, type RecordVM, validTooth } from '@/lib/cases/model'

export const SIM_DURATION_MS = 2 * 60 * 60 * 1000

/** Limites conservadores: o modo serve para conferir a experiência, não para testes extensos. */
export const SIM_LIMITS = { cases: 5, records: 30, progress: 50, checks: 100, dismissed: 30 } as const
export const SIM_LIMIT_MSG = 'Limite da simulação atingido. Ela serve para conferir a experiência: saia e entre de novo para recomeçar.'

export type SimRecord = {
  id: string
  stepId: string
  procedureId: string
  performedOn: string
  quantity: number
  teeth: number[]
  moduleId: string | null
  moduleAuto: boolean
  note: string | null
  description: string | null
  removed: boolean
  createdAt: string
}

export type SimCase = {
  id: string
  patientLabel: string
  title: string | null
  status: 'em_andamento' | 'concluido'
  concludedOn: string | null
  supervisorId: string | null
  smileCloudUrl: string | null
  difficulty: string | null
  ease: string | null
  differently: string | null
  topicIds: string[]
  removed: boolean
  createdAt: string
  records: SimRecord[]
}

export type SimProgress = { status: 'iniciado' | 'concluido'; percent: number; positionSeconds: number; completedAt: string | null; updatedAt: string }

export type SimState = {
  /** Aceite do termo — só no rascunho. */
  terms: { versionId: string; at: string } | null
  cases: SimCase[]
  progress: Record<string, SimProgress>
  checks: string[]
  dismissed: string[]
}

export type SimPayload = {
  v: 1
  /** Admin dono da simulação: o cookie só vale para esta conta. */
  admin: string
  cohort: string
  startedAt: number
  expiresAt: number
  state: SimState
}

export const emptyState = (): SimState => ({ terms: null, cases: [], progress: {}, checks: [], dismissed: [] })

export class SimError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// ─── Leitura: rascunho → mesmo formato das telas reais ──────────────────────────────────────────

export function toRecordVM(r: SimRecord): RecordVM {
  return {
    id: r.id,
    stepId: r.stepId,
    procedureId: r.procedureId,
    performedOn: r.performedOn,
    quantity: r.quantity,
    teeth: r.teeth,
    moduleId: r.moduleId,
    moduleAuto: r.moduleAuto,
    note: r.note,
    description: r.description,
    removed: r.removed,
    createdAt: r.createdAt,
  }
}

/** Como o banco: início e última atividade = menor/maior data dos registros ativos. */
export function toCaseVM(c: SimCase, cohortId: string): CaseVM {
  const active = c.records.filter((r) => !r.removed).map((r) => r.performedOn).sort()
  return {
    id: c.id,
    cohortId,
    patientLabel: c.patientLabel,
    title: c.title,
    status: c.status,
    startedOn: active[0] ?? null,
    lastActivityOn: active.at(-1) ?? null,
    concludedOn: c.concludedOn,
    supervisorId: c.supervisorId,
    smileCloudUrl: c.smileCloudUrl,
    difficulty: c.difficulty,
    ease: c.ease,
    differently: c.differently,
    coverPath: null,
    removed: c.removed,
    createdAt: c.createdAt,
    topicIds: c.topicIds,
    records: c.records.map(toRecordVM),
  }
}

/** Mesma ordem de Meus casos (última atividade, depois criação). */
export function simCases(state: SimState, cohortId: string): CaseVM[] {
  return state.cases
    .map((c) => toCaseVM(c, cohortId))
    .sort((a, b) => (b.lastActivityOn ?? b.createdAt).localeCompare(a.lastActivityOn ?? a.createdAt) || b.createdAt.localeCompare(a.createdAt))
}

// ─── Escrita no rascunho (mesmas regras do banco) ────────────────────────────────────────────────

export type StepInfo = { procedureId: string; active: boolean; requiresDescription: boolean }
export type Ctx = {
  today: string
  now: string
  modules: ModuleSpan[]
  steps: Map<string, StepInfo>
  activeTopics: Set<string>
  newId: () => string
}

function text(v: unknown, max: number, label: string): string | null {
  const t = typeof v === 'string' ? v.trim().slice(0, max) : ''
  if (!t) return null
  if (hasPersonalIdentifier(t)) throw new SimError(`${label}: não inclua CPF, telefone ou documento do paciente.`)
  return t
}
function smile(v: unknown): string | null {
  const t = typeof v === 'string' ? v.trim().slice(0, 500) : ''
  if (!t) return null
  if (!/^https:\/\/\S+$/.test(t)) throw new SimError('O link do Smile Cloud precisa começar com https://')
  return t
}
function date(d: unknown, today: string): string {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new SimError('Informe a data do atendimento.')
  if (d > today) throw new SimError('A data não pode ser no futuro.')
  return d
}
function label(v: string): string {
  const l = v.trim()
  const err = patientLabelError(l)
  if (err) throw new SimError(err)
  return l.toUpperCase()
}
function topics(ids: unknown[], ctx: Ctx): string[] {
  const list = [...new Set(ids.map(String).filter((t) => UUID.test(t)))]
  if (list.length > 3) throw new SimError('Escolha no máximo 3 temas.')
  if (list.some((t) => !ctx.activeTopics.has(t))) throw new SimError('Tema arquivado.')
  return list
}
function moduleOf(ctx: Ctx, performedOn: string, mod: { auto: boolean; id: string | null }): { moduleId: string | null; moduleAuto: boolean } {
  if (mod.auto) return { moduleAuto: true, moduleId: moduleForDate(ctx.modules, performedOn)?.id ?? null }
  if (mod.id && !ctx.modules.some((m) => m.id === mod.id)) throw new SimError('O módulo precisa ser da turma do caso.')
  return { moduleAuto: false, moduleId: mod.id }
}
const totalRecords = (s: SimState) => s.cases.reduce((n, c) => n + c.records.length, 0)
function findCase(s: SimState, id: string): SimCase {
  const c = s.cases.find((x) => x.id === id)
  if (!c) throw new SimError('Caso não encontrado.')
  return c
}

export type RegisterInput = {
  mode: 'novo' | 'existente'
  caseId?: string
  patient?: string
  date: string
  lines: Array<{ stepId: string; quantity: number; teeth: number[]; description?: string }>
  module: { auto: true } | { auto: false; id: string | null }
  extras?: { title?: string; supervisorId?: string; smile?: string; difficulty?: string; ease?: string; differently?: string; topicIds?: string[] }
}

/** Registro rápido no rascunho. Devolve o caso e quantos registros entraram. */
export function simRegister(s: SimState, p: RegisterInput, ctx: Ctx): { caseId: string; count: number } {
  const on = date(p.date, ctx.today)
  const lines = (p.lines ?? []).filter((l) => l && UUID.test(l.stepId))
  if (!lines.length) throw new SimError('Escolha o que você fez.')
  if (lines.length > 12) throw new SimError('No máximo 12 procedimentos por registro.')
  const mod = p.module?.auto === false ? { auto: false, id: p.module.id && UUID.test(p.module.id) ? p.module.id : null } : { auto: true, id: null }
  const rows = lines.map((l) => {
    const quantity = Number(l.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new SimError('Quantidade inválida.')
    const step = ctx.steps.get(l.stepId)
    if (!step || !step.active) throw new SimError('Um dos procedimentos escolhidos não está mais disponível.')
    const description = text(l.description, 120, 'Descrição')
    if (step.requiresDescription && (description ?? '').length < 3) throw new SimError('Descreva o "Outro procedimento".')
    return {
      stepId: l.stepId,
      procedureId: step.procedureId,
      quantity,
      teeth: [...new Set((l.teeth ?? []).map(Number).filter(validTooth))],
      description: step.requiresDescription ? description : null,
    }
  })
  if (totalRecords(s) + rows.length > SIM_LIMITS.records) throw new SimError(SIM_LIMIT_MSG)

  let target: SimCase
  if (p.mode === 'existente') {
    if (!p.caseId) throw new SimError('Escolha o caso em andamento.')
    target = findCase(s, p.caseId)
  } else {
    if (s.cases.length >= SIM_LIMITS.cases) throw new SimError(SIM_LIMIT_MSG)
    const x = p.extras ?? {}
    target = {
      id: ctx.newId(),
      patientLabel: label(p.patient ?? ''),
      title: text(x.title, 80, 'Título'),
      status: 'em_andamento',
      concludedOn: null,
      supervisorId: x.supervisorId && UUID.test(x.supervisorId) ? x.supervisorId : null,
      smileCloudUrl: smile(x.smile),
      difficulty: text(x.difficulty, 1000, 'Dificuldade'),
      ease: text(x.ease, 1000, 'Facilidade'),
      differently: text(x.differently, 1000, 'Faria diferente'),
      topicIds: topics(x.topicIds ?? [], ctx),
      removed: false,
      createdAt: ctx.now,
      records: [],
    }
    s.cases.push(target)
  }
  const m = moduleOf(ctx, on, mod)
  for (const r of rows) target.records.push({ id: ctx.newId(), ...r, performedOn: on, ...m, note: null, removed: false, createdAt: ctx.now })
  return { caseId: target.id, count: rows.length }
}

export function simSaveDetails(
  s: SimState,
  caseId: string,
  f: { patient: string; title: unknown; supervisorId: string; smile: unknown; difficulty: unknown; ease: unknown; differently: unknown; topicIds: unknown[] },
  ctx: Ctx,
): void {
  const c = findCase(s, caseId)
  const next = {
    patientLabel: label(f.patient),
    title: text(f.title, 80, 'Título'),
    supervisorId: UUID.test(f.supervisorId) ? f.supervisorId : null,
    smileCloudUrl: smile(f.smile),
    difficulty: text(f.difficulty, 1000, 'Dificuldade'),
    ease: text(f.ease, 1000, 'Facilidade'),
    differently: text(f.differently, 1000, 'Faria diferente'),
  }
  // Temas: mantém os que já estavam (mesmo arquivados depois); os novos precisam estar ativos.
  const wanted = [...new Set(f.topicIds.map(String).filter((t) => UUID.test(t)))]
  if (wanted.length > 3) throw new SimError('Escolha no máximo 3 temas.')
  if (wanted.some((t) => !c.topicIds.includes(t) && !ctx.activeTopics.has(t))) throw new SimError('Tema arquivado.')
  Object.assign(c, next, { topicIds: wanted })
}

/** Concluir carimba a data de hoje; reabrir limpa (como o gatilho do banco). */
export function simSetStatus(s: SimState, caseId: string, status: 'em_andamento' | 'concluido', ctx: Ctx): void {
  const c = findCase(s, caseId)
  if (status === 'concluido' && c.status !== 'concluido') c.concludedOn = ctx.today
  if (status === 'em_andamento') c.concludedOn = null
  c.status = status
}

export function simSetCaseRemoved(s: SimState, caseId: string, removed: boolean): void {
  findCase(s, caseId).removed = removed
}

function findRecord(s: SimState, id: string): { c: SimCase; r: SimRecord } {
  for (const c of s.cases) {
    const r = c.records.find((x) => x.id === id)
    if (r) return { c, r }
  }
  throw new SimError('Este registro não pode ser alterado.')
}

export function simUpdateRecord(
  s: SimState,
  id: string,
  f: { date: unknown; quantity: number; teeth: number[]; note: unknown; description?: unknown; module: { auto: boolean; id: string | null } },
  ctx: Ctx,
): void {
  const { r } = findRecord(s, id)
  if (!Number.isInteger(f.quantity) || f.quantity < 1 || f.quantity > 99) throw new SimError('Quantidade inválida.')
  const on = date(f.date, ctx.today)
  const step = ctx.steps.get(r.stepId)
  const note = text(f.note, 200, 'Observação')
  let description = r.description
  if (step?.requiresDescription && f.description !== undefined) {
    description = text(f.description, 120, 'Descrição')
    if ((description ?? '').length < 3) throw new SimError('Descreva o procedimento.')
  }
  // Módulo automático é recalculado quando muda a data ou quando volta a ser automático (gatilho do banco).
  const m = f.module.auto
    ? r.moduleAuto && on === r.performedOn
      ? { moduleAuto: true, moduleId: r.moduleId }
      : moduleOf(ctx, on, { auto: true, id: null })
    : moduleOf(ctx, on, f.module)
  Object.assign(r, { performedOn: on, quantity: f.quantity, teeth: [...new Set(f.teeth.filter(validTooth))], note, description, ...m })
}

export function simSetRecordRemoved(s: SimState, id: string, removed: boolean): void {
  findRecord(s, id).r.removed = removed
}

// ─── Progresso, checklist, avisos, termo ─────────────────────────────────────────────────────────

export function simSetProgress(s: SimState, contentId: string, p: Omit<SimProgress, 'updatedAt'>, now: string): void {
  if (!s.progress[contentId] && Object.keys(s.progress).length >= SIM_LIMITS.progress) throw new SimError(SIM_LIMIT_MSG)
  s.progress[contentId] = { ...p, updatedAt: now }
}

export function simToggleCheck(s: SimState, materialId: string, checked: boolean): void {
  const has = s.checks.includes(materialId)
  if (checked && !has) {
    if (s.checks.length >= SIM_LIMITS.checks) throw new SimError(SIM_LIMIT_MSG)
    s.checks.push(materialId)
  }
  if (!checked && has) s.checks = s.checks.filter((x) => x !== materialId)
}

export function simDismiss(s: SimState, announcementId: string): void {
  if (s.dismissed.includes(announcementId)) return
  if (s.dismissed.length >= SIM_LIMITS.dismissed) throw new SimError(SIM_LIMIT_MSG)
  s.dismissed.push(announcementId)
}

/** O aluno precisa (re)aceitar quando não aceitou no rascunho ou quando a versão vigente mudou. */
export const simNeedsTerms = (s: SimState, currentVersionId: string | null) => !!currentVersionId && s.terms?.versionId !== currentVersionId
