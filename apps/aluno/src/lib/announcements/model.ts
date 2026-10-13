/**
 * Avisos (Etapa 5 · Parte 2) — regras puras, testáveis sem banco.
 * As mesmas regras valem no banco (RLS): aqui servem para a Início, a pré-visualização do admin e as listas do painel.
 */
import type { ContentStatus } from '@/lib/academic/model'

export type AnnouncementVM = {
  id: string
  /** null = todas as turmas. */
  cohortId: string | null
  cohortName: string | null
  title: string
  body: string
  signature: string | null
  linkUrl: string | null
  linkLabel: string | null
  important: boolean
  visibleFrom: string
  visibleUntil: string
  status: ContentStatus
  publishedAt: string | null
  updatedAt: string
}

/** Situação do aviso para quem administra (a data decide entre programado, no ar e encerrado). */
export type Situation = 'rascunho' | 'programado' | 'no-ar' | 'encerrado' | 'arquivado'

export const SITUATION_LABEL: Record<Situation, string> = {
  'no-ar': 'No ar',
  programado: 'Programado',
  rascunho: 'Rascunho',
  encerrado: 'Encerrado',
  arquivado: 'Arquivado',
}
export const SITUATIONS: Situation[] = ['no-ar', 'programado', 'rascunho', 'encerrado', 'arquivado']

export function situation(a: Pick<AnnouncementVM, 'status' | 'visibleFrom' | 'visibleUntil'>, today: string): Situation {
  if (a.status === 'arquivado') return 'arquivado'
  if (a.status === 'rascunho') return 'rascunho'
  if (today < a.visibleFrom) return 'programado'
  if (today > a.visibleUntil) return 'encerrado'
  return 'no-ar'
}

/**
 * Avisos que o aluno vê na Início, nesta ordem: importantes primeiro, depois os mais recentes.
 * "Entendi" esconde só avisos comuns — se um aviso dispensado virar importante, ele volta.
 */
export function activeAnnouncements<T extends AnnouncementVM>(
  list: T[],
  opts: { cohortId: string; today: string; dismissed?: ReadonlySet<string> },
): T[] {
  return list
    .filter((a) => situation(a, opts.today) === 'no-ar')
    .filter((a) => a.cohortId === null || a.cohortId === opts.cohortId)
    .filter((a) => a.important || !opts.dismissed?.has(a.id))
    .sort((a, b) => Number(b.important) - Number(a.important) || b.visibleFrom.localeCompare(a.visibleFrom) || a.title.localeCompare(b.title))
}

/** Ordem do painel: no ar, programados, rascunhos, encerrados, arquivados; dentro de cada grupo, o de início mais recente primeiro. */
export function sortForAdmin<T extends AnnouncementVM>(list: T[], today: string): T[] {
  const rank = (a: T) => SITUATIONS.indexOf(situation(a, today))
  return [...list].sort((a, b) => rank(a) - rank(b) || b.visibleFrom.localeCompare(a.visibleFrom) || a.title.localeCompare(b.title))
}

/** Link do aviso: caminho do portal ("/cronograma") ou https://. Qualquer outra coisa é recusada. */
export function validLink(url: string): boolean {
  return /^https:\/\/[^\s]+$/.test(url) || /^\/[^/\s][^\s]*$/.test(url)
}
