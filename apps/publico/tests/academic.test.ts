import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoWorkbook, PRIVATE_SENTINEL } from '@fixtures/workbook'
import { type AcademicRows, mapAcademic } from '@/server/data/academic/map'
import { fetchAcademicRows, readSupabaseConfigFromEnv } from '@/server/data/academic/supabase'
import { buildFromWorkbook, buildPortalData } from '@/server/data/pipeline/build'
import { createAcademicLoader } from '@/server/data/source'
import { MemoryWorkbook } from '@/server/data/store/memory'
import { optionsFromDataset } from '@/server/editing/options'

const NOW = new Date('2026-10-08T12:00:00Z')
const M1 = '00000000-0000-4000-d000-000000000001'
const M3 = '00000000-0000-4000-d000-000000000003'
const F1 = '00000000-0000-4000-c000-0000000000f1'
const F2 = '00000000-0000-4000-c000-0000000000f2'

/** Linhas como as visões públicas devolvem (inclui um campo extra para provar que nada além do DTO sai). */
function rows(): AcademicRows {
  return {
    modules: [
      { id: M3, number: 3, position: 3, title: 'Módulo 3', theme: null, description: null, starts_on: null, ends_on: null, staff_ids: [] },
      {
        id: M1,
        number: 1,
        position: 1,
        title: 'Módulo 1',
        theme: 'Fotografia e planejamento',
        description: 'Descrição pública',
        starts_on: '2027-02-11',
        ends_on: '2027-02-13',
        staff_ids: [F2],
        // @ts-expect-error campo que não existe na visão: o portão de saída precisa descartá-lo
        internal_notes: 'NOTA INTERNA',
      },
    ],
    schedule: [
      {
        id: 's2', module_id: M1, date: '2027-02-12', day_number: 2, period: 'dia_todo', starts_at: null, ends_at: null,
        title: 'Clínica', description: null, activity_type: 'clinica', position: 0, faculty_ids: [], tentative: false,
      },
      {
        id: 's1', module_id: M1, date: '2027-02-11', day_number: 1, period: 'manha', starts_at: '08:30:00', ends_at: '12:00:00',
        title: 'Fotografia odontológica', description: ' Teoria ', activity_type: 'hands_on', position: 0, faculty_ids: [F1], tentative: true,
      },
    ],
    teachers: [
      { id: F1, display_name: 'Maria Souza', honorific: 'Dra.', specialty: 'Prótese', short_bio: 'Bio' },
      { id: F2, display_name: 'João Silva', honorific: null, specialty: null, short_bio: null },
    ],
  }
}

afterEach(() => vi.unstubAllEnvs())

describe('banco → DTO público', () => {
  const data = mapAcademic(rows())

  it('módulos: tema vira o título público; "Módulo N" provisório não aparece como título', () => {
    expect(data.modules.map((m) => [m.number, m.slug, m.title])).toEqual([
      [1, '01', 'Fotografia e planejamento'],
      [3, '03', null],
    ])
  })

  it('módulo sem dias fica "a confirmar"; com dias, datas e mês vêm dos dias', () => {
    expect(data.modules[0]).toMatchObject({ startDate: '2027-02-11', endDate: '2027-02-13', month: '2027-02', status: 'confirmado' })
    expect(data.modules[1]).toMatchObject({ startDate: null, endDate: null, month: null, status: 'a-confirmar' })
  })

  it('aulas: ordem por data e turno, horário HH:MM, vocabulário convertido, "a confirmar" pelo professor', () => {
    expect(data.classes.map((c) => c.id)).toEqual(['m01-a01', 'm01-a02'])
    expect(data.classes[0]).toMatchObject({
      day: 1, start: '08:30', end: '12:00', period: 'manha', type: 'hands-on', description: 'Teoria',
      status: 'a-confirmar', professorSlugs: ['maria-souza'],
    })
    expect(data.classes[1]).toMatchObject({ period: 'integral', type: 'clinica', status: 'confirmado', publicNotes: null })
  })

  it('professores: tratamento no nome; equipe visível entra no módulo', () => {
    expect(data.professors.map((p) => p.name)).toEqual(['Dra. Maria Souza', 'João Silva'])
    expect(data.modules[0]!.professorSlugs).toEqual(['maria-souza', 'joao-silva'])
    expect(data.findProfessor('maria souza')).toBe('maria-souza')
    expect(data.findProfessor('Dra. Maria Souza')).toBe('maria-souza')
    expect(data.findProfessor('Fulano')).toBeNull()
  })
})

describe('portal com o banco: acadêmico do Admin, logística da planilha', () => {
  const academic = mapAcademic(rows())
  const { dataset, report } = buildFromWorkbook(demoWorkbook, 'mock', NOW, academic)

  it('ignora MÓDULOS, AULAS e PROFESSORES da planilha', () => {
    expect(report.academicSource).toBe('banco')
    expect(dataset.modules.map((m) => m.number)).toEqual([1, 3])
    expect(dataset.classes).toHaveLength(2)
    expect(dataset.professors.map((p) => p.slug)).toEqual(['maria-souza', 'joao-silva'])
  })

  it('materiais continuam ligados pelo número do módulo e pelo nome do professor', () => {
    const m1 = dataset.materials.filter((m) => m.moduleNumber === 1)
    expect(m1.length).toBeGreaterThan(0)
    expect(m1.every((m) => m.moduleSlug === '01' && m.professorSlug === 'maria-souza')).toBe(true)
    expect(dataset.materials.find((m) => m.moduleNumber === 3)?.professorSlug).toBe('joao-silva')
  })

  it('nada interno sai: campos fora do DTO são descartados e colunas privadas da planilha nunca são lidas', () => {
    const json = JSON.stringify(dataset)
    expect(json).not.toContain('NOTA INTERNA')
    expect(json).not.toMatch(PRIVATE_SENTINEL)
  })

  it('sem pedir as abas acadêmicas à planilha', async () => {
    const wb = new MemoryWorkbook(demoWorkbook)
    const source = wb.source('mock')
    const asked: string[] = []
    const spy = { kind: source.kind, fetchTabs: (names: string[]) => (asked.push(...names), source.fetchTabs(names)) }
    await buildPortalData(spy, NOW, async () => academic)
    expect(asked).not.toContain('MÓDULOS')
    expect(asked).not.toContain('AULAS')
    expect(asked).not.toContain('PROFESSORES')
    expect(asked).toContain('MATERIAIS POR MÓDULO')
  })

  it('opções da área de logística (módulo e professor) vêm do Admin', () => {
    const options = optionsFromDataset(dataset)
    expect(options.modules).toEqual([
      { value: '1', label: 'Módulo 01 · FEV · Fotografia e planejamento' },
      { value: '3', label: 'Módulo 03 · tema a confirmar' },
    ])
    expect(options.professors).toEqual(['Dra. Maria Souza', 'João Silva'])
  })
})

describe('leitura do banco', () => {
  it('lê só as três visões públicas, com a chave pública', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> })
      return new Response('[]', { status: 200 })
    }) as unknown as typeof fetch
    await fetchAcademicRows({ url: 'https://exemplo.supabase.co', key: 'sb_publishable_x' }, fake)
    expect(calls.map((c) => c.url).sort()).toEqual([
      'https://exemplo.supabase.co/rest/v1/public_modules?select=*',
      'https://exemplo.supabase.co/rest/v1/public_schedule?select=*',
      'https://exemplo.supabase.co/rest/v1/public_teachers?select=*',
    ])
    expect(calls.every((c) => c.headers.apikey === 'sb_publishable_x' && !('Authorization' in c.headers))).toBe(true)
  })

  it('falha do banco lança erro (o portal mantém a última versão válida)', async () => {
    const fake = (async () => new Response('erro', { status: 503 })) as unknown as typeof fetch
    await expect(fetchAcademicRows({ url: 'https://x.supabase.co', key: 'sb_publishable_x' }, fake)).rejects.toThrow('503')
  })

  it('recusa a chave secreta', () => {
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_secret_abc')
    expect(() => readSupabaseConfigFromEnv()).toThrow('chave secreta')
  })

  it('em produção o banco é obrigatório; em prévia local sem banco usa a planilha de exemplo', () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(createAcademicLoader()).toBeNull()
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(() => createAcademicLoader()).toThrow('configure SUPABASE_URL')
  })
})
