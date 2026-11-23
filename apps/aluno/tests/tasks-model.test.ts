import { describe, expect, it } from 'vitest'
import { canEditTask, dependencyGroups, filterTasks, isOverdue, missingQuantity, parseFilters, sortTasks, type TaskVM, taskCounts } from '@/lib/tasks/model'

const TODAY = '2026-11-23'
let seq = 0
const t = (over: Partial<TaskVM> = {}): TaskVM => ({
  id: `00000000-0000-4000-a000-${String(++seq).padStart(12, '0')}`,
  cohortId: 'c1',
  cohortName: 'Turma',
  moduleId: null,
  moduleLabel: null,
  category: 'administrativo',
  title: `Pendência ${seq}`,
  details: null,
  responsibleId: null,
  responsibleName: null,
  dueDate: null,
  priority: 'media',
  status: 'aberta',
  nextAction: null,
  dependsOnId: null,
  dependsOnTitle: null,
  dependencyNote: null,
  quantityNeeded: null,
  quantityAvailable: null,
  partnerName: null,
  linkUrl: null,
  completedAt: null,
  updatedAt: '2026-11-20T10:00:00Z',
  ...over,
})

describe('quadro de pendências: regras', () => {
  it('atrasada = prazo antes de hoje e ainda em aberto (aguardando também conta)', () => {
    expect(isOverdue(t({ dueDate: '2026-11-22' }), TODAY)).toBe(true)
    expect(isOverdue(t({ dueDate: '2026-11-22', status: 'aguardando' }), TODAY)).toBe(true)
    expect(isOverdue(t({ dueDate: TODAY }), TODAY)).toBe(false) // vence hoje: ainda não atrasada
    expect(isOverdue(t({ dueDate: '2026-11-01', status: 'concluida' }), TODAY)).toBe(false)
    expect(isOverdue(t({ dueDate: '2026-11-01', status: 'cancelada' }), TODAY)).toBe(false)
    expect(isOverdue(t(), TODAY)).toBe(false) // sem prazo
  })

  it('quanto falta só com as duas quantidades; nunca negativo', () => {
    expect(missingQuantity(t({ quantityNeeded: 12, quantityAvailable: 4 }))).toBe(8)
    expect(missingQuantity(t({ quantityNeeded: 2, quantityAvailable: 5 }))).toBe(0)
    expect(missingQuantity(t({ quantityNeeded: 2 }))).toBeNull()
  })

  it('ordem: em aberto primeiro, atrasadas antes, depois prazo, prioridade e nome; encerradas no fim', () => {
    const semPrazoAlta = t({ title: 'B sem prazo alta', priority: 'alta' })
    const prazoLonge = t({ title: 'C prazo longe', dueDate: '2027-01-10' })
    const atrasada = t({ title: 'D atrasada', dueDate: '2026-11-20' })
    const prazoPerto = t({ title: 'E prazo perto', dueDate: '2026-11-25' })
    const concluida = t({ title: 'A concluída', status: 'concluida', completedAt: '2026-11-21T00:00:00Z' })
    const cancelada = t({ title: 'F cancelada', status: 'cancelada' })
    expect(sortTasks([concluida, semPrazoAlta, prazoLonge, cancelada, atrasada, prazoPerto], TODAY).map((x) => x.title)).toEqual([
      'D atrasada',
      'E prazo perto',
      'C prazo longe',
      'B sem prazo alta',
      'A concluída',
      'F cancelada',
    ])
  })

  it('filtros: sem situação mostra só em aberto; categoria, módulo, responsável, turma geral e atrasadas', () => {
    const list = [
      t({ category: 'materiais', moduleId: 'm1', responsibleId: 'p1' }),
      t({ category: 'equipamentos', cohortId: null, dueDate: '2026-11-01' }),
      t({ status: 'concluida' }),
    ]
    expect(filterTasks(list, {}, TODAY)).toHaveLength(2)
    expect(filterTasks(list, { status: 'todas' }, TODAY)).toHaveLength(3)
    expect(filterTasks(list, { status: 'concluida' }, TODAY)).toHaveLength(1)
    expect(filterTasks(list, { category: 'materiais' }, TODAY)).toHaveLength(1)
    expect(filterTasks(list, { moduleId: 'm1', responsibleId: 'p1' }, TODAY)).toHaveLength(1)
    expect(filterTasks(list, { cohortId: 'geral' }, TODAY).map((x) => x.category)).toEqual(['equipamentos'])
    expect(filterTasks(list, { overdue: true }, TODAY)).toHaveLength(1)
  })

  it('contagens do painel', () => {
    const list = [t({ priority: 'alta', dueDate: '2026-11-01' }), t({ status: 'aguardando' }), t({ status: 'concluida' }), t({ status: 'cancelada', priority: 'alta' })]
    expect(taskCounts(list, TODAY)).toEqual({ open: 2, overdue: 1, highPriority: 1, waiting: 1, done: 1 })
  })

  it('filtros do endereço ignoram valores inválidos', () => {
    expect(parseFilters({ categoria: 'foto_video', situacao: 'todas', modulo: 'x', atrasadas: '1', turma: 'geral' })).toEqual({
      category: 'foto_video',
      status: 'todas',
      priority: undefined,
      moduleId: undefined,
      responsibleId: undefined,
      cohortId: 'geral',
      overdue: true,
    })
    expect(parseFilters({ categoria: 'financeiro', situacao: 'feito' })).toMatchObject({ category: undefined, status: undefined })
  })

  it('quem edita: Admin tudo; coordenação só pendências de turma (gerais somente leitura)', () => {
    expect(canEditTask(t({ cohortId: null }), true)).toBe(true)
    expect(canEditTask(t({ cohortId: null }), false)).toBe(false)
    expect(canEditTask(t({ cohortId: 'c1' }), false)).toBe(true)
  })

  it('"Depende de": só em aberto, mesma turma, nunca a própria; coordenação sem o grupo das gerais', () => {
    const a = t({ title: 'A turma 1', cohortId: 'c1', cohortName: 'Turma 1' })
    const b = t({ title: 'B turma 1', cohortId: 'c1', cohortName: 'Turma 1' })
    const fechada = t({ title: 'C turma 1 concluída', cohortId: 'c1', cohortName: 'Turma 1', status: 'concluida' })
    const outra = t({ title: 'D turma 2', cohortId: 'c2', cohortName: 'Turma 2' })
    const geral = t({ title: 'E geral', cohortId: null })
    const all = [a, b, fechada, outra, geral]
    // Editando "a": só "b" (mesma turma, em aberto, não a própria)
    expect(dependencyGroups(all, { current: a, isAdmin: true })).toEqual([{ cohortId: 'c1', label: 'Turma 1', tasks: [{ id: b.id, title: 'B turma 1' }] }])
    // Editando a geral: só outras gerais (nenhuma aqui)
    expect(dependencyGroups(all, { current: geral, isAdmin: true })).toEqual([])
    // Criando (Admin): agrupadas por turma, gerais primeiro
    expect(dependencyGroups(all, { isAdmin: true }).map((g) => [g.label, g.tasks.length])).toEqual([
      ['Gerais (sem turma)', 1],
      ['Turma 1', 2],
      ['Turma 2', 1],
    ])
    // Criando (coordenação): sem o grupo das gerais
    expect(dependencyGroups(all, { isAdmin: false }).some((g) => g.cohortId === null)).toBe(false)
  })
})
