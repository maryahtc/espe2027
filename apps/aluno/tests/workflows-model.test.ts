import { describe, expect, it } from 'vitest'
import {
  checklistKey,
  groupByCategory,
  nextSteps,
  parseChecked,
  publishIssues,
  searchWorkflows,
  serializeChecked,
  stageSections,
  toggleChecked,
  visibleToStudent,
  type Workflow,
  type WorkflowStage,
  workflowHref,
} from '@/lib/workflows/model'

const stage = (id: string, name: string, position: number, extra: Partial<WorkflowStage> = {}): WorkflowStage => ({
  id,
  name,
  slug: name.toLowerCase(),
  position,
  procedureStepId: null,
  items: [{ id: `${id}-p1`, kind: 'passo', text: 'Passo', position: 1 }],
  next: [],
  contents: [],
  ...extra,
})

const wf = (extra: Partial<Workflow> = {}): Workflow => ({
  id: 'w1',
  procedureId: 'p1',
  procedureSlug: 'laminado-ceramico',
  procedureName: 'Laminado cerâmico',
  procedureSynonyms: ['lente de contato dental', 'faceta cerâmica'],
  procedureActive: true,
  categoryName: 'Restaurações indiretas',
  categoryPosition: 2,
  summary: null,
  status: 'publicado',
  position: 1,
  updatedAt: '2026-10-24T10:00:00Z',
  stages: [stage('s1', 'Planejamento', 1), stage('s2', 'Prova', 3), stage('s3', 'Cimentacao', 4, { procedureStepId: 'step-cim' })],
  ...extra,
})

describe('Workflows clínicos — regras puras', () => {
  it('seções da etapa separadas por tipo e em ordem', () => {
    const s = stageSections({
      items: [
        { id: 'm2', kind: 'material', text: 'Ácido', position: 2 },
        { id: 'p2', kind: 'passo', text: 'Condicionar', position: 2 },
        { id: 'm1', kind: 'material', text: 'Cimento', position: 1 },
        { id: 'p1', kind: 'passo', text: 'Isolar', position: 1 },
        { id: 'a1', kind: 'atencao', text: 'Conferir cor', position: 1 },
      ],
    })
    expect(s.passo.map((i) => i.id)).toEqual(['p1', 'p2'])
    expect(s.material.map((i) => i.id)).toEqual(['m1', 'm2'])
    expect(s.atencao.map((i) => i.id)).toEqual(['a1'])
  })

  it('próximos passos: só os cadastrados — etapa sem próximos passos devolve vazio (nada inferido pela ordem)', () => {
    const w = wf()
    expect(nextSteps(w.stages[0]!, w.stages)).toEqual([])
    expect(nextSteps(w.stages[1]!, w.stages)).toEqual([])
  })

  it('próximos passos: destino, condição, a própria etapa e orientação em texto', () => {
    const w = wf()
    const prova = { ...w.stages[1]!, next: [
      { id: 'n2', label: 'Necessita ajuste laboratorial', targetStageId: 's2', note: null, position: 2 },
      { id: 'n1', label: 'Aprovado', targetStageId: 's3', note: null, position: 1 },
      { id: 'n3', label: null, targetStageId: null, note: 'Reavaliar com o técnico.', position: 3 },
    ] }
    expect(nextSteps(prova, w.stages)).toEqual([
      { id: 'n1', label: 'Aprovado', target: { slug: 'cimentacao', name: 'Cimentacao' }, note: null },
      { id: 'n2', label: 'Necessita ajuste laboratorial', target: { slug: 'prova', name: 'Prova' }, note: null },
      { id: 'n3', label: null, target: null, note: 'Reavaliar com o técnico.' },
    ])
  })

  it('próximo passo com destino fora das etapas visíveis vira só orientação, ou some se não houver texto', () => {
    const w = wf()
    const s = { ...w.stages[0]!, next: [
      { id: 'a', label: 'X', targetStageId: 'sumiu', note: null, position: 1 },
      { id: 'b', label: 'Y', targetStageId: 'sumiu', note: 'Ver com o professor', position: 2 },
    ] }
    expect(nextSteps(s, w.stages)).toEqual([{ id: 'b', label: 'Y', target: null, note: 'Ver com o professor' }])
  })

  it('publicar: mesma regra do banco (≥ 1 etapa e ≥ 1 passo em cada etapa; material não conta)', () => {
    expect(publishIssues({ stages: [] })).toEqual(['Adicione pelo menos uma etapa.'])
    expect(publishIssues(wf())).toEqual([])
    const semPasso = stage('s9', 'Controle', 9, { items: [{ id: 'm', kind: 'material', text: 'Fio', position: 1 }] })
    expect(publishIssues({ stages: [...wf().stages, semPasso] })).toEqual(['Etapa "Controle" sem passo a passo.'])
  })

  it('aluno vê só publicado de procedimento ativo (reativar volta a mostrar)', () => {
    expect(visibleToStudent({ status: 'publicado', procedureActive: true })).toBe(true)
    expect(visibleToStudent({ status: 'publicado', procedureActive: false })).toBe(false)
    expect(visibleToStudent({ status: 'rascunho', procedureActive: true })).toBe(false)
    expect(visibleToStudent({ status: 'arquivado', procedureActive: true })).toBe(false)
  })

  it('busca sem acento por nome, sinônimo do catálogo e categoria', () => {
    const list = [wf(), wf({ id: 'w2', procedureName: 'Exodontia', procedureSynonyms: ['extração'], categoryName: 'Cirurgia e implantes' })]
    expect(searchWorkflows(list, 'ceramico').map((w) => w.id)).toEqual(['w1'])
    expect(searchWorkflows(list, 'LENTE de contato').map((w) => w.id)).toEqual(['w1'])
    expect(searchWorkflows(list, 'extracao').map((w) => w.id)).toEqual(['w2'])
    expect(searchWorkflows(list, 'cirurgia').map((w) => w.id)).toEqual(['w2'])
    expect(searchWorkflows(list, '  ')).toHaveLength(2)
    expect(searchWorkflows(list, 'implante zircônia')).toHaveLength(0)
  })

  it('lista agrupada pelas categorias do catálogo, na ordem do catálogo', () => {
    const list = [
      wf({ id: 'b', procedureName: 'Coroa total', position: 2 }),
      wf({ id: 'x', procedureName: 'Exodontia', categoryName: 'Cirurgia', categoryPosition: 5, position: 1 }),
      wf({ id: 'a', position: 1 }),
    ]
    expect(groupByCategory(list).map((g) => [g.category, g.items.map((w) => w.id)])).toEqual([
      ['Restaurações indiretas', ['a', 'b']],
      ['Cirurgia', ['x']],
    ])
  })

  it('link do Planejamento: etapa ligada à etapa do catálogo, senão a visão geral', () => {
    expect(workflowHref(wf(), 'step-cim')).toBe('/workflows/laminado-ceramico/cimentacao')
    expect(workflowHref(wf(), 'step-outra')).toBe('/workflows/laminado-ceramico')
    expect(workflowHref(wf(), null)).toBe('/workflows/laminado-ceramico')
  })

  it('checklist temporário: só materiais atuais da etapa; conteúdo inválido vira vazio; marcar/desmarcar', () => {
    expect(checklistKey('s3')).toBe('conexo:wf-checklist:s3')
    const ids = ['m1', 'm2']
    expect([...parseChecked('["m2","removido",3]', ids)]).toEqual(['m2'])
    expect(parseChecked('{"m1":true}', ids).size).toBe(0)
    expect(parseChecked('não é json', ids).size).toBe(0)
    expect(parseChecked(null, ids).size).toBe(0)
    let s = toggleChecked(new Set(), 'm1')
    s = toggleChecked(s, 'm2')
    expect(serializeChecked(s)).toBe('["m1","m2"]')
    s = toggleChecked(s, 'm1')
    expect([...s]).toEqual(['m2'])
  })
})
