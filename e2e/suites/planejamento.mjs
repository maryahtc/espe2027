// Planejamento do Caso (Etapa 8): planejar consulta, registrar a partir do plano (registro real), vínculo e
// comparação ✓ ◐ ○ +, levar o que faltou, desfazer vínculo, leitura da coordenação e separação total
// planejado × realizado. Banco LOCAL.
import { go, launch, login, newCase, newRecord, noScroll, one, people, pickStep, stepId, suite, today } from '../lib.mjs'

const t = suite('Planejamento do Caso')
let browser
const records = (c) => one(`select count(*)||'|'||md5(coalesce(string_agg(r::text,'' order by r.id),'')) from performed_procedures r where case_id='${c}'`)
try {
  const u = await people('plano.local')
  const caso = newCase(u.aluno, 'P.L.N.')
  newRecord(caso, stepId('mock-up'), '2026-10-01')
  browser = await launch()
  const al = await login(browser, 'aluno@plano.local')

  await go(al, `/casos/${caso}`)
  t.check('Seção "Planejamento do caso" com o aviso de que não é prontuário', (await al.locator('#planejamento [data-aviso-planejamento]').count()) === 1)
  t.check('Estado vazio com "+ Planejar consulta"', (await al.locator('#planejamento [data-planejar]').count()) === 1)
  const journey0 = await al.locator('[data-jornada]').innerText()
  const rec0 = records(caso)

  // ── Planejar: por dente + por procedimento ──
  await go(al, `/casos/${caso}/planejamento/nova`)
  const f = al.locator('form[data-editor-plano]')
  await f.locator('[data-composer] [role=radio]:has-text("Por dente")').click()
  for (const d of [11, 12, 21, 22]) await f.locator(`[data-composer] [data-dente="${d}"]`).click()
  await f.locator('button:has-text("Escolher procedimento →")').click()
  await pickStep(f, 'resina anterior', 'Restauração em resina — anterior')
  if ((await f.locator('[data-composer]').count()) === 0) await f.locator('[data-mais-item]').click()
  await f.locator('[data-composer] [role=radio]:has-text("Por procedimento")').click()
  await pickStep(f, 'ajuste', 'Ajuste oclusal')
  t.check('Editor do planejamento em 390 px sem rolagem lateral', await noScroll(al))
  await f.locator('[data-salvar-plano]').click()
  await al.waitForURL((x) => /\/casos\/[0-9a-f-]{36}/.test(x.href) && !x.href.includes('/planejamento/'), { timeout: 20000 })
  await al.waitForLoadState('networkidle')
  const visit = one(`select id from case_plan_visits where case_id='${caso}'`)
  t.check('Consulta planejada gravada com 2 itens', one(`select count(*) from case_plan_items where visit_id='${visit}'`) === '2')
  t.check('Planejar não cria registro real nem altera a Jornada', records(caso) === rec0 && (await al.locator('[data-jornada]').innerText()) === journey0)
  t.check('Aparece como "Consulta planejada 1"', /Consulta planejada 1/.test(await al.locator('[data-plano-consulta]').first().innerText()))

  // ── Registrar o que foi realizado (registro real pré-preenchido, editável) ──
  await al.locator('[data-plano-consulta] [data-registrar-realizado]').first().click()
  await al.waitForURL(/plano=/, { timeout: 20000 })
  await al.waitForLoadState('networkidle')
  const rf = al.locator('form[data-registro]')
  t.check('Registro abre pré-preenchido com o aviso "Confira e ajuste"', /Confira e ajuste/.test(await rf.locator('[data-a-partir-do-plano]').innerText()) && (await rf.locator('[data-linha]').count()) === 2)
  await rf.locator('[data-linha="1"] button:has-text("Remover")').click()
  await rf.locator('button[type=submit]').click()
  await al.waitForURL(/vinculo=ok/, { timeout: 20000 })
  await al.waitForLoadState('networkidle')
  t.check('Só o registro gravou em performed_procedures (resina 4 dentes hoje)', one(`select count(*)||'|'||sum(quantity) from performed_procedures where case_id='${caso}' and performed_on='${today()}'`) === '1|4')
  t.check('Consulta planejada vinculada à data real', one(`select realized_on from case_plan_visits where id='${visit}'`) === today())
  const linked = al.locator('[data-plano-consulta][data-estado="vinculada"]')
  t.check('"Consulta vinculada · DD/MM" (nunca "realizada" ou "concluída")', /Consulta vinculada · \d\d\/\d\d/.test(await linked.innerText()) && !/realizada|cumprida|concluíd/i.test(await linked.locator('[data-titulo-consulta]').innerText()))
  t.check('Comparação: resina ✓ e ajuste ○', (await linked.locator('[data-resultado="planejado"]').count()) === 1 && (await linked.locator('[data-resultado="nao_registrado"]').count()) === 1)

  // ── Planejar em nova consulta só o que faltou ──
  await linked.locator('[data-resultado="nao_registrado"] [data-acao="planejar-nova"]').click()
  await al.waitForTimeout(1500)
  t.check('"Planejar em nova consulta" cria consulta com só o que faltou', one(`select count(*) from case_plan_visits where case_id='${caso}' and realized_on is null`) === '1' && one(`select count(*) from case_plan_items i join case_plan_visits v on v.id=i.visit_id where v.case_id='${caso}' and v.realized_on is null`) === '1')

  // ── Coordenação: leitura sem ações ──
  const co = await login(browser, 'coord@plano.local', { phone: false })
  await go(co, `/coordenacao/casos/${caso}`)
  t.check('Coordenação vê o planejamento e a comparação, sem ações', (await co.locator('[data-plano-consulta]').count()) === 2 && (await co.locator('[data-planejar], [data-registrar-realizado], [data-acao]').count()) === 0)

  // ── Desfazer vínculo: registros reais intactos ──
  const recLinked = records(caso)
  await go(al, `/casos/${caso}`)
  await al.locator('[data-plano-consulta][data-estado="vinculada"] [data-acao="desfazer-vinculo"]').click()
  await al.waitForTimeout(1500)
  t.check('Desfazer vínculo não mexe nos registros reais', one(`select realized_on is null from case_plan_visits where id='${visit}'`) === 't' && records(caso) === recLinked)

  // ── Isolamento ──
  const col = await login(browser, 'colega@plano.local')
  t.check('Colega não abre o editor do planejamento do caso alheio', (await go(col, `/casos/${caso}/planejamento/nova`)) === 404)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
