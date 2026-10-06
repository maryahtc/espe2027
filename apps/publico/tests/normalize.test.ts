import { describe, expect, it } from 'vitest'
import { INVALID, moduleNumber, moduleNumbers, nameList, number, vocab } from '@/lib/normalize'
import { CLASS_TYPES } from '@/config/vocab'

describe('normalizadores de célula', () => {
  it('números em formato brasileiro', () => {
    expect(number('20')).toBe(20)
    expect(number('1.234,5')).toBe(1234.5)
    expect(number('1.500')).toBe(1500)
    expect(number('20 un')).toBe(20)
    expect(number('')).toBeNull()
    expect(number('vinte')).toBe(INVALID)
  })
  it('número de módulo', () => {
    expect(moduleNumber('Módulo 05')).toBe(5)
    expect(moduleNumber(7)).toBe(7)
    expect(moduleNumber('M3')).toBe(3)
    expect(moduleNumber('abc')).toBe(INVALID)
    expect(moduleNumbers('Módulos 2 e 5')).toEqual([2, 5])
    expect(moduleNumbers('1; 7')).toEqual([1, 7])
  })
  it('múltiplos professores', () => {
    expect(nameList('Maryah e Victor e Elber')).toEqual(['Maryah', 'Victor', 'Elber'])
    expect(nameList('João Silva; Maria Souza')).toEqual(['João Silva', 'Maria Souza'])
    expect(nameList('Prof. João + Dra. Maria')).toEqual(['João', 'Maria'])
    expect(nameList('João\nMaria')).toEqual(['João', 'Maria'])
    expect(nameList(null)).toEqual([])
  })
  it('vocabulário controlado tolera variações', () => {
    expect(vocab('HANDS ON', CLASS_TYPES)).toBe('hands-on')
    expect(vocab('Hands-on', CLASS_TYPES)).toBe('hands-on')
    expect(vocab('Teórica', CLASS_TYPES)).toBe('teorica')
    expect(vocab('Discussão de caso', CLASS_TYPES)).toBe('discussao-de-caso')
    expect(vocab('xyz', CLASS_TYPES)).toBe(INVALID)
  })
})
