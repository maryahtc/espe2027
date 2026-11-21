import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCESS_FACTS, CASE_ACCESS, PRIVACY_NOTES, VISIBILITY } from '@/lib/privacy/access'

/**
 * O texto "Quem vê o quê" do Perfil só pode afirmar o que um teste verifica. Cada referência `arquivo: nome do teste`
 * precisa existir no arquivo citado (testes de banco em packages/db/tests, E2E em e2e/suites).
 */
const root = path.resolve(__dirname, '../../..')
const source = (file: string) =>
  file.startsWith('e2e/') ? readFileSync(path.join(root, `e2e/suites/${file.slice(4)}.mjs`), 'utf8') : readFileSync(path.join(root, `packages/db/tests/${file}.sql`), 'utf8')

const refs = [...VISIBILITY.flatMap((r) => r.verifiedBy), ...PRIVACY_NOTES.flatMap((n) => n.verifiedBy)]

describe('Privacidade do Perfil = regras verificadas', () => {
  it.each(refs)('%s', (ref) => {
    const [file, ...rest] = ref.split(': ')
    expect(source(file!)).toContain(rest.join(': '))
  })
  it('as regras de casos também apontam testes existentes', () => {
    const db = readFileSync(path.join(root, 'packages/db/tests/rls_auditoria_producao.sql'), 'utf8')
    for (const r of CASE_ACCESS) expect(db).toContain(r.verifiedBy)
  })
  it('colegas nunca veem nada; nada é configurável', () => {
    expect(VISIBILITY.every((r) => !r.colleagues.yes)).toBe(true)
    expect(ACCESS_FACTS.configurable).toBe(false)
  })
})
