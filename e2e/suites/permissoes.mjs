// Permissões de Admin e Coordenação: quem abre cada área, isolamento entre turmas, auditoria de casos e da produção
// individual (Etapa 10 · Parte 1), e escritas recusadas pela RLS (pela API, como o navegador faria). Banco LOCAL.
import { go, launch, login, newCase, newRecord, one, people, rest, sql, stepId, suite, token } from '../lib.mjs'

const t = suite('Permissões de Admin e Coordenação')
let browser
try {
  sql("delete from cohorts where slug = 'perm-t2'")
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Permissões 2','perm-t2','2026-01-01','2028-07-31') returning id")
  const u = await people('perm.local', {
    coordx: { role: 'coordenacao', cohort: T2, cohortRole: 'coordenacao' },
    alunox: { role: 'aluno', cohort: T2, cohortRole: 'aluno' },
  })
  const A = newCase(u.aluno, 'P.R.M.')
  newRecord(A, stepId('mock-up'), '2026-10-05')
  browser = await launch()
  const al = await login(browser, 'aluno@perm.local')
  const co = await login(browser, 'coord@perm.local', { phone: false })
  const cx = await login(browser, 'coordx@perm.local', { phone: false })
  const ad = await login(browser, 'admin@perm.local', { phone: false })

  // ── Matriz de acesso às áreas ──
  t.check('Aluno não abre /admin nem /coordenacao (404)', (await go(al, '/admin')) === 404 && (await go(al, '/coordenacao')) === 404)
  t.check('Coordenação não abre /admin (404)', (await go(co, '/admin')) === 404 && (await go(co, '/admin/alunos')) === 404)
  t.check('Coordenação abre a própria área', (await go(co, '/coordenacao')) === 200 && (await go(co, '/coordenacao/casos')) === 200)
  t.check('Admin abre o painel e a área da coordenação', (await go(ad, '/admin')) === 200 && (await go(ad, '/admin/alunos')) === 200 && (await go(ad, '/coordenacao/casos')) === 200)
  t.check('Admin fora da Simulação não usa as páginas do aluno (vai ao seletor)', (await go(ad, '/casos'), ad.url().includes('/admin/simulacao')))

  // ── Isolamento entre turmas + auditoria de casos ──
  const n0 = Number(one(`select count(*) from audit_log where entity_id='${A}'`))
  t.check('Coordenação de outra turma não abre o caso (404) e nada é auditado', (await go(cx, `/coordenacao/casos/${A}`)) === 404 && Number(one(`select count(*) from audit_log where entity_id='${A}'`)) === n0)
  await go(co, `/coordenacao/casos?aluno=${u.aluno}`)
  t.check('Coordenação vê os casos da própria turma (por aluno)', (await co.locator(`[data-caso="P.R.M."]`).count()) >= 1)
  await go(co, `/coordenacao/casos/${A}`)
  t.check('Abrir caso grava auditoria com quem abriu', one(`select count(*) from audit_log where entity_id='${A}' and action='caso.abrir' and actor='${u.coord}'`) === '1')
  await go(ad, `/admin/casos/${A}`)
  t.check('Admin abre caso de qualquer turma, também auditado', one(`select count(*) from audit_log where entity_id='${A}' and action='caso.abrir' and actor='${u.admin}'`) === '1')

  // ── Escritas e leituras recusadas pela RLS (API direta) ──
  const tkCo = await token('coord@perm.local')
  const tkAl = await token('aluno@perm.local')
  const tkCol = await token('colega@perm.local')
  const r1 = await (await rest(tkCo, 'PATCH', `clinical_cases?id=eq.${A}`, { title: 'Alterado' })).json()
  const r2 = await rest(tkCo, 'POST', 'performed_procedures', { case_id: A, step_id: stepId('mock-up'), performed_on: '2026-10-06', quantity: 1 })
  t.check('Coordenação não altera caso nem registra procedimento', Array.isArray(r1) && r1.length === 0 && r2.status >= 400, JSON.stringify([r1, r2.status]))
  const r3 = await (await rest(tkCol, 'GET', `clinical_cases?id=eq.${A}`)).json()
  const r4 = await (await rest(tkCol, 'GET', `performed_procedures?case_id=eq.${A}`)).json()
  t.check('Colega não lê caso nem registros de outro aluno', Array.isArray(r3) && r3.length === 0 && Array.isArray(r4) && r4.length === 0)
  const r5 = await (await rest(tkAl, 'GET', 'audit_log')).json()
  t.check('Aluno não lê a auditoria', Array.isArray(r5) && r5.length === 0)
  const r6 = await rest(tkCo, 'POST', 'audit_log', { action: 'x', entity: 'x' })
  t.check('Ninguém grava direto na auditoria', r6.status >= 400)
  const r7 = await (await rest(tkCo, 'PATCH', `enrollments?user_id=eq.${u.aluno}`, { status: 'inativa' })).json()
  t.check('Coordenação não altera matrículas', Array.isArray(r7) && r7.length === 0)

  // ── Etapa 10 · Parte 1: auditoria da produção individual ──
  const ready = one("select version >= '20261112120000' from schema_info") === 't'
  if (ready) {
    const T = one("select id from cohorts where slug='turma-2027'")
    const call = async (tk, student, cohort) => (await rest(tk, 'POST', 'rpc/log_student_production_view', { p_student_id: student, p_cohort_id: cohort })).json()
    const before = Number(one("select count(*) from audit_log where action='aluno.producao.abrir'"))
    t.check('Produção individual: coordenação da turma autorizada', (await call(tkCo, u.aluno, T)) === true)
    t.check('Produção individual: acesso fica registrado (quem, aluno, turma)', one(`select count(*) from audit_log where action='aluno.producao.abrir' and actor='${u.coord}' and entity_id='${u.aluno}' and cohort_id='${T}'`) === '1')
    const tkCx = await token('coordx@perm.local')
    const refused = [await call(tkCx, u.aluno, T), await call(tkCo, u.alunox, T2), await call(tkCol, u.aluno, T), await call(tkAl, u.aluno, T)]
    t.check('Produção individual: outra turma, colega e o próprio aluno recusados', refused.every((x) => x === false), refused)
    t.check('Recusas não gravam auditoria', Number(one("select count(*) from audit_log where action='aluno.producao.abrir'")) === before + 1)
  } else t.check('Banco sem a migração da Etapa 10 (auditoria da produção não testada)', true)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
