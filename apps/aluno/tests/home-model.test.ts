import { describe, expect, it } from 'vitest'
import { assignStates, type EventVM, type ModuleVM } from '@/lib/academic/model'
import { agenda, homeMoment, inPrepWindow, type LibraryLink, pending, recentlyFinished, requiredSoFar } from '@/lib/home/model'

const cohort = { startsOn: '2027-02-01', endsOn: '2028-07-31', status: 'ativa' as const }

function mod(id: string, number: number, dates: string[], state: ModuleVM['state'] = 'upcoming'): ModuleVM {
  return {
    id,
    cohortId: 'c',
    position: number,
    number,
    label: String(number).padStart(2, '0'),
    title: `Módulo ${number}`,
    theme: null,
    description: null,
    location: null,
    workloadHours: null,
    preparation: null,
    materialsNotes: null,
    status: 'publicado',
    publishedAt: null,
    datesChangedAt: null,
    start: dates[0] ?? null,
    end: dates.at(-1) ?? null,
    days: dates.map((date, i) => ({
      id: `${id}-d${i}`,
      date,
      label: null,
      note: null,
      sessions: [{ id: `${id}-s${i}`, period: 'manha', startsAt: '08:30:00', endsAt: '12:00:00', title: 'Teórica', description: null, type: 'teorica', position: 0, faculty: [] }],
    })),
    teachers: [],
    staff: [],
    state,
  }
}

const course = (today: string) =>
  assignStates([mod('m1', 1, ['2027-02-11', '2027-02-12', '2027-02-13']), mod('m2', 2, ['2027-03-18', '2027-03-19', '2027-03-20']), mod('m3', 3, ['2027-04-22'])], today)

const lib = (over: Partial<LibraryLink>): LibraryLink => ({
  contentId: 'x',
  slug: 'x',
  title: 'Conteúdo',
  kind: 'video',
  phase: 'antes',
  requirement: 'obrigatorio',
  progress: null,
  ...over,
})

describe('momento da Início', () => {
  it('antes do início da turma, durante e antes de um módulo, encerrada, sem módulos', () => {
    expect(homeMoment(cohort, course('2026-10-13')[0]!, '2026-10-13')).toBe('antes-inicio')
    const during = course('2027-02-12')
    expect(homeMoment(cohort, during[0]!, '2027-02-12')).toBe('durante-modulo')
    const between = course('2027-02-20')
    expect(homeMoment(cohort, between[1]!, '2027-02-20')).toBe('antes-modulo')
    expect(homeMoment({ ...cohort, status: 'encerrada' }, between[1]!, '2027-02-20')).toBe('encerrada')
    expect(homeMoment(cohort, null, '2028-08-01')).toBe('encerrada')
    expect(homeMoment(cohort, null, '2027-02-20')).toBe('sem-modulos')
  })
})

describe('janela de preparação (30 dias)', () => {
  it('fora da janela antes de 30 dias; dentro a partir de 30 dias e durante o módulo', () => {
    expect(inPrepWindow(course('2026-10-13')[0]!, '2026-10-13')).toBe(false)
    expect(inPrepWindow(course('2027-01-11')[0]!, '2027-01-11')).toBe(false) // 31 dias
    expect(inPrepWindow(course('2027-01-12')[0]!, '2027-01-12')).toBe(true) // 30 dias
    expect(inPrepWindow(course('2027-02-13')[0]!, '2027-02-13')).toBe(true) // último dia
    expect(inPrepWindow(null, '2027-02-13')).toBe(false)
  })
})

describe('pendências', () => {
  const base = { materials: [{ checked: true }, { checked: false }], focusDeadlines: [{ title: 'Entrega: Fotos', date: '2027-02-10', href: '/m1' }], otherDeadlines: [] }
  const library = [
    lib({ contentId: 'a', progress: 'concluido' }),
    lib({ contentId: 'b' }),
    lib({ contentId: 'c', requirement: 'recomendado' }),
    lib({ contentId: 'd', phase: 'durante' }),
    lib({ contentId: 'e', phase: 'depois' }),
  ]

  it('fora da janela: nenhuma pendência de preparação, nenhum prazo do módulo — sensação de calma', () => {
    const p = pending({ ...base, focus: course('2026-10-13')[0]!, today: '2026-10-13', library })
    expect(p.required).toEqual({ done: 0, total: 0, open: [] })
    expect(p.materials).toEqual({ checked: 0, total: 0 })
    expect(p.deadlines).toEqual([])
    expect(p.clear).toBe(true)
  })

  it('dentro da janela: obrigatórios de "antes", materiais e prazos do módulo', () => {
    const p = pending({ ...base, focus: course('2027-01-20')[0]!, today: '2027-01-20', library })
    expect(p.required.total).toBe(2)
    expect(p.required.done).toBe(1)
    expect(p.required.open.map((l) => l.contentId)).toEqual(['b'])
    expect(p.materials).toEqual({ checked: 1, total: 2 })
    expect(p.deadlines.map((d) => d.title)).toEqual(['Entrega: Fotos'])
    expect(p.clear).toBe(false)
  })

  it('durante o módulo: inclui obrigatórios de "durante"; prazo vencido sai da lista', () => {
    const p = pending({ ...base, focus: course('2027-02-12')[0]!, today: '2027-02-12', library })
    expect(p.required.open.map((l) => l.contentId)).toEqual(['b', 'd'])
    expect(p.deadlines).toEqual([])
  })

  it('prazos de outros módulos ou da turma entram só se vencem em até 14 dias, mesmo fora da janela', () => {
    const otherDeadlines = [
      { title: 'Entrega: Relatório', date: '2026-10-25', href: '/x' },
      { title: 'Entrega: Longe', date: '2026-11-20', href: '/y' },
    ]
    const p = pending({ ...base, otherDeadlines, focus: course('2026-10-13')[0]!, today: '2026-10-13', library })
    expect(p.deadlines.map((d) => d.title)).toEqual(['Entrega: Relatório'])
    expect(p.clear).toBe(false)
  })

  it('tudo em dia dentro da janela', () => {
    const p = pending({
      focus: course('2027-01-20')[0]!,
      today: '2027-01-20',
      library: [lib({ progress: 'concluido' })],
      materials: [{ checked: true }],
      focusDeadlines: [],
      otherDeadlines: [],
    })
    expect(p.clear).toBe(true)
    expect(p.required).toMatchObject({ done: 1, total: 1 })
  })
})

describe('próximas atividades', () => {
  const events: EventVM[] = [
    { id: 'e1', date: '2027-02-05', startsAt: '20:00:00', title: 'Aula online', description: null, kind: 'online', status: 'publicado' },
    { id: 'e2', date: '2027-02-06', startsAt: null, title: 'Rascunho', description: null, kind: 'outro', status: 'rascunho' },
    { id: 'e3', date: '2027-02-11', startsAt: null, title: 'Entrega: Fotos', description: null, kind: 'prazo', status: 'publicado', fromModuleId: 'm1' },
    { id: 'e4', date: '2027-01-01', startsAt: null, title: 'Passado', description: null, kind: 'outro', status: 'publicado' },
  ]

  it('dias de módulo e eventos publicados, em ordem, nos próximos 30 dias', () => {
    const items = agenda(course('2027-02-01'), events, '2027-02-01')
    expect(items.map((i) => [i.date, i.title])).toEqual([
      ['2027-02-05', 'Aula online'],
      ['2027-02-11', 'Módulo 01 · Dia 1 de 3'],
      ['2027-02-11', 'Entrega: Fotos'],
      ['2027-02-12', 'Módulo 01 · Dia 2 de 3'],
      ['2027-02-13', 'Módulo 01 · Dia 3 de 3'],
    ])
    expect(items[1]!.detail).toBe('Teórica · 08:30')
    expect(items[2]!.href).toBe('/modulos/m1')
  })

  it('no máximo 5 itens e nada além de 30 dias', () => {
    expect(agenda(course('2027-02-01'), events, '2027-02-01')).toHaveLength(5)
    expect(agenda(course('2026-10-13'), events, '2026-10-13')).toEqual([])
    expect(agenda(course('2027-03-01'), [], '2027-03-01').map((i) => i.date)).toEqual(['2027-03-18', '2027-03-19', '2027-03-20'])
  })
})

describe('depois do módulo e obrigatórios até aqui', () => {
  it('último módulo concluído há até 30 dias', () => {
    expect(recentlyFinished(course('2027-02-20'), '2027-02-20')?.id).toBe('m1')
    expect(recentlyFinished(course('2027-03-16'), '2027-03-16')).toBeNull()
    expect(recentlyFinished(course('2027-03-25'), '2027-03-25')?.id).toBe('m2')
  })

  it('obrigatórios dos módulos concluídos e do módulo em foco', () => {
    const ms = course('2027-02-20')
    const contents = [
      { id: 'a', progress: { status: 'concluido' }, modules: [{ moduleId: 'm1', requirement: 'obrigatorio' }] },
      { id: 'b', progress: null, modules: [{ moduleId: 'm2', requirement: 'obrigatorio' }] },
      { id: 'c', progress: null, modules: [{ moduleId: 'm3', requirement: 'obrigatorio' }] },
      { id: 'd', progress: null, modules: [{ moduleId: 'm1', requirement: 'recomendado' }] },
    ]
    expect(requiredSoFar(contents, ms, 'm2')).toEqual({ done: 1, total: 2 })
  })
})
