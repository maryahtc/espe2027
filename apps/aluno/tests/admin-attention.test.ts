import { describe, expect, it } from 'vitest'
import { type AttentionInput, attentionItems } from '@/lib/admin/attention'

const today = '2027-01-10'
const mod = (id: string, start: string | null, end: string | null, over: Partial<AttentionInput['modules'][number]> = {}) => ({
  id,
  label: id.slice(1).padStart(2, '0'),
  title: `Módulo ${id}`,
  status: 'publicado',
  start,
  end,
  teachers: 1,
  staffTeachers: 0,
  ...over,
})
const base = (over: Partial<AttentionInput> = {}): AttentionInput => ({ today, people: [], modules: [], prep: [], contents: [], workflowsDraft: 0, ...over })
const kinds = (input: AttentionInput) => attentionItems(input).map((i) => i.kind)

describe('Admin · Precisa da sua atenção — regras objetivas', () => {
  it('nada cadastrado de forma incompleta → lista vazia', () => {
    expect(attentionItems(base())).toEqual([])
  })

  it('convites pendentes: convidado, nunca entrou, não desativado (com a idade do mais antigo)', () => {
    const items = attentionItems(
      base({
        people: [
          { invited_at: '2027-01-02T12:00:00Z', last_sign_in_at: null, deactivated_at: null },
          { invited_at: '2027-01-08T12:00:00Z', last_sign_in_at: null, deactivated_at: null },
          { invited_at: '2027-01-01T12:00:00Z', last_sign_in_at: '2027-01-03T00:00:00Z', deactivated_at: null },
          { invited_at: '2026-12-01T12:00:00Z', last_sign_in_at: null, deactivated_at: '2026-12-20T00:00:00Z' },
          { invited_at: null, last_sign_in_at: null, deactivated_at: null },
        ],
      }),
    )
    expect(items).toEqual([{ kind: 'convite', tone: 'pendencia', text: '2 convites ainda não aceitos', href: '/admin/alunos', when: 'o mais antigo há 8 dias' }])
  })

  it('preparação: obrigatória em rascunho (pendência) × nenhuma preparação (editorial), só módulos publicados nos próximos 30 dias', () => {
    const items = attentionItems(
      base({
        modules: [
          mod('m1', '2027-01-20', '2027-01-22'), // em 10 dias, obrigatório em rascunho
          mod('m2', '2027-02-05', '2027-02-07'), // em 26 dias, nada cadastrado
          mod('m3', '2027-03-01', '2027-03-03'), // fora da janela
          mod('m4', '2027-01-15', '2027-01-16', { status: 'rascunho' }), // módulo em rascunho
          mod('m5', '2027-01-12', '2027-01-13'), // obrigatório publicado → nada
          mod('m6', '2027-01-09', '2027-01-11'), // já começou
        ],
        prep: [
          { moduleId: 'm1', requirement: 'obrigatorio', status: 'rascunho' },
          { moduleId: 'm1', requirement: 'recomendado', status: 'publicado' },
          { moduleId: 'm3', requirement: 'obrigatorio', status: 'rascunho' },
          { moduleId: 'm5', requirement: 'obrigatorio', status: 'publicado' },
        ],
      }),
    )
    expect(items.map((i) => [i.kind, i.tone, i.text, i.when])).toEqual([
      ['preparacao-rascunho', 'pendencia', 'Módulo 01 · Módulo m1: preparação obrigatória ainda em rascunho', 'começa em 10 dias'],
      ['sem-preparacao', 'editorial', 'Módulo 02 · Módulo m2: nenhuma preparação cadastrada', 'começa em 26 dias'],
    ])
  })

  it('preparação arquivada não conta como cadastrada', () => {
    expect(kinds(base({ modules: [mod('m1', '2027-01-20', '2027-01-22')], prep: [{ moduleId: 'm1', requirement: 'obrigatorio', status: 'arquivado' }] }))).toEqual(['sem-preparacao'])
  })

  it('conteúdo publicado sem tema (rascunho sem tema não entra)', () => {
    const items = attentionItems(base({ contents: [{ status: 'publicado', topics: 0 }, { status: 'publicado', topics: 0 }, { status: 'publicado', topics: 2 }, { status: 'rascunho', topics: 0 }] }))
    expect(items).toEqual([{ kind: 'conteudo-sem-tema', tone: 'pendencia', text: '2 conteúdos publicados sem tema', href: '/admin/conteudos' }])
  })

  it('módulo sem professor: publicado, com datas, não terminado, sem docente nas atividades nem na equipe', () => {
    const items = attentionItems(
      base({
        modules: [
          mod('m1', '2027-04-01', '2027-04-03', { teachers: 0, staffTeachers: 0 }),
          mod('m2', '2027-04-01', '2027-04-03', { teachers: 0, staffTeachers: 1 }),
          mod('m3', '2026-12-01', '2026-12-03', { teachers: 0, staffTeachers: 0 }), // já terminou
          mod('m4', null, null, { teachers: 0, staffTeachers: 0 }), // sem datas
          mod('m5', '2027-04-01', '2027-04-03', { teachers: 0, staffTeachers: 0, status: 'rascunho' }),
        ],
        prep: [{ moduleId: 'm1', requirement: 'obrigatorio', status: 'publicado' }],
      }),
    )
    expect(items.map((i) => [i.kind, i.text])).toEqual([['modulo-sem-professor', 'Módulo 01 · Módulo m1: sem professor definido']])
  })

  it('vários módulos sem professor: um item agregado, com o mais próximo', () => {
    const items = attentionItems(
      base({
        modules: [
          mod('m2', '2027-05-01', '2027-05-03', { teachers: 0, staffTeachers: 0 }),
          mod('m1', '2027-04-01', '2027-04-03', { teachers: 0, staffTeachers: 0 }),
          mod('m3', '2027-06-01', '2027-06-03', { teachers: 0, staffTeachers: 0 }),
        ],
        prep: ['m1', 'm2', 'm3'].map((moduleId) => ({ moduleId, requirement: 'obrigatorio', status: 'publicado' })),
      }),
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'modulo-sem-professor', tone: 'pendencia', text: '3 módulos publicados sem professor definido', href: '/admin/modulos' })
    expect(items[0]!.when).toMatch(/^o mais próximo: Módulo 01 · Módulo m1, /)
    expect(items[0]!.action).toBe('Definir professores em Módulos e cronograma')
  })

  it('pendências atrasadas do quadro: um item agrupado, primeiro da lista, com link filtrado', () => {
    const items = attentionItems(base({ tasksOverdue: 3, workflowsDraft: 1 }))
    expect(items[0]).toEqual({ kind: 'pendencia-atrasada', tone: 'pendencia', text: '3 pendências atrasadas no quadro', href: '/admin/pendencias?atrasadas=1' })
    expect(attentionItems(base({ tasksOverdue: 0 }))).toEqual([])
  })

  it('workflows em rascunho: lembrete editorial, não erro', () => {
    expect(attentionItems(base({ workflowsDraft: 1 }))).toEqual([{ kind: 'workflow-rascunho', tone: 'editorial', text: '1 workflow em rascunho', href: '/admin/workflows?status=rascunho' }])
  })

  it('prioridade: convites → preparação → conteúdos sem tema → módulos sem professor → workflows', () => {
    const k = kinds(
      base({
        workflowsDraft: 2,
        contents: [{ status: 'publicado', topics: 0 }],
        people: [{ invited_at: '2027-01-09T00:00:00Z', last_sign_in_at: null, deactivated_at: null }],
        modules: [mod('m1', '2027-01-20', '2027-01-22', { teachers: 0 })],
      }),
    )
    expect(k).toEqual(['convite', 'sem-preparacao', 'conteudo-sem-tema', 'modulo-sem-professor', 'workflow-rascunho'])
  })
})
