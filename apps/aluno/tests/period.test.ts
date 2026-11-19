import { describe, expect, it } from 'vitest'
import type { ModuleSpan } from '@/lib/cases/model'
import { defaultCohort } from '@/lib/cohort/model'
import { periodQuery, resolvePeriod } from '@/lib/production/period'

const cohort = { startsOn: '2026-03-01', endsOn: '2028-02-28' }
const spans = [{ id: 'm1', label: '1', title: 'Fundamentos', start: '2026-03-01', end: '2026-04-30' }] as unknown as ModuleSpan[]

describe('resolvePeriod (filtros compartilhados Etapa 7 / Etapa 10)', () => {
  it('sem filtro: todo o curso', () => {
    const r = resolvePeriod({}, cohort, spans, '2026-11-19')
    expect(r.period).toEqual({ kind: 'curso' })
    expect(r.filtered).toBe(false)
    expect(periodQuery(r)).toEqual({})
  })
  it('período: ordena as datas e repete nos links', () => {
    const r = resolvePeriod({ filtro: 'periodo', de: '2026-10-31', ate: '2026-10-05' }, cohort, spans, '2026-11-19')
    expect(r.period).toEqual({ kind: 'periodo', from: '2026-10-05', to: '2026-10-31' })
    expect(periodQuery(r)).toEqual({ filtro: 'periodo', de: '2026-10-05', ate: '2026-10-31' })
  })
  it('datas inválidas caem em todo o curso', () => {
    expect(resolvePeriod({ filtro: 'periodo', de: 'x', ate: '2026-10-05' }, cohort, spans, '2026-11-19').period.kind).toBe('curso')
  })
  it('ano e módulo do curso', () => {
    expect(resolvePeriod({ filtro: 'ano' }, cohort, spans, '2026-11-19').period.kind).toBe('ano')
    const m = resolvePeriod({ filtro: 'modulo' }, cohort, spans, '2026-11-19')
    expect(m.period).toEqual({ kind: 'modulo', moduleId: 'm1' })
    expect(periodQuery(m)).toEqual({ filtro: 'modulo' })
  })
})

describe('defaultCohort', () => {
  const c = (id: string, status: string, startsOn: string, endsOn: string) => ({ id, status, startsOn, endsOn })
  it('prefere a ativa em andamento, depois a próxima ativa, depois a primeira', () => {
    expect(defaultCohort([c('a', 'encerrada', '2024-01-01', '2025-12-31'), c('b', 'ativa', '2026-01-01', '2027-12-31')], '2026-11-19')?.id).toBe('b')
    expect(defaultCohort([c('a', 'ativa', '2028-01-01', '2029-12-31'), c('b', 'ativa', '2027-01-01', '2028-12-31')], '2026-11-19')?.id).toBe('b')
    expect(defaultCohort([c('a', 'encerrada', '2024-01-01', '2025-12-31')], '2026-11-19')?.id).toBe('a')
    expect(defaultCohort([], '2026-11-19')).toBeNull()
  })
})
