// Minha Produção (Etapa 7): indicadores com as definições aprovadas, filtros, exclusões, acesso só do aluno.
// Banco LOCAL. Os números esperados vêm das regras: experiência = caso + data + etapa + posição; tratamento
// concluído = etapa que conclui, uma vez por posição; consulta = caso + data; caso = caso com registro válido.
import { go, launch, login, newCase, newRecord, noScroll, one, people, sql, stepId, suite } from '../lib.mjs'

const t = suite('Minha Produção')
let browser
const values = async (p) => {
  const v = async (k) => (await p.locator(`[data-indicador="${k}"] [data-valor]`).innerText()).trim()
  return [await v('casos'), await v('consultas'), await v('experiencias'), await v('concluidos')].join(',')
}
try {
  const u = await people('producao.local')
  // Caso A: resina 11 (conclui) em 01/10, repetida no mesmo dia (não conta de novo); laminado preparo 11,21 em 02/10;
  // laminado cimentação 11,21 (conclui) em 09/10.
  const A = newCase(u.aluno, 'P.D.A.')
  newRecord(A, stepId('restauracao-em-resina-anterior'), '2026-10-01', [11])
  newRecord(A, stepId('restauracao-em-resina-anterior'), '2026-10-01', [11])
  newRecord(A, stepId('laminado-ceramico', 'preparo'), '2026-10-02', [11, 21])
  newRecord(A, stepId('laminado-ceramico', 'cimentacao'), '2026-10-09', [11, 21])
  // Caso B: mock-up (unidade caso) em 02/10 + um registro excluído (não conta).
  const B = newCase(u.aluno, 'P.D.B.')
  newRecord(B, stepId('mock-up'), '2026-10-02')
  const removed = newRecord(B, stepId('restauracao-em-resina-anterior'), '2026-10-03', [22])
  sql(`update performed_procedures set removed_at = now() where id='${removed}'`)
  // Caso C excluído inteiro (não conta) e caso do colega (não aparece).
  const C = newCase(u.aluno, 'P.D.C.')
  newRecord(C, stepId('mock-up'), '2026-10-04')
  sql(`update clinical_cases set removed_at = now() where id='${C}'`)
  newRecord(newCase(u.colega, 'P.D.X.'), stepId('mock-up'), '2026-10-05')

  browser = await launch()
  const al = await login(browser, 'aluno@producao.local')
  await go(al, '/producao')
  const all = await values(al)
  t.check('Indicadores do curso: 2 casos · 4 consultas · 6 experiências · 3 tratamentos concluídos', all === '2,4,6,3', all)
  t.check('Registro e caso excluídos não contam; duplicata no mesmo dia conta uma vez', all.split(',')[2] === '6')
  t.check('Minha Produção em 390 px sem rolagem lateral', await noScroll(al))
  t.check('Categorias e procedimentos aparecem', (await al.locator('[data-procedimento-producao]').count()) >= 3)

  await go(al, '/producao?filtro=periodo&de=2026-10-05&ate=2026-10-31')
  const per = await values(al)
  t.check('Filtro por período (05–31/10): só a cimentação → 1 · 1 · 2 · 2', per === '1,1,2,2', per)
  await go(al, '/producao?filtro=periodo&de=2026-09-01&ate=2026-09-30')
  t.check('Período sem registros mostra estado vazio', (await al.locator('[data-periodo-vazio]').count()) === 1)

  // Planejar não muda a produção (só registros reais contam)
  const v = one(`insert into case_plan_visits (case_id, position) values ('${A}', 1) returning id`)
  sql(`insert into case_plan_items (visit_id, step_id, quantity, teeth) values ('${v}','${stepId('laminado-ceramico', 'cimentacao')}',1,'{12}')`)
  await go(al, '/producao')
  t.check('Planejamento do caso não altera os números', (await values(al)) === all)

  // ── Acesso ──
  const col = await login(browser, 'colega@producao.local')
  await go(col, '/producao')
  t.check('Colega vê só a própria produção', (await values(col)) === '1,1,1,0')
  const co = await login(browser, 'coord@producao.local', { phone: false })
  await go(co, '/producao')
  t.check('Coordenação não usa Minha Produção (aviso, sem números)', (await co.locator('[data-indicador]').count()) === 0 && /Minha produção é do aluno/.test(await co.locator('main').innerText()))
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
