import { describe, expect, it } from 'vitest'
import { allSet, DEFAULT_LOGISTICS, type Logistics, lodgingResolved, moduleTeachers, situation, summarize, travelResolved, waitingOnOthers } from '@/lib/logistics/model'

const l = (over: Partial<Logistics> = {}): Logistics => ({ ...DEFAULT_LOGISTICS('m1', 'f1'), ...over })

describe('professores e logística: regras', () => {
  it('padrão: a convidar, passagem a providenciar, hospedagem a reservar (nada resolvido)', () => {
    const x = l()
    expect([x.participation, x.travel, x.lodging]).toEqual(['a_convidar', 'a_providenciar', 'a_reservar'])
    expect(travelResolved(x) || lodgingResolved(x) || allSet(x)).toBe(false)
  })

  it('resolvido: comprada/reservada ou não precisa; aguardando confirmação continua pendente', () => {
    expect(travelResolved(l({ travel: 'comprada' }))).toBe(true)
    expect(travelResolved(l({ travel: 'nao_precisa' }))).toBe(true)
    expect(travelResolved(l({ travel: 'aguardando_confirmacao' }))).toBe(false)
    expect(lodgingResolved(l({ lodging: 'reservada' }))).toBe(true)
    expect(lodgingResolved(l({ lodging: 'aguardando_confirmacao' }))).toBe(false)
  })

  it('quem recusou ou foi cancelado não gera pendência de passagem nem de hospedagem', () => {
    const x = l({ participation: 'recusado' })
    expect(travelResolved(x) && lodgingResolved(x) && allSet(x)).toBe(true)
    expect(waitingOnOthers(l({ participation: 'cancelado', travel: 'aguardando_confirmacao' }))).toBe(false)
  })

  it('situação da linha: resolvido, aguardando terceiros ou pendente', () => {
    expect(situation(l({ participation: 'confirmado', travel: 'comprada', lodging: 'nao_precisa' }))).toBe('resolvido')
    expect(situation(l({ participation: 'confirmado', travel: 'aguardando_confirmacao', lodging: 'reservada' }))).toBe('aguardando')
    expect(situation(l({ participation: 'confirmado', travel: 'comprada', lodging: 'a_reservar' }))).toBe('pendente')
    expect(situation(l({ participation: 'convidado', travel: 'comprada', lodging: 'reservada' }))).toBe('pendente') // falta confirmar
  })

  it('resumo do módulo', () => {
    const s = summarize([
      l({ participation: 'confirmado', travel: 'comprada', lodging: 'reservada' }),
      l({ participation: 'confirmado', travel: 'aguardando_confirmacao', lodging: 'a_reservar' }),
      l({ participation: 'convidado' }),
      l({ participation: 'recusado' }),
    ])
    expect(s).toEqual({ teachers: 4, confirmed: 2, toConfirm: 1, out: 1, travelPending: 2, lodgingPending: 2, waiting: 1, done: 2 })
  })

  it('professores do módulo: equipe + atividades + logística, sem repetir', () => {
    expect(moduleTeachers(['a', 'b'], ['b', 'c'], ['d', 'a'])).toEqual(['a', 'b', 'c', 'd'])
  })
})
