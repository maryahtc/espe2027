// Odontograma e localização (Etapa 6): dentes FDI, atalhos, arcada nas etapas por arcada, quantidade derivada das
// posições e regras do banco. Banco LOCAL.
import { go, launch, login, newCase, noScroll, one, people, pickStep, sql, stepId, suite, today } from '../lib.mjs'

const t = suite('Odontograma')
let browser
try {
  const u = await people('odonto.local')
  const caso = newCase(u.aluno, 'O.D.T.')
  browser = await launch()
  const al = await login(browser, 'aluno@odonto.local')

  // ── Atalho "Anteriores sup." + quantidade pelas posições ──
  await go(al, `/casos/novo?caso=${caso}`)
  const f = al.locator('form[data-registro]')
  await f.locator('[role=radio]:has-text("Por dente")').click()
  await f.locator('[aria-label="Atalhos"] button:has-text("Anteriores sup.")').click()
  t.check('Atalho "Anteriores sup." marca os 6 dentes', /6 dentes/.test(await f.locator('[data-selecao]').innerText()))
  await f.locator('[data-composer] [data-dente="13"]').click()
  t.check('Tocar num dente marcado desmarca', /5 dentes/.test(await f.locator('[data-selecao]').innerText()))
  t.check('Odontograma cabe em 390 px', await noScroll(al))
  await f.locator('button:has-text("Escolher procedimento →")').click()
  await pickStep(f, 'laminado', 'Laminado cerâmico · Preparo')
  await f.locator('button[type=submit]').click()
  await al.waitForURL(/registrado=1/, { timeout: 20000 })
  const row = one(`select array_to_string(teeth, ',')||'|'||quantity from performed_procedures where case_id='${caso}' and step_id='${stepId('laminado-ceramico', 'preparo')}'`)
  t.check('Dentes gravados (FDI) e quantidade = 5 posições', row.split('|')[1] === '5' && row.split('|')[0].split(',').sort().join(',') === '11,12,21,22,23', row)

  // ── Etapa por arcada: escolhe a arcada; "Ambas" conta 2 ──
  const arch = one(
    "select p.name||'|'||s.name||'|'||s.id from procedure_steps s join procedures p on p.id=s.procedure_id where s.location='arcada' and s.active and p.active order by p.position, s.position limit 1",
  ).split('|')
  if (arch.length === 3) {
    const [pname, sname, sid] = arch
    await go(al, `/casos/novo?caso=${caso}`)
    const g = al.locator('form[data-registro]')
    await g.locator('[role=radio]:has-text("Por procedimento")').click()
    await pickStep(g, pname.split(' ')[0].toLowerCase(), pname === sname ? pname : `${pname} · ${sname}`)
    t.check('Etapa por arcada pede a arcada (sem odontograma de dentes)', (await g.locator('[data-arcada]').count()) === 1)
    await g.locator('[data-arcada] label:has-text("Ambas")').click()
    await g.locator('button[type=submit]').click()
    await al.waitForURL(/registrado=1/, { timeout: 20000 })
    t.check('Arcada "ambas" gravada e conta 2', one(`select arch||'|'||quantity from performed_procedures where case_id='${caso}' and step_id='${sid}'`) === 'ambas|2')
  } else t.check('Catálogo sem etapa por arcada ativa (verificação de arcada não aplicável)', true)

  // ── Regras do banco ──
  const res = stepId('restauracao-em-resina-anterior')
  const refused = (q) => {
    try {
      sql(q)
      return false
    } catch {
      return true
    }
  }
  t.check('Banco recusa dente fora da notação FDI', refused(`insert into performed_procedures (case_id, step_id, performed_on, quantity, teeth) values ('${caso}','${res}','${today()}',1,'{19}')`))
  t.check('Banco recusa arcada numa etapa que identifica dentes', refused(`insert into performed_procedures (case_id, step_id, performed_on, quantity, arch) values ('${caso}','${res}','${today()}',1,'superior')`))
  if (arch.length === 3)
    t.check('Banco recusa dentes numa etapa que identifica arcada', refused(`insert into performed_procedures (case_id, step_id, performed_on, quantity, teeth) values ('${caso}','${arch[2]}','${today()}',1,'{11}')`))
  t.check(
    'Banco ajusta a quantidade às posições informadas',
    (() => {
      const id = one(`insert into performed_procedures (case_id, step_id, performed_on, quantity, teeth) values ('${caso}','${res}','${today()}',9,'{31,41}') returning id`)
      return one(`select quantity from performed_procedures where id='${id}'`) === '2'
    })(),
  )

  // ── Página do caso: mapa de dentes ──
  await go(al, `/casos/${caso}`)
  t.check('Página do caso mostra a jornada com os registros', (await al.locator('[data-jornada] [data-registro]').count()) >= 2)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
