import { describe, expect, it } from 'vitest'
import { eachDay, monthGrid, monthRange, shiftMonth } from '@/lib/calendar'
import { CONTINUE, enumeratePaths, resolvePath, stepOrder, validateGraph, type WorkflowGraph } from '@/lib/workflow'

describe('calendário', () => {
  it('monta semanas de segunda a domingo cobrindo o mês', () => {
    const weeks = monthGrid('2028-03') // 1º de março de 2028 é quarta
    expect(weeks[0]!.map((c) => c.date)[0]).toBe('2028-02-28')
    expect(weeks[0]![2]).toEqual({ date: '2028-03-01', inMonth: true })
    expect(weeks.at(-1)!.at(-1)!.date).toBe('2028-04-02')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
  it('navega entre meses e lista intervalos', () => {
    expect(shiftMonth('2027-12', 1)).toBe('2028-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(monthRange('2027-11', '2028-02')).toEqual(['2027-11', '2027-12', '2028-01', '2028-02'])
    expect(eachDay('2028-03-30', '2028-04-01')).toEqual(['2028-03-30', '2028-03-31', '2028-04-01'])
  })
})

const graph: WorkflowGraph = {
  start: 'q1',
  nodes: {
    q1: {
      type: 'pergunta',
      title: 'Qual é a principal alteração?',
      options: [
        { key: 'cor', label: 'Cor', next: 'g1' },
        { key: 'forma', label: 'Forma', next: 'r1' },
      ],
    },
    g1: { type: 'orientacao', title: 'Antes de decidir, observe…', next: 'r1', contents: [{ slug: 'aula-a' }] },
    r1: { type: 'resultado', title: 'Caminhos possíveis', paths: [{ name: 'A', criteria: ['x'] }] },
  },
}

describe('workflow', () => {
  it('resolve o caminho da URL e monta a trilha', () => {
    const r = resolvePath(graph, ['cor', CONTINUE])!
    expect(r.nodeKey).toBe('r1')
    expect(r.trail.map((t) => t.choiceLabel)).toEqual(['Cor', 'Continuar'])
    expect(r.trail[1]!.path).toEqual(['cor'])
  })
  it('recusa caminhos inválidos', () => {
    expect(resolvePath(graph, ['posicao'])).toBeNull()
    expect(resolvePath(graph, ['forma', CONTINUE])).toBeNull()
  })
  it('enumera os caminhos e ordena as etapas', () => {
    expect(enumeratePaths(graph)).toEqual([[], ['cor'], ['cor', CONTINUE], ['forma']])
    expect(stepOrder(graph)).toEqual(['q1', 'g1', 'r1'])
  })
  it('valida antes de publicar', () => {
    expect(validateGraph(graph, new Set(['aula-a']))).toEqual([])
    const broken: WorkflowGraph = {
      start: 'q1',
      nodes: { ...graph.nodes, solto: { type: 'alerta', title: 'x', next: 'nao-existe' } },
    }
    const msgs = validateGraph(broken, new Set()).map((i) => i.message)
    expect(msgs).toContain('Etapa solta: nenhuma resposta leva até ela.')
    expect(msgs).toContain('Conteúdo vinculado não está na biblioteca.')
  })
})
