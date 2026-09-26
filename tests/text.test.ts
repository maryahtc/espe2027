import { describe, expect, it } from 'vitest'
import { normalizeText, slugify, tokenize } from '@/lib/text'

describe('normalizeText', () => {
  it('ignora acentos, maiúsculas e espaços extras', () => {
    expect(normalizeText('João')).toBe('joao')
    expect(normalizeText('JOÃO')).toBe('joao')
    expect(normalizeText('  joao   silva ')).toBe('joao silva')
  })
  it('trata pontuação como separador', () => {
    expect(normalizeText('mock-up')).toBe('mock up')
    expect(normalizeText('Qtd. necessária')).toBe('qtd necessaria')
  })
})

describe('slugify / tokenize', () => {
  it('gera slugs humanos', () => {
    expect(slugify('Ana Beatriz Costa')).toBe('ana-beatriz-costa')
    expect(slugify('Luísa Martins')).toBe('luisa-martins')
  })
  it('divide termos de busca', () => {
    expect(tokenize('  Cerâmica  E-max ')).toEqual(['ceramica', 'e', 'max'])
    expect(tokenize('   ')).toEqual([])
  })
})
