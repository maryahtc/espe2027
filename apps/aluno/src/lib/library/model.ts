/**
 * Biblioteca — tipos, rótulos e regras puras (filtros, ordenação, relacionados). Sem acesso a banco:
 * os mesmos cálculos servem ao aluno, ao painel e aos testes.
 */
import type { ContentStatus, ModulePhase, RequirementLevel } from '@/lib/academic/model'

export type ContentKind = 'video' | 'artigo' | 'capitulo' | 'livro' | 'pdf' | 'slides' | 'link'
export type ProgressStatus = 'iniciado' | 'concluido'

export const KIND_LABEL: Record<ContentKind, string> = {
  video: 'Videoaula',
  artigo: 'Artigo',
  capitulo: 'Capítulo',
  livro: 'Livro',
  pdf: 'PDF',
  slides: 'Slides',
  link: 'Link',
}
export const KINDS = Object.keys(KIND_LABEL) as ContentKind[]

export const PHASE_LABEL: Record<ModulePhase, string> = { antes: 'Antes do módulo', durante: 'Durante', depois: 'Depois' }
export const REQUIREMENT_LABEL: Record<RequirementLevel, string> = {
  obrigatorio: 'Obrigatório',
  recomendado: 'Recomendado',
  complementar: 'Complementar',
}

export type CategoryVM = { id: string; name: string; slug: string; position: number; archived: boolean }
export type TopicVM = {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  synonyms: string[]
  archived: boolean
  mergedInto: string | null
}
export type FacultyMini = { id: string; name: string; honorific: string | null }
export type ModuleLink = {
  moduleId: string
  cohortId: string
  number: number | null
  title: string
  theme: string | null
  phase: ModulePhase
  requirement: RequirementLevel
  position: number
  note: string | null
}
export type AttachmentVM = { id: string; title: string; filePath: string | null; fileName: string | null; url: string | null; position: number }

export type ContentVM = {
  id: string
  kind: ContentKind
  title: string
  slug: string
  description: string | null
  categoryId: string
  category: string
  citation: string | null
  url: string | null
  filePath: string | null
  fileName: string | null
  videoId: string | null
  videoStatus: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  availableFrom: string | null
  status: ContentStatus
  publishedAt: string | null
  updatedAt: string
  topics: Array<Pick<TopicVM, 'id' | 'name' | 'slug'>>
  faculty: FacultyMini[]
  cohortIds: string[]
  modules: ModuleLink[]
  progress: { status: ProgressStatus; percent: number; positionSeconds: number; completedAt: string | null; updatedAt: string } | null
}

export type ProgressFilter = 'nao-iniciado' | 'em-andamento' | 'concluido'
export type LibraryFilters = {
  q: string
  area: string | null
  tema: string | null
  tipo: ContentKind | null
  prof: string | null
  modulo: string | null
  situacao: ProgressFilter | null
  ordem: 'relevancia' | 'recentes'
}

const PROGRESS_FILTERS: ProgressFilter[] = ['nao-iniciado', 'em-andamento', 'concluido']

/** Lê os filtros do endereço (?q=…&area=…). Valores desconhecidos são ignorados. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): LibraryFilters {
  const one = (k: string) => {
    const v = sp[k]
    const s = (Array.isArray(v) ? v[0] : v)?.trim()
    return s ? s.slice(0, 120) : null
  }
  const tipo = one('tipo')
  const situacao = one('situacao')
  const q = one('q') ?? ''
  return {
    q,
    area: one('area'),
    tema: one('tema'),
    tipo: tipo && (KINDS as string[]).includes(tipo) ? (tipo as ContentKind) : null,
    prof: one('prof'),
    modulo: one('modulo'),
    situacao: situacao && (PROGRESS_FILTERS as string[]).includes(situacao) ? (situacao as ProgressFilter) : null,
    ordem: one('ordem') === 'recentes' || !q ? 'recentes' : 'relevancia',
  }
}

export function hasFilters(f: LibraryFilters): boolean {
  return Boolean(f.q || f.area || f.tema || f.tipo || f.prof || f.modulo || f.situacao)
}

/** Monta o endereço com os filtros (para links que trocam um filtro mantendo os demais). */
export function filtersHref(f: LibraryFilters, change: Partial<Record<keyof LibraryFilters, string | null>> = {}, base = '/biblioteca'): string {
  const merged: Record<string, string | null> = { ...f, ...change } as Record<string, string | null>
  const params = new URLSearchParams()
  for (const k of ['q', 'area', 'tema', 'tipo', 'prof', 'modulo', 'situacao'] as const) {
    const v = merged[k]
    if (v) params.set(k, v)
  }
  if (merged.ordem === 'recentes' && merged.q) params.set('ordem', 'recentes')
  const s = params.toString()
  return s ? `${base}?${s}` : base
}

export function progressState(c: Pick<ContentVM, 'progress'>): ProgressFilter {
  if (!c.progress) return 'nao-iniciado'
  return c.progress.status === 'concluido' ? 'concluido' : 'em-andamento'
}

/**
 * Aplica os filtros. `ranked` = ids devolvidos pela busca do banco, na ordem de relevância
 * (null quando não há texto buscado).
 */
export function applyFilters<T extends ContentVM>(items: T[], f: LibraryFilters, ranked: string[] | null, categories: CategoryVM[], topics: TopicVM[]): T[] {
  const areaId = f.area ? categories.find((c) => c.slug === f.area)?.id ?? '∅' : null
  const topicId = f.tema ? topics.find((t) => t.slug === f.tema)?.id ?? '∅' : null
  const rank = ranked ? new Map(ranked.map((id, i) => [id, i])) : null
  const out = items.filter(
    (c) =>
      (!rank || rank.has(c.id)) &&
      (!areaId || c.categoryId === areaId) &&
      (!topicId || c.topics.some((t) => t.id === topicId)) &&
      (!f.tipo || c.kind === f.tipo) &&
      (!f.prof || c.faculty.some((p) => p.id === f.prof)) &&
      (!f.modulo || c.modules.some((m) => m.moduleId === f.modulo)) &&
      (!f.situacao || progressState(c) === f.situacao),
  )
  if (rank && f.ordem === 'relevancia') return out.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
  return out.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.title.localeCompare(b.title, 'pt-BR'))
}

/** Conteúdos que compartilham temas com este (mais temas em comum primeiro). */
export function relatedContents<T extends Pick<ContentVM, 'id' | 'topics' | 'publishedAt'>>(item: T, all: T[], limit = 4): T[] {
  const mine = new Set(item.topics.map((t) => t.id))
  if (!mine.size) return []
  return all
    .filter((c) => c.id !== item.id)
    .map((c) => ({ c, shared: c.topics.filter((t) => mine.has(t.id)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.c.publishedAt ?? '').localeCompare(a.c.publishedAt ?? ''))
    .slice(0, limit)
    .map((x) => x.c)
}

export function minutes(seconds: number | null): number | null {
  return seconds ? Math.max(1, Math.round(seconds / 60)) : null
}

export function facultyNames(list: FacultyMini[]): string {
  return list.map((f) => (f.honorific ? `${f.honorific} ${f.name}` : f.name)).join(', ')
}

/** "Fotografia odontológica" → "fotografia-odontologica" */
export function slugify(value: string, max = 80): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/g, '') || 'item'
  )
}

/** Sinônimos digitados separados por vírgula ou quebra de linha, sem repetidos (ignora maiúsculas). */
export function parseSynonyms(text: string, name = ''): string[] {
  const seen = new Set<string>([name.trim().toLowerCase()])
  const out: string[] = []
  for (const raw of text.split(/[,;\n]/)) {
    const s = raw.trim().replace(/\s+/g, ' ').slice(0, 80)
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase())
    out.push(s)
  }
  return out.slice(0, 40)
}

/** Conteúdo liberado agora? (admin e coordenação veem antes; o aluno só depois). */
export function isReleased(c: Pick<ContentVM, 'availableFrom'>, now = new Date()): boolean {
  return !c.availableFrom || new Date(c.availableFrom) <= now
}
