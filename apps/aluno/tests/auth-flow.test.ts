import { describe, expect, it } from 'vitest'
import { type AuthState, homeFor, nextStep, safeNext } from '@/lib/auth/flow'

const base: AuthState = {
  userId: 'u',
  email: 'a@b.c',
  role: 'aluno',
  fullName: 'A',
  displayName: null,
  needsTerms: false,
}
const as = (patch: Partial<AuthState>): AuthState => ({ ...base, ...patch })

describe('próximo passo da entrada (só e-mail e senha)', () => {
  it('admin, coordenação e aluno vão direto ao início do papel, sem passo extra', () => {
    expect(nextStep(as({ role: 'admin' }))).toBe('/admin')
    expect(nextStep(as({ role: 'coordenacao' }))).toBe('/coordenacao')
    expect(nextStep(as({ role: 'aluno' }))).toBe('/')
  })
  it('termo novo vigente vem antes do destino, para qualquer papel', () => {
    expect(nextStep(as({ role: 'admin', needsTerms: true }))).toBe('/termo')
    expect(nextStep(as({ role: 'coordenacao', needsTerms: true }))).toBe('/termo')
    expect(nextStep(as({ needsTerms: true }))).toBe('/termo')
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
