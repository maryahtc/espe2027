import { describe, expect, it } from 'vitest'
import { buildTracking, trackingCsv, type TContent, type TModule, type TProgress, type TStudent } from '@/lib/tracking/model'

const students: TStudent[] = [
  { id: 'a', name: 'Bruna' },
  { id: 'b', name: 'Ana' },
  { id: 'c', name: '=Carla' },
]
const modules: TModule[] = [
  { id: 'm1', number: 1, title: 'Módulo 1', theme: 'Fotografia', state: 'done', start: '2027-02-11' },
  { id: 'm2', number: 2, title: 'Módulo 2', theme: null, state: 'next', start: '2027-03-18' },
]
const contents: TContent[] = [
  { id: 'x', slug: 'x', title: 'Protocolo; foto', kind: 'pdf', category: 'Diag', modules: [{ moduleId: 'm1', requirement: 'obrigatorio', phase: 'antes' }] },
  { id: 'y', slug: 'y', title: 'Escaneamento', kind: 'video', category: 'Plan', modules: [{ moduleId: 'm2', requirement: 'obrigatorio', phase: 'antes' }] },
  { id: 'z', slug: 'z', title: 'Leitura extra', kind: 'artigo', category: 'Plan', modules: [] },
]
const p = (userId: string, contentId: string, status: 'iniciado' | 'concluido', updatedAt = '2027-03-01T10:00:00Z'): TProgress => ({
  userId,
  contentId,
  status,
  percent: status === 'concluido' ? 100 : 40,
  updatedAt,
  completedAt: null,
})
const progress = [p('a', 'x', 'concluido'), p('a', 'y', 'iniciado', '2027-03-05T10:00:00Z'), p('b', 'x', 'concluido'), p('b', 'y', 'concluido'), p('b', 'z', 'concluido')]

describe('acompanhamento da biblioteca', () => {
  const t = buildTracking({ students, contents, modules, progress })

  it('totais da turma', () => {
    expect(t.totals).toEqual({ students: 3, contents: 3, avgPct: Math.round((33 + 100 + 0) / 3), required: 2 })
  })

  it('por aluno: concluídos, andamento, obrigatórios do módulo em foco e última atividade (ordem alfabética)', () => {
    expect(t.focus?.id).toBe('m2')
    expect(t.students.map((s) => [s.student.name, s.done, s.ongoing, s.focusRequiredDone, s.focusRequiredTotal, s.lastActivity])).toEqual([
      ['=Carla', 0, 0, 0, 1, null],
      ['Ana', 3, 0, 1, 1, '2027-03-01T10:00:00Z'],
      ['Bruna', 1, 1, 0, 1, '2027-03-05T10:00:00Z'],
    ])
  })

  it('por conteúdo: concluíram / em andamento / não iniciaram', () => {
    expect(t.contents.map((r) => [r.content.id, r.done, r.ongoing, r.notStarted, r.pct])).toEqual([
      ['x', 2, 0, 1, 67],
      ['y', 1, 1, 1, 33],
      ['z', 1, 0, 2, 33],
    ])
  })

  it('por módulo: quantos alunos concluíram TODOS os obrigatórios (só módulos com obrigatórios)', () => {
    expect(t.modules.map((r) => [r.module.id, r.required.length, r.allDone])).toEqual([
      ['m1', 1, 2],
      ['m2', 1, 1],
    ])
  })

  it('planilha CSV: separador ";", acentos (BOM), aspas e proteção contra fórmula', () => {
    const csv = trackingCsv({ students, contents, progress })
    expect(csv.startsWith('﻿')).toBe(true)
    const lines = csv.slice(1).trim().split('\r\n')
    expect(lines[0]).toBe('Aluno;Concluídos;Em andamento;Total;"Protocolo; foto";Escaneamento;Leitura extra')
    expect(lines[1]).toBe("'=Carla;0;0;3;Não iniciado;Não iniciado;Não iniciado")
    expect(lines[3]).toBe('Bruna;1;1;3;Concluído;Em andamento;Não iniciado')
  })

  it('turma vazia não quebra', () => {
    expect(buildTracking({ students: [], contents: [], modules, progress: [] }).totals).toEqual({ students: 0, contents: 0, avgPct: 0, required: 0 })
  })
})
