import { describe, expect, it } from 'vitest'
import { catalogIssues, experienceOnly, frequentDescriptions, isSingleStep, type StepVM, stepLabel, unitText } from '@/lib/procedures/model'

const step = (over: Partial<StepVM>): StepVM => ({
  id: 's',
  procedureId: 'p',
  name: 'Preparo',
  slug: 'preparo',
  unit: 'dente',
  location: 'dentes',
  completes: false,
  requiresDescription: false,
  synonyms: [],
  active: true,
  position: 1,
  uses: 0,
  ...over,
})
const laminado = {
  name: 'Laminado cerâmico',
  kind: 'tratamento' as const,
  steps: [step({ id: 'a' }), step({ id: 'b', name: 'Provisório', unit: 'peca' }), step({ id: 'c', name: 'Cimentação', unit: 'peca', completes: true })],
}

describe('catálogo: procedimento × etapa', () => {
  it('rótulo no registro: "Procedimento · Etapa", ou só o procedimento na etapa única', () => {
    expect(stepLabel(laminado, laminado.steps[2]!)).toBe('Laminado cerâmico · Cimentação')
    expect(stepLabel({ name: 'Exodontia' }, step({ name: 'Exodontia' }))).toBe('Exodontia')
    expect(isSingleStep({ name: 'Exodontia', steps: [step({ name: 'Exodontia' })] })).toBe(true)
    expect(isSingleStep(laminado)).toBe(false)
  })

  it('só experiência quando nenhuma etapa conclui (clareamento, gerais, "Outro")', () => {
    expect(experienceOnly(laminado)).toBe(false)
    expect(experienceOnly({ steps: [step({ name: 'Sessão', unit: 'caso' })] })).toBe(true)
  })

  it('unidade no singular e no plural', () => {
    expect(unitText('peca', 1)).toBe('1 peça')
    expect(unitText('peca', 4)).toBe('4 peças')
    expect(unitText('arcada', 2)).toBe('2 arcadas')
  })

  it('avisos de consistência: duas etapas que concluem, geral com conclusão, nenhuma etapa ativa', () => {
    expect(catalogIssues(laminado)).toEqual([])
    expect(catalogIssues({ kind: 'tratamento', steps: [step({ completes: true }), step({ completes: true })] })[0]).toMatch(/Mais de uma/)
    expect(catalogIssues({ kind: 'geral', steps: [step({ completes: true })] })).toContain('Procedimento geral não tem etapa que conclui.')
    expect(catalogIssues({ kind: 'tratamento', steps: [step({ active: false })] })[0]).toMatch(/Nenhuma etapa ativa/)
  })
})

describe('"Outro procedimento": descrições frequentes', () => {
  it('agrupa pela forma normalizada, conta registros e alunos, mais citadas primeiro', () => {
    const rows = [
      { description: 'Remoção de bráquetes', normalized: 'remocao de braquetes', ownerId: 'a' },
      { description: 'remocao de braquetes', normalized: 'remocao de braquetes', ownerId: 'b' },
      { description: 'Remoção de Bráquetes', normalized: 'remocao de braquetes', ownerId: 'a' },
      { description: 'Frenectomia', normalized: 'frenectomia', ownerId: 'c' },
    ]
    expect(frequentDescriptions(rows)).toEqual([
      { description: 'Remoção de bráquetes', records: 3, students: 2 },
      { description: 'Frenectomia', records: 1, students: 1 },
    ])
  })
})
