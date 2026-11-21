// Bloco A · B2 — quadro único de pendências (Admin e coordenação): criar, editar, filtrar, mudar situação, atrasadas no
// painel do Admin, pendências do módulo, isolamento entre turmas, aluno sem acesso, 390 px e o portal sem a migração.
// Banco LOCAL.
import { cohortId, fingerprint, go, launch, login, noScroll, one, people, rest, sql, suite, today, token } from '../lib.mjs'

const t = suite('Pendências')
let browser
const titles = (p) => p.locator('[data-pendencia] [data-titulo]').allInnerTexts()
const days = (n) => one(`select (date '${today()}' + ${n})::text`)
const settleAfter = async (p) => {
  await p.waitForTimeout(1200)
  await p.waitForLoadState('networkidle')
}

try {
  sql("delete from cohorts where slug = 'pend-t2'")
  const T = cohortId()
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Pendências 2','pend-t2','2026-01-01','2028-07-31') returning id")
  const u = await people('pend.local', { coord2: { role: 'coordenacao', cohort: T2, cohortRole: 'coordenacao' } })
  sql("delete from faculty where full_name = 'Apoio Compras E2E'")
  const apoio = one("insert into faculty (full_name, display_name, kind) values ('Apoio Compras E2E', 'Apoio Compras', 'apoio') returning id")
  const m1 = one(`select id from modules where cohort_id='${T}' and number=1`)

  browser = await launch()
  const ad = await login(browser, 'admin@pend.local', { phone: false })

  // ── Quadro vazio ──
  const FP = fingerprint()
  t.check('Admin abre o quadro (200), vazio', (await go(ad, '/admin/pendencias')) === 200 && (await ad.locator('[data-quadro-vazio]').count()) === 1)
  t.check('Abrir o quadro não grava nada', fingerprint() === FP)
  t.check('Menu do Admin tem "Pendências"', (await ad.locator('a[href="/admin/pendencias"]').count()) >= 1)

  // ── Criar pendência geral, atrasada, de equipamentos, com responsável sem login ──
  await ad.locator('[data-nova-pendencia] > summary').click()
  const nf = ad.locator('[data-nova-pendencia] form')
  await nf.locator('input[name=demanda]').fill('Microscópios para o módulo de endodontia')
  await nf.locator('select[name=categoria]').selectOption('equipamentos')
  await nf.locator('select[name=prioridade]').selectOption('alta')
  await nf.locator('select[name=turma]').selectOption('')
  await nf.locator('select[name=responsavel]').selectOption(apoio)
  await nf.locator('input[name=prazo]').fill(days(-2))
  await nf.locator('details summary').click()
  await nf.locator('input[name=qtd_necessaria]').fill('2')
  await nf.locator('input[name=qtd_disponivel]').fill('0')
  await nf.locator('input[name=empresa]').fill('Empresa X')
  await nf.locator('button[type=submit]').click()
  await settleAfter(ad)
  const geral = one("select id||'|'||coalesce(cohort_id::text,'geral')||'|'||category||'|'||priority||'|'||responsible_id||'|'||quantity_needed from admin_tasks where title='Microscópios para o módulo de endodontia'")
  t.check('Pendência geral gravada (sem turma, equipamentos, alta, responsável sem login, qtd)', geral.split('|').slice(1).join('|') === `geral|equipamentos|alta|${apoio}|2.00`, geral)
  const gid = geral.split('|')[0]
  t.check('Quem criou fica registrado', one(`select created_by from admin_tasks where id='${gid}'`) === u.admin)
  await go(ad, '/admin/pendencias')
  const card = ad.locator(`[data-pendencia="${gid}"]`)
  t.check('Aparece no quadro como atrasada, com o que falta', (await card.getAttribute('data-atrasada')) === '1' && /faltam 2/.test(await card.innerText()) && /Apoio Compras/.test(await card.innerText()))

  // ── Criar a partir do módulo (turma e módulo já preenchidos) ──
  await go(ad, `/admin/pendencias?modulo=${m1}&novo=1`)
  const mf = ad.locator('[data-nova-pendencia] form')
  t.check('"Nova pendência deste módulo" chega com o módulo e a turma escolhidos', (await mf.locator('select[name=modulo]').inputValue()) === m1 && (await mf.locator('select[name=turma]').inputValue()) === T)
  await mf.locator('input[name=demanda]').fill('Kit de boas-vindas (PHS, camiseta, lupa)')
  await mf.locator('select[name=categoria]').selectOption('experiencia_aluno')
  await mf.locator('input[name=prazo]').fill(days(30))
  await mf.locator('button[type=submit]').click()
  await settleAfter(ad)
  const kit = one("select id||'|'||cohort_id||'|'||module_id from admin_tasks where title like 'Kit de boas-vindas%'")
  t.check('Pendência do módulo gravada na turma do módulo', kit.split('|')[1] === T && kit.split('|')[2] === m1, kit)
  const kid = kit.split('|')[0]

  // ── Filtros ──
  await go(ad, '/admin/pendencias?categoria=experiencia_aluno')
  t.check('Filtro por categoria', JSON.stringify(await titles(ad)) === JSON.stringify(['Kit de boas-vindas (PHS, camiseta, lupa)']))
  await go(ad, '/admin/pendencias?atrasadas=1')
  t.check('Filtro "só atrasadas"', JSON.stringify(await titles(ad)) === JSON.stringify(['Microscópios para o módulo de endodontia']))
  await go(ad, '/admin/pendencias?turma=geral')
  t.check('Filtro "Geral (sem turma)"', (await titles(ad)).length === 1)
  await go(ad, '/admin/pendencias')
  t.check('Contagens: 2 em aberto, 1 atrasada, 1 de prioridade alta', (await ad.locator('[data-contagem="abertas"] [data-valor]').innerText()) === '2' && (await ad.locator('[data-contagem="atrasadas"] [data-valor]').innerText()) === '1' && (await ad.locator('[data-contagem="alta"] [data-valor]').innerText()) === '1')
  t.check('Ordem: atrasada primeiro', (await titles(ad))[0] === 'Microscópios para o módulo de endodontia')

  // ── Painel do Admin e editor do módulo ──
  await go(ad, '/admin')
  t.check('"Precisa da sua atenção" mostra a pendência atrasada, com link filtrado', /1 pendência atrasada no quadro/.test(await ad.locator('[data-atencao="pendencia-atrasada"]').innerText()) && (await ad.locator('[data-atencao="pendencia-atrasada"]').getAttribute('href')) === '/admin/pendencias?atrasadas=1')
  t.check('Painel mostra pendências em aberto e de prioridade alta', (await ad.locator('[data-numero="pendencias"] [data-valor]').innerText()) === '2' && (await ad.locator('[data-numero="pendencias-alta"] [data-valor]').innerText()) === '1')
  await go(ad, `/admin/modulos/${m1}`)
  t.check('Editor do módulo lista as pendências do módulo', /Kit de boas-vindas/.test(await ad.locator('[data-pendencias-modulo]').innerText()) && !/Microscópios/.test(await ad.locator('[data-pendencias-modulo]').innerText()))

  // ── Editar e mudar situação ──
  await go(ad, '/admin/pendencias')
  const kc = ad.locator(`[data-pendencia="${kid}"]`)
  await kc.locator('[data-editar] > summary').click()
  await kc.locator('[data-editar] input[name=demanda]').fill('Kit de boas-vindas do Módulo 1')
  await kc.locator('[data-editar] input[name=proxima_acao]').fill('Pedir orçamento das camisetas')
  await kc.locator('[data-editar] form').first().locator('button[type=submit]').click()
  await settleAfter(ad)
  t.check('Editar grava título e próxima ação', one(`select title||'|'||next_action from admin_tasks where id='${kid}'`) === 'Kit de boas-vindas do Módulo 1|Pedir orçamento das camisetas')
  await go(ad, '/admin/pendencias')
  const gc = ad.locator(`[data-pendencia="${gid}"]`)
  await gc.locator('[data-trocar-situacao]').selectOption('concluida')
  await gc.locator('form').first().locator('button[type=submit]').click()
  await settleAfter(ad)
  t.check('Concluir pela lista grava a situação e a data de conclusão', one(`select status||'|'||(completed_at is not null) from admin_tasks where id='${gid}'`) === 'concluida|true')
  await go(ad, '/admin/pendencias')
  t.check('Concluída sai da lista padrão (em aberto) e aparece em "Todas"', !(await titles(ad)).includes('Microscópios para o módulo de endodontia') && ((await go(ad, '/admin/pendencias?situacao=todas')), (await titles(ad)).includes('Microscópios para o módulo de endodontia')))
  t.check('Histórico guarda criação e alterações', Number(one(`select count(*) from change_log where table_name='admin_tasks' and row_id='${gid}'`)) >= 2)

  // ── Coordenação ──
  const t2task = one(`insert into admin_tasks (title, cohort_id, category) values ('Pendência só da turma 2', '${T2}', 'marketing') returning id`)
  const co = await login(browser, 'coord@pend.local', { phone: false })
  t.check('Coordenação abre o quadro e tem o link no menu', (await go(co, '/coordenacao/pendencias')) === 200 && (await co.locator('header a[href="/coordenacao/pendencias"]').count()) === 1)
  await go(co, '/coordenacao/pendencias?situacao=todas')
  const coTitles = await titles(co)
  t.check('Coordenação vê só a própria turma (nem a geral, nem a turma 2)', JSON.stringify(coTitles) === JSON.stringify(['Kit de boas-vindas do Módulo 1']), coTitles)
  await co.locator('[data-nova-pendencia] > summary').click()
  const cf = co.locator('[data-nova-pendencia] form')
  const cohortOpts = await cf.locator('select[name=turma] option').evaluateAll((os) => os.map((o) => o.value))
  t.check('Coordenação não tem a opção "Geral (sem turma)"', !cohortOpts.includes('') && cohortOpts.includes(T) && !cohortOpts.includes(T2))
  await cf.locator('input[name=demanda]').fill('Confirmar fotógrafo do Módulo 1')
  await cf.locator('select[name=categoria]').selectOption('foto_video')
  await cf.locator('details summary').click()
  await cf.locator('input[name=link]').fill('https://exemplo.org/pasta')
  await cf.locator('button[type=submit]').click()
  await settleAfter(co)
  t.check('Coordenação cria pendência na própria turma (com link)', one("select cohort_id||'|'||link_url from admin_tasks where title='Confirmar fotógrafo do Módulo 1'") === `${T}|https://exemplo.org/pasta`)
  await go(co, '/coordenacao/pendencias')
  await co.locator(`[data-pendencia="${kid}"] [data-editar] > summary`).click()
  t.check('Coordenação não tem o botão de excluir', (await co.locator('button:has-text("Excluir pendência")').count()) === 0)
  const co2 = await login(browser, 'coord2@pend.local', { phone: false })
  await go(co2, '/coordenacao/pendencias?situacao=todas')
  t.check('Coordenação da turma 2 vê só a da turma 2', JSON.stringify(await titles(co2)) === JSON.stringify(['Pendência só da turma 2']))

  // ── Aluno ──
  const al = await login(browser, 'aluno@pend.local')
  t.check('Aluno não abre os quadros (404)', (await go(al, '/admin/pendencias')) === 404 && (await go(al, '/coordenacao/pendencias')) === 404)
  const tk = await token('aluno@pend.local')
  const api = await (await rest(tk, 'GET', 'admin_tasks?select=id')).json()
  t.check('API: aluno não lê nenhuma pendência', Array.isArray(api) && api.length === 0)

  // ── Exclusão pelo Admin ──
  await go(ad, '/admin/pendencias?situacao=todas')
  await ad.locator(`[data-pendencia="${t2task}"] [data-editar] > summary`).click()
  await ad.locator(`[data-pendencia="${t2task}"] button:has-text("Excluir pendência")`).click()
  await settleAfter(ad)
  t.check('Admin exclui (com confirmação) e o histórico guarda a exclusão', one(`select count(*) from admin_tasks where id='${t2task}'`) === '0' && one(`select count(*) from change_log where table_name='admin_tasks' and row_id='${t2task}' and action='delete'`) === '1')

  // ── 390 px ──
  const am = await login(browser, 'admin@pend.local')
  await go(am, '/admin/pendencias?situacao=todas')
  await am.locator('[data-nova-pendencia] > summary').click()
  t.check('Quadro do Admin em 390 px sem rolagem lateral', await noScroll(am))
  const cm = await login(browser, 'coord@pend.local')
  await go(cm, '/coordenacao/pendencias')
  t.check('Quadro da coordenação em 390 px sem rolagem lateral', await noScroll(cm))

  // ── Banco sem a migração: o portal segue igual ──
  const version = one('select version from schema_info')
  sql("update schema_info set version='20261112120000_auditoria_producao'")
  try {
    await go(ad, '/admin/pendencias')
    t.check('Sem a migração: quadro mostra só o aviso', /Quadro ainda não disponível/.test(await ad.locator('main').innerText()) && (await ad.locator('[data-quadro]').count()) === 0)
    await go(ad, '/admin')
    t.check('Sem a migração: painel do Admin sem números nem atenção de pendências', (await ad.locator('[data-numero="pendencias"]').count()) === 0 && (await ad.locator('[data-atencao="pendencia-atrasada"]').count()) === 0)
    await go(co, '/coordenacao')
    t.check('Sem a migração: coordenação sem o link', (await co.locator('a[href="/coordenacao/pendencias"]').count()) === 0)
  } finally {
    sql(`update schema_info set version='${version}'`)
  }
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
