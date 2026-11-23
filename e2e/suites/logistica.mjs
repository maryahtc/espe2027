// Bloco A · B1 — professores e logística: participação, passagem e hospedagem por módulo (situações independentes),
// localizador/reserva, comprovante, responsável, "aguardando quem", agenda e contato do professor, painel do Admin,
// coordenação só consulta, aluno sem acesso, programação acadêmica intacta, 390 px e o portal sem a migração.
// Banco LOCAL.
import { cohortId, go, launch, login, noScroll, one, people, rest, sql, suite, today, token } from '../lib.mjs'

const t = suite('Professores e logística')
let browser
const settleAfter = async (p) => {
  await p.waitForTimeout(1200)
  await p.waitForLoadState('networkidle')
}
const academic = () =>
  one(
    "select md5(string_agg(h,'|' order by h)) from (select 'm'||md5(coalesce(string_agg(r::text,'' order by r::text),'')) h from modules r union all select 's'||md5(coalesce(string_agg(r::text,'' order by r::text),'')) from module_sessions r union all select 'sf'||md5(coalesce(string_agg(r::text,'' order by r::text),'')) from session_faculty r union all select 'ms'||md5(coalesce(string_agg(r::text,'' order by r::text),'')) from module_staff r union all select 'd'||md5(coalesce(string_agg(r::text,'' order by r::text),'')) from module_days r) x",
  )

try {
  sql("delete from cohorts where slug = 'log-t2'")
  const T = cohortId()
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Logística 2','log-t2','2026-01-01','2028-07-31') returning id")
  const u = await people('log.local', { coord2: { role: 'coordenacao', cohort: T2, cohortRole: 'coordenacao' } })
  // Módulo 1 começa em 20 dias (dentro da janela de 45 dias do painel)
  sql(`update module_days d set date = d.date + ((date '${today()}' + 20) - x.first) from (select m.id, min(md.date) first from modules m join module_days md on md.module_id=m.id where m.cohort_id='${T}' and m.number=1 group by m.id) x where d.module_id = x.id`)
  const m1 = one(`select id from modules where cohort_id='${T}' and number=1`)
  const victor = one("select id from faculty where display_name='Victor'")
  const ops = one("insert into ops_people (name, role_title) values ('Compras Log', 'Compras') returning id")
  const ACAD = academic()

  browser = await launch()
  const ad = await login(browser, 'admin@log.local', { phone: false })

  // ── Quadro ──
  t.check('Admin abre "Professores e logística" (200)', (await go(ad, '/admin/professores')) === 200 && (await ad.locator('[data-logistica]').count()) === 1)
  const card = ad.locator(`[data-modulo-logistica="${m1}"]`)
  const teachers = await card.locator('[data-professor]').evaluateAll((els) => els.map((e) => e.getAttribute('data-professor')))
  const expected = one(`select count(distinct fid) from (select faculty_id fid from module_staff where module_id='${m1}' union select faculty_id from session_faculty where module_id='${m1}') x`)
  t.check('Módulo lista os professores da equipe e das atividades (sem repetir)', String(teachers.length) === expected && teachers.includes(victor), `${teachers.length} × ${expected}`)
  t.check('Sem registro: a convidar, passagem a providenciar, hospedagem a reservar', (await card.locator(`[data-professor="${victor}"] [data-participacao="a_convidar"]`).count()) === 1 && (await card.locator(`[data-professor="${victor}"] [data-passagem="a_providenciar"]`).count()) === 1 && (await card.locator(`[data-professor="${victor}"] [data-hospedagem="a_reservar"]`).count()) === 1)

  // ── Validação: check-out antes do check-in ──
  const row = card.locator(`[data-professor="${victor}"]`)
  await row.locator('[data-editar-logistica] > summary').click()
  const form = row.locator('[data-editar-logistica] form')
  await form.locator('select[name=participacao]').selectOption('confirmado')
  await form.locator('input[name=check_in]').fill(one(`select (date '${today()}' + 21)::text`))
  await form.locator('input[name=check_out]').fill(one(`select (date '${today()}' + 19)::text`))
  await form.locator('button[type=submit]').click()
  await settleAfter(ad)
  t.check('Check-out antes do check-in é recusado, com mensagem, nada gravado', /check-out/i.test(await form.locator('[role=alert]').innerText()) && one(`select count(*) from module_faculty_logistics where faculty_id='${victor}'`) === '0')

  // ── Salvar: confirmado, passagem comprada, hospedagem aguardando a UIOA ──
  await go(ad, '/admin/professores')
  const row2 = ad.locator(`[data-modulo-logistica="${m1}"] [data-professor="${victor}"]`)
  await row2.locator('[data-editar-logistica] > summary').click()
  const f2 = row2.locator('[data-editar-logistica] form')
  await f2.locator('select[name=participacao]').selectOption('confirmado')
  await f2.locator('input[name=respondeu_em]').fill(today())
  await f2.locator('select[name=passagem]').selectOption('comprada')
  await f2.locator('input[name=chegada]').fill(`${one(`select (date '${today()}' + 19)::text`)}T18:30`)
  await f2.locator('input[name=saida]').fill(`${one(`select (date '${today()}' + 22)::text`)}T20:00`)
  await f2.locator('input[name=localizador]').fill('XYZ123')
  await f2.locator('input[name=passagem_comprovante]').fill('https://exemplo.org/bilhete.pdf')
  await f2.locator('select[name=passagem_responsavel]').selectOption(`o:${ops}`)
  await f2.locator('select[name=hospedagem]').selectOption('aguardando_confirmacao')
  await f2.locator('input[name=hotel]').fill('Hotel Central')
  await f2.locator('input[name=check_in]').fill(one(`select (date '${today()}' + 19)::text`))
  await f2.locator('input[name=check_out]').fill(one(`select (date '${today()}' + 22)::text`))
  await f2.locator('input[name=hospedagem_aguardando]').fill('UIOA')
  await f2.locator('button[type=submit]').click()
  await settleAfter(ad)
  const saved = one(`select participation||'|'||travel||'|'||lodging||'|'||travel_locator||'|'||travel_responsible_ops_id||'|'||lodging_waiting_on from module_faculty_logistics where module_id='${m1}' and faculty_id='${victor}'`)
  t.check('Gravado com situações independentes, localizador, responsável operacional e "aguardando UIOA"', saved === `confirmado|comprada|aguardando_confirmacao|XYZ123|${ops}|UIOA`, saved)
  await go(ad, '/admin/professores')
  const r3 = ad.locator(`[data-modulo-logistica="${m1}"] [data-professor="${victor}"]`)
  const txt = await r3.innerText()
  t.check('Linha mostra confirmação, passagem comprada, hospedagem aguardando a UIOA, localizador e responsável', /Confirmado/.test(txt) && /Passagem: Comprada/.test(txt) && /Hospedagem: Aguardando confirmação/.test(txt) && /aguardando UIOA/.test(txt) && /XYZ123/.test(txt) && /Compras Log/.test(txt))
  t.check('Link do comprovante da passagem', (await r3.locator('a:has-text("Comprovante da passagem")').getAttribute('href')) === 'https://exemplo.org/bilhete.pdf')
  t.check('Resumo do topo conta o "aguardando terceiros"', (await ad.locator('[data-contagem-logistica="aguardando"] [data-valor]').innerText()) === '1')
  await go(ad, '/admin/professores?situacao=aguardando')
  const waitingIds = await ad.locator('[data-professor]').evaluateAll((els) => els.map((e) => e.getAttribute('data-professor')))
  t.check('Filtro "Aguardando terceiros" mostra só quem depende de outros', waitingIds.length === 1 && waitingIds[0] === victor, waitingIds)

  // ── Programação acadêmica intacta ──
  t.check('Programação, equipe e datas dos módulos intactas', academic() === ACAD)

  // ── Agenda e contato ──
  t.check('Agenda do professor abre (200)', (await go(ad, `/admin/professores/${victor}`)) === 200 && (await ad.locator(`[data-modulo-logistica="${m1}"]`).count()) === 1)
  const cf = ad.locator('[data-contato-form] form')
  if (!(await ad.locator('[data-contato-form]').evaluate((d) => d.open))) await ad.locator('[data-contato-form] > summary').click()
  await cf.locator('input[name=cidade]').fill('Curitiba')
  await cf.locator('input[name=telefone]').fill('+55 41 97777-0000')
  await cf.locator('input[name=email]').fill('victor@log.local')
  await cf.locator('button[type=submit]').click()
  await settleAfter(ad)
  t.check('Contato salvo', one(`select city||'|'||phone from faculty_contacts where faculty_id='${victor}'`) === 'Curitiba|+55 41 97777-0000')

  // ── Painel do Admin ──
  await go(ad, '/admin')
  const att = await ad.locator('[data-atencao-secao]').innerText()
  t.check('"Precisa da sua atenção": professores a confirmar e passagens/hospedagens pendentes (45 dias)', (await ad.locator('[data-atencao="professores-a-confirmar"]').count()) === 1 && (await ad.locator('[data-atencao="logistica-pendente"]').count()) === 1 && /aguardando confirmação de terceiros/.test(att))

  // ── Coordenação: só consulta, só a própria turma ──
  const co = await login(browser, 'coord@log.local', { phone: false })
  t.check('Coordenação abre a consulta e tem o link no menu', (await go(co, '/coordenacao/professores')) === 200 && (await co.locator('header a[href="/coordenacao/professores"]').count()) === 1)
  const coRow = co.locator(`[data-modulo-logistica="${m1}"] [data-professor="${victor}"]`)
  t.check('Coordenação vê situações e o contato do professor da turma', /Confirmado/.test(await coRow.innerText()) && /Curitiba/.test(await coRow.innerText()))
  t.check('Coordenação não tem formulários de edição', (await co.locator('[data-editar-logistica]').count()) === 0 && (await co.locator('main form[action*="saveLogistics"], main button:has-text("Salvar logística")').count()) === 0)
  t.check('Coordenação não abre o quadro do Admin nem a agenda (404)', (await go(co, '/admin/professores')) === 404 && (await go(co, `/admin/professores/${victor}`)) === 404)
  const tkCo = await token('coord@log.local')
  await rest(tkCo, 'PATCH', `module_faculty_logistics?faculty_id=eq.${victor}`, { travel: 'cancelada' })
  t.check('API: coordenação não altera a logística', one(`select travel from module_faculty_logistics where faculty_id='${victor}'`) === 'comprada')
  const co2 = await login(browser, 'coord2@log.local', { phone: false })
  await go(co2, '/coordenacao/professores?escopo=todos')
  t.check('Coordenação de outra turma não vê módulos nem contatos da turma 1', (await co2.locator(`[data-modulo-logistica="${m1}"]`).count()) === 0 && !/Curitiba/.test(await co2.locator('main').innerText()))
  const tkCo2 = await token('coord2@log.local')
  t.check('API: coordenação de outra turma não lê contato nem logística', (await (await rest(tkCo2, 'GET', `faculty_contacts?faculty_id=eq.${victor}`)).json()).length === 0 && (await (await rest(tkCo2, 'GET', 'module_faculty_logistics?select=id')).json()).length === 0)

  // ── Aluno ──
  const al = await login(browser, 'aluno@log.local')
  t.check('Aluno não abre as telas (404)', (await go(al, '/admin/professores')) === 404 && (await go(al, '/coordenacao/professores')) === 404)
  const tkAl = await token('aluno@log.local')
  t.check('API: aluno não lê contatos nem logística', (await (await rest(tkAl, 'GET', 'faculty_contacts?select=faculty_id')).json()).length === 0 && (await (await rest(tkAl, 'GET', 'module_faculty_logistics?select=id')).json()).length === 0)
  t.check('Contato do professor não aparece para o aluno no módulo', ((await go(al, `/modulos/${m1}`)), !/97777|victor@log\.local/.test(await al.locator('main').innerText())))

  // ── 390 px ──
  const am = await login(browser, 'admin@log.local')
  await go(am, '/admin/professores')
  await am.locator(`[data-modulo-logistica="${m1}"] [data-professor="${victor}"] [data-editar-logistica] > summary`).click()
  t.check('Quadro do Admin em 390 px sem rolagem lateral (com o formulário aberto)', await noScroll(am))
  const cm = await login(browser, 'coord@log.local')
  await go(cm, '/coordenacao/professores')
  t.check('Consulta da coordenação em 390 px sem rolagem lateral', await noScroll(cm))

  // ── Banco sem a migração ──
  const version = one('select version from schema_info')
  sql("update schema_info set version='20261123120000_pendencias'")
  try {
    await go(ad, '/admin/professores')
    t.check('Sem a migração: aviso, sem quadro', /Ainda não disponível/.test(await ad.locator('main').innerText()) && (await ad.locator('[data-logistica]').count()) === 0)
    await go(ad, '/admin')
    t.check('Sem a migração: painel sem itens de logística', (await ad.locator('[data-atencao="professores-a-confirmar"], [data-atencao="logistica-pendente"]').count()) === 0)
  } finally {
    sql(`update schema_info set version='${version}'`)
  }
  void u
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
