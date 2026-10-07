import { describe, expect, it } from 'vitest'
import { type AuthState, homeFor, needsMfa, nextStep, safeNext } from '@/lib/auth/flow'

const base: AuthState = {
  userId: 'u',
  email: 'a@b.c',
  role: 'aluno',
  fullName: 'A',
  displayName: null,
  aal: 'aal1',
  hasVerifiedFactor: false,
  needsTerms: false,
}
const as = (patch: Partial<AuthState>): AuthState => ({ ...base, ...patch })

describe('2FA obrigatório', () => {
  it('admin e coordenação sem código confirmado precisam de 2FA', () => {
    expect(needsMfa(as({ role: 'admin' }))).toBe(true)
    expect(needsMfa(as({ role: 'coordenacao' }))).toBe(true)
    expect(needsMfa(as({ role: 'admin', aal: 'aal2' }))).toBe(false)
  })
  it('aluno: só se ele mesmo ativou', () => {
    expect(needsMfa(as({}))).toBe(false)
    expect(needsMfa(as({ hasVerifiedFactor: true }))).toBe(true)
    expect(needsMfa(as({ hasVerifiedFactor: true, aal: 'aal2' }))).toBe(false)
  })
})

describe('próximo passo da entrada', () => {
  it('ordem: 2FA (ativar ou digitar) → termo → destino', () => {
    expect(nextStep(as({ role: 'admin', needsTerms: true }))).toBe('/seguranca/2fa/configurar')
    expect(nextStep(as({ role: 'admin', hasVerifiedFactor: true, needsTerms: true }))).toBe('/seguranca/2fa')
    expect(nextStep(as({ role: 'admin', aal: 'aal2', needsTerms: true }))).toBe('/termo')
    expect(nextStep(as({ role: 'admin', aal: 'aal2' }))).toBe('/admin')
  })
  it('cada papel tem o seu início', () => {
    expect(homeFor('admin')).toBe('/admin')
    expect(homeFor('coordenacao')).toBe('/coordenacao')
    expect(homeFor('aluno')).toBe('/')
  })
  it('guarda o destino pedido ao longo dos passos', () => {
    expect(nextStep(as({ needsTerms: true }), '/casos')).toBe('/termo?next=%2Fcasos')
    expect(nextStep(as({}), '/casos')).toBe('/casos')
  })
})

describe('destino seguro depois do login', () => {
  it('aceita só caminhos internos', () => {
    expect(safeNext('/cronograma?mes=2')).toBe('/cronograma?mes=2')
    expect(safeNext('https://site-malicioso.com')).toBeNull()
    expect(safeNext('//site-malicioso.com')).toBeNull()
    expect(safeNext('/\\site-malicioso.com')).toBeNull()
    expect(safeNext(undefined)).toBeNull()
  })
})
