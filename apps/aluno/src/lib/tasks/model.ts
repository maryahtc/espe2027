/**
 * Bloco A · B2 — quadro único de pendências e providências (Admin/coordenação). Regras puras, sem banco.
 * Substitui as abas PENDÊNCIAS, EQUIPAMENTOS, MARKETING, FOTO E VÍDEO e EXPERIENCIA da planilha-base e os materiais a
 * providenciar por módulo. Sem ranking de pessoas: "atrasada" é um fato (prazo passou e não está encerrada).
 */

export const CATEGORIES = [
  'academico',
  'administrativo',
  'professores',
  'materiais',
  'equipamentos',
  'parceiros',
  'marketing',
  'foto_video',
  'experiencia_aluno',
] as const
export type TaskCategory = (typeof CATEGORIES)[number]

export const PRIORITIES = ['alta', 'media', 'baixa'] as const
export type TaskPriority = (typeof PRIORITIES)[number]

export const STATUSES = ['aberta', 'em_andamento', 'aguardando', 'concluida', 'cancelada'] as const
export type TaskStatus = (typeof STATUSES)[number]

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  academico: 'Acadêmico',
  administrativo: 'Administrativo',
  professores: 'Professores',
  materiais: 'Materiais',
  equipamentos: 'Equipamentos',
  parceiros: 'Parceiros',
  marketing: 'Marketing',
  foto_video: 'Foto e vídeo',
  experiencia_aluno: 'Experiência do aluno',
}
export const PRIORITY_LABEL: Record<TaskPriority, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const STATUS_LABEL: Record<TaskStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  aguardando: 'Aguardando',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

/** Categorias em que quantidade necessária/disponível faz sentido. */
export const QUANTITY_CATEGORIES: ReadonlySet<TaskCategory> = new Set(['materiais', 'equipamentos'])

export type TaskVM = {
  id: string
  cohortId: string | null
  cohortName: string | null
  moduleId: string | null
  moduleLabel: string | null
  category: TaskCategory
  title: string
  details: string | null
  responsibleId: string | null
  responsibleName: string | null
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  nextAction: string | null
  dependsOnId: string | null
  dependsOnTitle: string | null
  dependencyNote: string | null
  quantityNeeded: number | null
  quantityAvailable: number | null
  partnerName: string | null
  linkUrl: string | null
  completedAt: string | null
  updatedAt: string
}

/** Ainda exige ação (aberta, em andamento, aguardando). */
export const isOpen = (t: Pick<TaskVM, 'status'>) => t.status === 'aberta' || t.status === 'em_andamento' || t.status === 'aguardando'

/** Atrasada: tem prazo, o prazo já passou (antes de hoje) e ainda está em aberto. */
export const isOverdue = (t: Pick<TaskVM, 'status' | 'dueDate'>, today: string) => isOpen(t) && !!t.dueDate && t.dueDate < today

/** Quanto falta providenciar (materiais/equipamentos), quando as duas quantidades foram informadas. */
export function missingQuantity(t: Pick<TaskVM, 'quantityNeeded' | 'quantityAvailable'>): number | null {
  if (t.quantityNeeded == null || t.quantityAvailable == null) return null
  return Math.max(0, t.quantityNeeded - t.quantityAvailable)
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { alta: 0, media: 1, baixa: 2 }
const STATUS_ORDER: Record<TaskStatus, number> = { aberta: 0, em_andamento: 0, aguardando: 0, concluida: 1, cancelada: 2 }

/**
 * Ordem do quadro: em aberto primeiro; dentro delas, atrasadas, depois por prazo (sem prazo por último), prioridade e
 * demanda. Encerradas no fim, as mais recentes antes.
 */
export function sortTasks<T extends TaskVM>(list: T[], today: string): T[] {
  return [...list].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s) return s
    if (!isOpen(a)) return (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)
    const o = Number(isOverdue(b, today)) - Number(isOverdue(a, today))
    if (o) return o
    const d = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
    if (d) return d
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.title.localeCompare(b.title, 'pt-BR')
  })
}

export type TaskFilters = {
  category?: TaskCategory
  status?: TaskStatus | 'abertas' | 'todas'
  priority?: TaskPriority
  moduleId?: string
  responsibleId?: string
  cohortId?: string | 'geral'
  overdue?: boolean
}

/** Filtros do quadro. Sem filtro de situação, mostra só as em aberto. */
export function filterTasks<T extends TaskVM>(list: T[], f: TaskFilters, today: string): T[] {
  return list.filter((t) => {
    const st = f.status ?? 'abertas'
    if (st === 'abertas' && !isOpen(t)) return false
    if (st !== 'abertas' && st !== 'todas' && t.status !== st) return false
    if (f.category && t.category !== f.category) return false
    if (f.priority && t.priority !== f.priority) return false
    if (f.moduleId && t.moduleId !== f.moduleId) return false
    if (f.responsibleId && t.responsibleId !== f.responsibleId) return false
    if (f.cohortId === 'geral' && t.cohortId !== null) return false
    if (f.cohortId && f.cohortId !== 'geral' && t.cohortId !== f.cohortId) return false
    if (f.overdue && !isOverdue(t, today)) return false
    return true
  })
}

export type TaskCounts = { open: number; overdue: number; highPriority: number; waiting: number; done: number }

/** Contagens do painel (substituem as métricas de pendências do DASHBOARD da planilha). */
export function taskCounts(list: Array<Pick<TaskVM, 'status' | 'dueDate' | 'priority'>>, today: string): TaskCounts {
  const open = list.filter(isOpen)
  return {
    open: open.length,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    highPriority: open.filter((t) => t.priority === 'alta').length,
    waiting: open.filter((t) => t.status === 'aguardando').length,
    done: list.filter((t) => t.status === 'concluida').length,
  }
}

const pick = <T extends string>(v: string | undefined, all: readonly T[]): T | undefined => (v && (all as readonly string[]).includes(v) ? (v as T) : undefined)
const uuid = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : undefined)
/** Chave de responsável: "f:<uuid>" (acadêmica) ou "o:<uuid>" (operacional). */
const personKey = (v: string | undefined) => (v && /^[fo]:[0-9a-f-]{36}$/.test(v) ? v : undefined)

/** Lê os filtros do endereço (?categoria=&situacao=&prioridade=&modulo=&responsavel=&turma=&atrasadas=1). */
export function parseFilters(sp: Record<string, string | undefined>): TaskFilters {
  const status = sp.situacao === 'todas' || sp.situacao === 'abertas' ? sp.situacao : pick(sp.situacao, STATUSES)
  return {
    category: pick(sp.categoria, CATEGORIES),
    status,
    priority: pick(sp.prioridade, PRIORITIES),
    moduleId: uuid(sp.modulo),
    responsibleId: personKey(sp.responsavel),
    cohortId: sp.turma === 'geral' ? 'geral' : uuid(sp.turma),
    overdue: sp.atrasadas === '1' || undefined,
  }
}

/**
 * Quem edita (inclusive mudar a situação): Admin, tudo; coordenação, só as da turma que coordena. As gerais (sem turma)
 * aparecem para a coordenação somente para leitura. Ninguém exclui: encerrar = "cancelada".
 */
export const canEditTask = (t: Pick<TaskVM, 'cohortId'>, isAdmin: boolean) => isAdmin || t.cohortId !== null

export type DependencyGroup = { cohortId: string | null; label: string; tasks: Array<{ id: string; title: string }> }

/**
 * Pendências que podem ser escolhidas em "Depende de": só em aberto e só da mesma turma (ou ambas gerais), nunca a
 * própria. Editando: só o grupo da turma da pendência. Criando (a turma ainda não foi escolhida): agrupadas por turma; a
 * coordenação não vê o grupo das gerais (não cria pendência geral, e pendência de turma não depende de geral).
 */
export function dependencyGroups(
  tasks: Array<Pick<TaskVM, 'id' | 'title' | 'status' | 'cohortId' | 'cohortName'>>,
  opts: { current?: Pick<TaskVM, 'id' | 'cohortId'>; isAdmin: boolean },
): DependencyGroup[] {
  const groups = new Map<string, DependencyGroup>()
  for (const t of tasks) {
    if (!isOpen(t) || t.id === opts.current?.id) continue
    if (opts.current && t.cohortId !== opts.current.cohortId) continue
    if (!opts.current && t.cohortId === null && !opts.isAdmin) continue
    const key = t.cohortId ?? 'geral'
    const g = groups.get(key) ?? { cohortId: t.cohortId, label: t.cohortId ? (t.cohortName ?? 'Turma') : 'Gerais (sem turma)', tasks: [] }
    g.tasks.push({ id: t.id, title: t.title })
    groups.set(key, g)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, tasks: g.tasks.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')) }))
    .sort((a, b) => (a.cohortId === null ? -1 : b.cohortId === null ? 1 : a.label.localeCompare(b.label, 'pt-BR')))
}
