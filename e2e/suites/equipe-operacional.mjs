// Bloco A — Equipe operacional: cadastro independente de docentes, responsável de pendências, coordenação vê só o
// nome, contatos só para o Admin, fora das telas acadêmicas e do site público. Banco LOCAL.
import { cohortId, go, launch, login, noScroll, one, people, rest, sql, suite, token } from '../lib.mjs'

const t = suite('Equipe operacional')
let browser
const settleAfter = async (p) => {
  await p.waitForTimeout(1200)
  await p.waitForLoadState('networkidle')
}

try {
  const T = cohortId()
  await people('ops.local')
  const m1 = one(`select id from modules where cohort_id='${T}' and number=1`)
  const facultyBefore = one("select count(*)||'|'||md5(coalesce(string_agg(f::text,'' order by f.id),'')) from faculty f")
  browser = await launch()
  const ad = await login(browser, 'admin@ops.local', { phone: false })

  // ── Cadastro ──
  t.check('Admin abre "Equipe operacional" (200) e o menu tem o item', (await go(ad, '/admin/equipe-operacional')) === 200 && (await ad.locator('a[href="/admin/equipe-operacional"]').count()) >= 1)
  await ad.locator('[data-nova-pessoa] > summary').click()
  const f = ad.locator('[data-nova-pessoa] form')
  await f.locator('input[name=nome]').fill('Marlon Operacional')
  await f.locator('input[name=funcao]').fill('Compras')
  await f.locator('input[name=email]').fill('marlon@ops.local')
  await f.locator('input[name=telefone]').fill('+55 11 98888-0000')
  await f.locator('button[type=submit]').click()
  await settleAfter(ad)
  const pid = one("select id from ops_people where name='Marlon Operacional'")
  t.check('Pessoa e contato gravados', /^[0-9a-f-]{36}$/.test(pid) && one(`select email||'|'||phone from ops_people_contacts where person_id='${pid}'`) === 'marlon@ops.local|+55 11 98888-0000')
  t.check('Cadastro de docentes intocado', one("select count(*)||'|'||md5(coalesce(string_agg(f::text,'' order by f.id),'')) from faculty f") === facultyBefore)
  await go(ad, '/admin/equipe-operacional')
  t.check('Lista mostra nome, função e contato para o Admin', /Marlon Operacional/.test(await ad.locator(`[data-pessoa-operacional="${pid}"]`).innerText()) && /marlon@ops\.local/.test(await ad.locator(`[data-pessoa-operacional="${pid}"]`).innerText()))

  // ── Responsável de pendência ──
  await go(ad, `/admin/pendencias?modulo=${m1}&novo=1`)
  const nf = ad.locator('[data-nova-pendencia] form')
  const opsOpts = await nf.locator('[data-responsavel-select] optgroup[data-grupo-responsavel="operacional"] option').allInnerTexts()
  t.check('Escolha de responsável tem o grupo "Equipe operacional"', opsOpts.includes('Marlon Operacional (Compras)'), opsOpts)
  await nf.locator('input[name=demanda]').fill('Comprar kits de isolamento')
  await nf.locator('select[name=categoria]').selectOption('materiais')
  await nf.locator('[data-responsavel-select]').selectOption(`o:${pid}`)
  await nf.locator('button[type=submit]').click()
  await settleAfter(ad)
  const task = one("select id||'|'||coalesce(responsible_ops_id::text,'')||'|'||coalesce(responsible_id::text,'') from admin_tasks where title='Comprar kits de isolamento'").split('|')
  t.check('Pendência gravada com responsável operacional (e sem responsável acadêmico)', task[1] === pid && task[2] === '')
  await go(ad, '/admin/pendencias')
  t.check('Quadro mostra o responsável operacional', /Marlon Operacional \(Compras\)/.test(await ad.locator(`[data-pendencia="${task[0]}"] [data-responsavel]`).innerText()))

  // ── Fora das telas acadêmicas e do site público ──
  await go(ad, `/admin/modulos/${m1}`)
  const moduleHtml = await ad.locator('main').innerHTML()
  t.check('Não aparece nas listas do editor do módulo (professor, equipe)', !/Marlon Operacional/.test(moduleHtml.replace(/data-pendencias-modulo[\s\S]*$/, '')))
  await go(ad, '/admin/equipe')
  t.check('Não aparece em "Docentes e coordenação"', !/Marlon Operacional/.test(await ad.locator('main').innerText()))
  t.check('Não aparece nas visões do site público', one("select count(*) from public_teachers where display_name like 'Marlon%'") === '0')

  // ── Coordenação: nome sim, contato não ──
  const co = await login(browser, 'coord@ops.local', { phone: false })
  await go(co, '/coordenacao/pendencias')
  t.check('Coordenação vê o nome do responsável operacional na pendência', /Marlon Operacional/.test(await co.locator(`[data-pendencia="${task[0]}"]`).innerText()))
  t.check('Coordenação não vê o contato no quadro', !/marlon@ops\.local|98888/.test(await co.locator('main').innerText()))
  t.check('Coordenação não abre o cadastro (404)', (await go(co, '/admin/equipe-operacional')) === 404)
  const tkCo = await token('coord@ops.local')
  const names = await (await rest(tkCo, 'GET', 'ops_people?select=name')).json()
  const contacts = await (await rest(tkCo, 'GET', 'ops_people_contacts?select=email')).json()
  t.check('API: coordenação lê nomes, mas nenhum contato', Array.isArray(names) && names.some((x) => x.name === 'Marlon Operacional') && Array.isArray(contacts) && contacts.length === 0)
  const patch = await rest(tkCo, 'PATCH', `ops_people?id=eq.${pid}`, { name: 'Invasão' })
  t.check('API: coordenação não edita o cadastro', one(`select name from ops_people where id='${pid}'`) === 'Marlon Operacional', patch.status)

  // ── Aluno ──
  const al = await login(browser, 'aluno@ops.local')
  t.check('Aluno não abre o cadastro (404)', (await go(al, '/admin/equipe-operacional')) === 404)
  const tkAl = await token('aluno@ops.local')
  t.check('API: aluno não lê a equipe operacional', (await (await rest(tkAl, 'GET', 'ops_people?select=id')).json()).length === 0)

  // ── Desativar: sai da escolha de novas pendências, continua nas existentes ──
  await go(ad, '/admin/equipe-operacional')
  await ad.locator(`[data-pessoa-operacional="${pid}"] [data-editar-pessoa] > summary`).click()
  await ad.locator(`[data-pessoa-operacional="${pid}"] input[name=ativo]`).uncheck()
  await ad.locator(`[data-pessoa-operacional="${pid}"] [data-editar-pessoa] button[type=submit]`).click()
  await settleAfter(ad)
  t.check('Desativar grava (sem excluir)', one(`select active from ops_people where id='${pid}'`) === 'f')
  await go(ad, '/admin/pendencias')
  await ad.locator('[data-nova-pendencia] > summary').click()
  t.check('Pessoa inativa sai da escolha de responsável de novas pendências', !(await ad.locator('[data-nova-pendencia] [data-responsavel-select]').innerText()).includes('Marlon'))
  t.check('…e continua aparecendo na pendência existente', /Marlon Operacional/.test(await ad.locator(`[data-pendencia="${task[0]}"] [data-responsavel]`).innerText()))

  const am = await login(browser, 'admin@ops.local')
  await go(am, '/admin/equipe-operacional')
  t.check('Equipe operacional em 390 px sem rolagem lateral', await noScroll(am))
  sql('select 1')
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
