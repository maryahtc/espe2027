import { describe, expect, it } from 'vitest'
import { buildProtocol, currentStage, initialState, protocolText, stageStatus, steps } from '@/features/playbook/flow'

describe('playbook', () => {
  it('percorre as 5 etapas na ordem do material', () => {
    expect([...new Set(steps.map((s) => s.stage))]).toEqual(['palatina', 'substrato', 'dentina', 'maquiagem', 'vestibular'])
    expect(currentStage(initialState)?.id).toBe('palatina')
    expect(currentStage({ ...initialState, done: steps.length })).toBeNull()
  })

  it('a palatina só conclui depois das duas perguntas', () => {
    expect(stageStatus({ ...initialState, done: 1 }, 'palatina')).toBe('current')
    expect(stageStatus({ ...initialState, done: 2 }, 'palatina')).toBe('done')
    expect(stageStatus({ ...initialState, done: 2 }, 'substrato')).toBe('current')
  })

  it('o protocolo traz só as condutas do SIM, mais as etapas fixas', () => {
    const state = {
      done: steps.length,
      answers: { proximal: 'sim', 'ajuste-incisal': 'nao', substrato: 'sim' } as const,
      effects: ['White', 'Ocre'],
    }
    const protocol = Object.fromEntries(buildProtocol(state).map((p) => [p.stage.id, p.items]))
    expect(protocol.palatina).toEqual(['Utilizar a mesma resina da camada vestibular.'])
    expect(protocol.substrato).toEqual(['Opacificar com LCO + dentina.'])
    expect(protocol.maquiagem).toEqual(['Efeitos ópticos: Ocre, White.'])
    expect(protocolText(state)).toContain('5. VESTIBULAR')
  })

  it('sem nenhum SIM, a etapa segue sem ajustes', () => {
    const [palatina] = buildProtocol({ done: steps.length, answers: { proximal: 'nao', 'ajuste-incisal': 'nao' }, effects: [] })
    expect(palatina?.items).toEqual(['Sem ajustes — seguir para a próxima etapa.'])
  })
})
