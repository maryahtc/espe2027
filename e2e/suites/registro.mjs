// Registro de procedimentos (Etapa 6): registro rápido por procedimento e por dente, identificador do paciente,
// regras de quantidade e isolamento do caso. Banco LOCAL.
import { go, launch, login, noScroll, one, people, pickStep, sql, stepId, suite, today } from '../lib.mjs'

const t = suite('Registro de procedimentos')
let browser
try {
  const u = await people('registro.local')
  browser = await launch()
  const al = await login(browser, 'aluno@registro.local')

  // ── Novo caso, por procedimento ──
  await go(al, '/casos/novo')
  const f = al.locator('form[data-registro]')
    t.check('Registro rápido abre no celular sem rolagem lateral', (await f.count()) === 1 && (await noScroll(al)))
    await f.locator('#paciente').fill('R.E.G.')
    await f.locator('[role=radio]:has-text("Por procedimento")').click()
    await pickStep(f, 'mock', 'Mock-up')
    await f.locator('button[type=submit]').click()
    await al.waitForURL(/\/casos\/[0-9a-f-]{36}\?registrado=1/, { timeout: 20000 })
  const caso = one(`select id from clinical_cases where owner_id='${u.aluno}' and patient_label='R.E.G.'`)
  t.check('Novo caso criado com o identificador do paciente e dono = aluno', !!caso)
  t.check(
    'Registro gravado com a etapa, a data de hoje e quantidade 1',
    one(`select count(*)||'|'||min(performed_on)||'|'||sum(quantity) from performed_procedures where case_id='${caso}' and step_id='${stepId('mock-up')}'`) === `1|${today()}|1`,
  )

  // ── Caso existente, por dente: posições definem a quantidade ──
  await go(al, `/casos/novo?caso=${caso}`)
  const f2 = al.locator('form[data-registro]')
  await f2.locator('[role=radio]:has-text("Por dente")').click()
  for (const d of [11, 21]) await f2.locator(`[data-composer] [data-dente="${d}"]`).click()
  t.check('Por dente: seleção mostra os dentes escolhidos', /2 dentes/.test(await f2.locator('[data-selecao]').innerText()))
  await f2.locator('button:has-text("Escolher procedimento →")').click()
  await pickStep(f2, 'resina anterior', 'Restauração em resina — anterior')
  t.check('Linha do registro mostra as posições', /11.*21|21.*11/.test(await f2.locator('[data-linha="0"] [data-posicoes]').innerText()))
  await f2.locator('button[type=submit]').click()
  await al.waitForURL(/registrado=1/, { timeout: 20000 })
  t.check(
    'Registro por dente: dentes gravados e quantidade = número de dentes',
    one(`select array_to_string(teeth, ',')||'|'||quantity from performed_procedures where case_id='${caso}' and step_id='${stepId('restauracao-em-resina-anterior')}'`) === '11,21|2',
  )
  t.check('O caso continua um só (registro entrou no caso existente)', one(`select count(*) from clinical_cases where owner_id='${u.aluno}'`) === '1')

  // ── Identificador do paciente: nome completo é recusado (não é prontuário) ──
  const before = one(`select count(*) from clinical_cases where owner_id='${u.aluno}'`)
  await go(al, '/casos/novo')
  const f3 = al.locator('form[data-registro]')
  await f3.locator('#paciente').fill('Maria Silva')
  await f3.locator('[role=radio]:has-text("Por procedimento")').click()
  await pickStep(f3, 'mock', 'Mock-up')
  await f3.locator('button[type=submit]').click()
  await al.waitForTimeout(1500)
  t.check('Nome completo do paciente é recusado e nada é gravado', one(`select count(*) from clinical_cases where owner_id='${u.aluno}'`) === before && al.url().includes('/casos/novo'))

  // ── Isolamento ──
  const col = await login(browser, 'colega@registro.local')
  t.check('Colega não abre o caso (404)', (await go(col, `/casos/${caso}`)) === 404)
  await go(col, '/casos')
  t.check('Colega não vê o caso na lista', (await col.locator(`[data-caso="${caso}"]`).count()) === 0)
  t.check('Banco recusa dente inválido (FDI)', (() => {
    try {
      sql(`insert into performed_procedures (case_id, step_id, performed_on, quantity, teeth) values ('${caso}','${stepId('restauracao-em-resina-anterior')}','${today()}',1,'{19}')`)
      return false
    } catch {
      return true
    }
  })())
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
