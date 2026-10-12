import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  type CategoryVM,
  type ContentVM,
  filtersHref,
  hasFilters,
  isReleased,
  parseFilters,
  parseSynonyms,
  relatedContents,
  slugify,
  type TopicVM,
} from '@/lib/library/model'

const cats: CategoryVM[] = [
  { id: 'c1', name: 'Materiais e Adesão', slug: 'materiais-e-adesao', position: 4, archived: false },
  { id: 'c2', name: 'Gestão', slug: 'gestao', position: 7, archived: false },
]
const tops: TopicVM[] = [
  { id: 't1', categoryId: 'c1', name: 'Adesão', slug: 'adesao', description: null, synonyms: [], archived: false, mergedInto: null },
  { id: 't2', categoryId: 'c2', name: 'Marketing odontológico', slug: 'marketing-odontologico', description: null, synonyms: [], archived: false, mergedInto: null },
]

function item(id: string, over: Partial<ContentVM> = {}): ContentVM {
  return {
    id,
    kind: 'pdf',
    title: `Conteúdo ${id}`,
    slug: id,
    description: null,
    categoryId: 'c1',
    category: 'Materiais e Adesão',
    citation: null,
    url: null,
    filePath: 'x.pdf',
    fileName: null,
    videoId: null,
    videoStatus: null,
    durationSeconds: null,
    availableFrom: null,
    status: 'publicado',
    publishedAt: '2027-01-01T00:00:00Z',
    updatedAt: '2027-01-01T00:00:00Z',
    topics: [],
    faculty: [],
    cohortIds: [],
    modules: [],
    progress: null,
    ...over,
  }
}

const a = item('a', { topics: [{ id: 't1', name: 'Adesão', slug: 'adesao' }], publishedAt: '2027-03-01T00:00:00Z' })
const b = item('b', { kind: 'video', categoryId: 'c2', topics: [{ id: 't2', name: 'Marketing', slug: 'marketing-odontologico' }], faculty: [{ id: 'f1', name: 'Thiago', honorific: null }] })
const c = item('c', {
  topics: [{ id: 't1', name: 'Adesão', slug: 'adesao' }],
  progress: { status: 'concluido', percent: 100, completedAt: 'x', updatedAt: 'x' },
  modules: [{ moduleId: 'm1', cohortId: 'k', number: 4, title: 'Módulo 4', theme: null, phase: 'antes', requirement: 'obrigatorio', position: 0, note: null }],
  publishedAt: '2027-02-01T00:00:00Z',
})
const all = [a, b, c]

describe('filtros da biblioteca', () => {
  it('lê o endereço e ignora valores desconhecidos', () => {
    const f = parseFilters({ q: ' adesivo ', tipo: 'pdf', situacao: 'qualquer', area: 'gestao' })
    expect(f).toMatchObject({ q: 'adesivo', tipo: 'pdf', situacao: null, area: 'gestao', ordem: 'relevancia' })
    expect(parseFilters({ tipo: 'hack' }).tipo).toBeNull()
    expect(hasFilters(parseFilters({}))).toBe(false)
  })

  it('combina área, tema, tipo, professor, módulo e situação', () => {
    const f = (sp: Record<string, string>) => applyFilters(all, parseFilters(sp), null, cats, tops).map((x) => x.id)
    expect(f({ area: 'gestao' })).toEqual(['b'])
    expect(f({ tema: 'adesao' })).toEqual(['a', 'c'])
    expect(f({ tipo: 'video' })).toEqual(['b'])
    expect(f({ prof: 'f1' })).toEqual(['b'])
    expect(f({ modulo: 'm1' })).toEqual(['c'])
    expect(f({ situacao: 'concluido' })).toEqual(['c'])
    expect(f({ situacao: 'nao-iniciado' })).toEqual(['a', 'b'])
    expect(f({ tema: 'nao-existe' })).toEqual([])
  })

  it('com busca: só o que o banco encontrou, na ordem de relevância', () => {
    expect(applyFilters(all, parseFilters({ q: 'x' }), ['c', 'a'], cats, tops).map((x) => x.id)).toEqual(['c', 'a'])
    expect(applyFilters(all, parseFilters({ q: 'x', ordem: 'recentes' }), ['c', 'a'], cats, tops).map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('links que trocam um filtro mantêm os demais', () => {
    const f = parseFilters({ q: 'resina', tipo: 'pdf' })
    expect(filtersHref(f, { area: 'gestao' })).toBe('/biblioteca?q=resina&area=gestao&tipo=pdf')
    expect(filtersHref(parseFilters({}))).toBe('/biblioteca')
  })
})

describe('regras da biblioteca', () => {
  it('relacionados: mesmos temas, sem o próprio', () => {
    expect(relatedContents(a, all).map((x) => x.id)).toEqual(['c'])
    expect(relatedContents(item('z'), all)).toEqual([])
  })

  it('sinônimos: separados por vírgula, sem repetidos nem o próprio nome', () => {
    expect(parseSynonyms('adesivo, Adesivo, sistema adesivo\nhibridização, adesão', 'Adesão')).toEqual(['adesivo', 'sistema adesivo', 'hibridização'])
  })

  it('slug sem acento e liberação por data', () => {
    expect(slugify('Prótese sobre implante — PSI')).toBe('protese-sobre-implante-psi')
    expect(isReleased({ availableFrom: '2030-01-01T00:00:00Z' }, new Date('2029-12-31T00:00:00Z'))).toBe(false)
    expect(isReleased({ availableFrom: null })).toBe(true)
  })
})
