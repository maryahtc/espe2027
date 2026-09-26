/**
 * Busca global sobre o PublicDataset (roda no servidor).
 *
 * - Normaliza acentos, maiúsculas, pontuação e espaços ("mock-up" = "mock up").
 * - Todos os termos precisam aparecer (E lógico), como início de palavra
 *   ("cera" → "cerâmica") ou, para termos com 4+ letras, em qualquer posição.
 * - Resultados agrupados por tipo e ordenados por relevância.
 */
import { CLASS_TYPES } from '@/config/vocab'
import { formatDayMonth } from '@/lib/dates'
import { moduleHref, moduleLabel, moduleWhen, professorHref } from '@/lib/domain/selectors'
import { normalizeText, padModuleNumber, tokenize } from '@/lib/text'
import type { PublicDataset } from '@/schemas/public'

export type SearchKind = 'professor' | 'module' | 'class' | 'material' | 'equipment'

export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  professor: 'Professores',
  module: 'Módulos',
  class: 'Aulas',
  material: 'Materiais',
  equipment: 'Equipamentos',
}

const KIND_PRIORITY: SearchKind[] = ['professor', 'module', 'class', 'material', 'equipment']

type Entry = {
  kind: SearchKind
  id: string
  title: string
  subtitle: string
  href: string
  primary: string
  words: string[]
  text: string
  order: number
}

export type SearchHit = Pick<Entry, 'kind' | 'id' | 'title' | 'subtitle' | 'href'> & { score: number }
export type SearchGroup = { kind: SearchKind; label: string; hits: SearchHit[]; total: number }

function entry(base: Omit<Entry, 'primary' | 'words' | 'text'>, primary: string, ...others: (string | null | undefined)[]): Entry {
  const normalizedPrimary = normalizeText(primary)
  const text = normalizeText([primary, ...others].filter(Boolean).join(' '))
  return { ...base, primary: normalizedPrimary, words: text.split(' '), text }
}

export function buildSearchIndex(ds: PublicDataset): Entry[] {
  const professors = new Map(ds.professors.map((p) => [p.slug, p]))
  const names = (slugs: string[]) => slugs.map((s) => professors.get(s)?.name).filter(Boolean) as string[]
  const entries: Entry[] = []

  for (const p of ds.professors) {
    const modules = [...new Set(ds.classes.filter((c) => c.professorSlugs.includes(p.slug)).map((c) => c.moduleNumber))]
    entries.push(
      entry(
        {
          kind: 'professor',
          id: p.slug,
          title: p.name,
          subtitle: [p.specialty, modules.length ? `Módulos ${modules.map(padModuleNumber).join(', ')}` : null]
            .filter(Boolean)
            .join(' · '),
          href: professorHref(p.slug),
          order: 0,
        },
        p.name,
        p.specialty,
      ),
    )
  }

  for (const m of ds.modules) {
    entries.push(
      entry(
        {
          kind: 'module',
          id: m.slug,
          title: `${moduleLabel(m)}${m.title ? ` · ${m.title}` : ''}`,
          subtitle: moduleWhen(m),
          href: moduleHref(m),
          order: m.number,
        },
        m.title ?? moduleLabel(m),
        `modulo ${m.number} modulo ${m.slug}`,
        m.description,
        moduleWhen(m),
      ),
    )
  }

  for (const c of ds.classes) {
    const profs = names(c.professorSlugs)
    entries.push(
      entry(
        {
          kind: 'class',
          id: c.id,
          title: c.title,
          subtitle: [
            `Módulo ${padModuleNumber(c.moduleNumber)}`,
            c.date ? formatDayMonth(c.date) : null,
            profs.join(', ') || null,
          ]
            .filter(Boolean)
            .join(' · '),
          href: `${moduleHref({ number: c.moduleNumber })}#${c.id}`,
          order: c.moduleNumber * 1000 + ds.classes.indexOf(c),
        },
        c.title,
        c.description,
        c.type ? CLASS_TYPES[c.type].label : null,
        ...profs,
      ),
    )
  }

  for (const item of ds.materials) {
    entries.push(
      entry(
        {
          kind: 'material',
          id: item.id,
          title: item.name,
          subtitle: [`Módulo ${padModuleNumber(item.moduleNumber)}`, item.brandSpec].filter(Boolean).join(' · '),
          href: `${moduleHref({ number: item.moduleNumber })}#materiais`,
          order: item.moduleNumber,
        },
        item.name,
        item.brandSpec,
        item.category,
      ),
    )
  }

  for (const item of ds.equipment) {
    entries.push(
      entry(
        {
          kind: 'equipment',
          id: item.id,
          title: item.name,
          subtitle: [
            item.category,
            item.moduleNumbers.length ? `Módulos ${item.moduleNumbers.map(padModuleNumber).join(', ')}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          href: `/equipamentos?q=${encodeURIComponent(item.name)}`,
          order: 0,
        },
        item.name,
        item.category,
      ),
    )
  }
  return entries
}

function termMatches(entry: Entry, term: string): boolean {
  if (entry.words.some((w) => w.startsWith(term))) return true
  return term.length >= 4 && entry.text.includes(term)
}

function score(entry: Entry, query: string, terms: string[]): number {
  if (entry.primary === query) return 100
  if (entry.primary.startsWith(query)) return 80
  const primaryWords = entry.primary.split(' ')
  if (terms.every((t) => primaryWords.some((w) => w.startsWith(t)))) return 60
  return 30
}

export function search(ds: PublicDataset, rawQuery: string, perGroup = 5): SearchGroup[] {
  const terms = tokenize(rawQuery)
  if (terms.length === 0) return []
  const query = terms.join(' ')

  const hits = buildSearchIndex(ds)
    .filter((e) => terms.every((t) => termMatches(e, t)))
    .map((e) => ({ entry: e, score: score(e, query, terms) }))
    .sort((a, b) => b.score - a.score || a.entry.order - b.entry.order)

  const groups = KIND_PRIORITY.map((kind) => {
    const inGroup = hits.filter((h) => h.entry.kind === kind)
    return {
      kind,
      label: SEARCH_GROUP_LABELS[kind],
      total: inGroup.length,
      best: inGroup[0]?.score ?? 0,
      hits: inGroup.slice(0, perGroup).map(({ entry: e, score: s }) => ({
        kind: e.kind,
        id: e.id,
        title: e.title,
        subtitle: e.subtitle,
        href: e.href,
        score: s,
      })),
    }
  }).filter((g) => g.total > 0)

  // Grupo com o resultado mais relevante vem primeiro; empate segue a prioridade padrão.
  return groups
    .sort((a, b) => b.best - a.best || KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind))
    .map(({ best: _best, ...group }) => group)
}
