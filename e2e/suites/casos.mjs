// Meus Casos e Jornada (Etapa 6): lista, jornada por consulta, concluir/reabrir, excluir/restaurar, leitura da
// coordenação com auditoria e isolamento. Banco LOCAL.
import { go, launch, login, newCase, newRecord, noScroll, one, people, stepId, suite } from '../lib.mjs'

const t = suite('Meus Casos e Jornada')
let browser
try {
  const u = await people('casos.local')
  const A = newCase(u.aluno, 'J.R.N.')
  newRecord(A, stepId('restauracao-em-resina-anterior'), '2026-10-01', [11])
  newRecord(A, stepId('laminado-ceramico', 'preparo'), '2026-10-08', [11, 21])
  newRecord(A, stepId('mock-up'), '2026-10-08')
  const B = newCase(u.aluno, 'S.E.G.')
  newRecord(B, stepId('mock-up'), '2026-10-15')
  const C = newCase(u.colega, 'C.O.L.')
  browser = await launch()
  const al = await login(browser, 'aluno@casos.local')

  // ── Lista ──
  await go(al, '/casos')
  t.check('Meus casos lista só os casos do aluno', (await al.locator(`[data-caso="J.R.N."]`).count()) === 1 && (await al.locator(`[data-caso="S.E.G."]`).count()) === 1 && (await al.locator(`[data-caso="C.O.L."]`).count()) === 0)
  t.check('Lista sem rolagem lateral em 390 px', await noScroll(al))

  // ── Jornada: agrupada por consulta (caso + data), em ordem ──
  await go(al, `/casos/${A}`)
  const visits = await al.locator('[data-jornada] [data-consulta]').count()
  t.check('Jornada agrupa por consulta: 2 consultas (01/10 e 08/10)', visits === 2, visits)
  const second = al.locator('[data-jornada] [data-consulta="2"]')
  t.check('Consulta de 08/10 mostra os dois procedimentos do dia', (await second.locator('[data-procedimento-consulta]').count()) === 2)
  t.check('Jornada mostra o caso em andamento no fim', (await al.locator('[data-jornada-fim="em_andamento"]').count()) === 1)
  t.check('Página do caso sem rolagem lateral em 390 px', await noScroll(al))

  // ── Concluir e reabrir ──
  await al.locator('button:has-text("Concluir caso")').click()
  await al.waitForTimeout(1200)
  await go(al, `/casos/${A}`)
  t.check('Concluir caso grava status e data', one(`select status||'|'||(concluded_on is not null) from clinical_cases where id='${A}'`) === 'concluido|true')
  t.check('Jornada termina em "concluído"', (await al.locator('[data-jornada-fim="concluido"]').count()) === 1)
  await al.locator('button:has-text("Reabrir caso")').click()
  await al.waitForTimeout(1200)
  t.check('Reabrir volta para em andamento', one(`select status from clinical_cases where id='${A}'`) === 'em_andamento')

  // ── Excluir e restaurar (nada é apagado) ──
  await go(al, `/casos/${B}`)
  await al.locator('button:has-text("Excluir caso")').click()
  await al.waitForTimeout(1500)
  t.check('Excluir caso marca removido sem apagar registros', one(`select (removed_at is not null)||'|'||(select count(*) from performed_procedures where case_id='${B}') from clinical_cases where id='${B}'`) === 'true|1')
  await go(al, '/casos')
  t.check('Caso excluído sai da lista principal', (await al.locator(`[data-caso="S.E.G."]`).count()) === 0)

  // ── Coordenação: leitura com auditoria, sem ações ──
  const co = await login(browser, 'coord@casos.local', { phone: false })
  const audit0 = Number(one(`select count(*) from audit_log where action='caso.abrir' and entity_id='${A}'`))
  t.check('Coordenação abre o caso da turma', (await go(co, `/coordenacao/casos/${A}`)) === 200 && (await co.locator('[data-jornada]').count()) === 1)
  t.check('Abertura pela coordenação fica na auditoria (quem e qual caso)', Number(one(`select count(*) from audit_log where action='caso.abrir' and entity_id='${A}' and actor='${u.coord}'`)) === audit0 + 1)
  t.check('Leitura da coordenação sem ações de edição', (await co.locator('button:has-text("Concluir caso"), button:has-text("Excluir caso"), a:has-text("Registrar procedimento")').count()) === 0)
  t.check('Caso excluído pelo aluno sai da vista da coordenação (404)', (await go(co, `/coordenacao/casos/${B}`)) === 404)

  // Aluno restaura
  await go(al, `/casos/${B}`)
  await al.locator('button:has-text("Restaurar caso")').click()
  await al.waitForTimeout(1500)
  t.check('Restaurar devolve o caso', one(`select removed_at is null from clinical_cases where id='${B}'`) === 't')

  // ── Isolamento ──
  const col = await login(browser, 'colega@casos.local')
  t.check('Colega não abre caso alheio (404)', (await go(col, `/casos/${A}`)) === 404)
  t.check('Nenhum dado de outro aluno vazou na lista do colega', (await go(col, '/casos')) === 200 && (await col.locator(`[data-caso="J.R.N."]`).count()) === 0)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
