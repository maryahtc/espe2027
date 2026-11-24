// Bloco A — segurança e privacidade pela API (como um navegador mal-intencionado faria): contatos de professores e da
// Equipe operacional, localizadores, reservas, comprovantes, histórico, relacionamentos (embedding do PostgREST),
// funções do banco, escrita direta e isolamento entre turmas. Aluno e coordenação de outra turma não podem obter nada.
// Banco LOCAL.
import { cohortId, one, people, rest, sql, suite, token } from '../lib.mjs'

const t = suite('Segurança do Bloco A (API)')
const json = async (r) => {
  try {
    return await r.json()
  } catch {
    return null
  }
}
const empty = (x) => Array.isArray(x) && x.length === 0
const deny = (r, body) => r.status >= 400 || empty(body)

try {
  sql("delete from cohorts where slug = 'seg-t2'")
  const T = cohortId()
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Segurança 2','seg-t2','2026-01-01','2028-07-31') returning id")
  const u = await people('seg.local', { coord2: { role: 'coordenacao', cohort: T2, cohortRole: 'coordenacao' } })
  const m1 = one(`select id from modules where cohort_id='${T}' and number=1`)
  const victor = one("select id from faculty where display_name='Victor'")
  const ops = one("insert into ops_people (name, role_title) values ('Compras Seg', 'Compras') returning id")
  sql(`insert into ops_people_contacts (person_id, email, phone) values ('${ops}', 'compras@seg.local', '+55 11 90000-2222')`)
  sql(`insert into faculty_contacts (faculty_id, email, phone, city) values ('${victor}', 'victor@seg.local', '+55 41 90000-3333', 'Curitiba') on conflict (faculty_id) do update set email=excluded.email`)
  const lid = one(
    `insert into module_faculty_logistics (module_id, faculty_id, participation, travel, travel_locator, travel_receipt_url, lodging, lodging_locator, lodging_receipt_url, travel_responsible_ops_id) values ('${m1}','${victor}','confirmado','comprada','LOC999','https://exemplo.org/bilhete','reservada','RES777','https://exemplo.org/hotel','${ops}') returning id`,
  )
  const task = one(`insert into admin_tasks (title, cohort_id, category, responsible_ops_id) values ('Tarefa segura', '${T}', 'materiais', '${ops}') returning id`)
  const SECRET_RX = /LOC999|RES777|seg\.local|90000-2222|90000-3333|exemplo\.org/

  for (const [who, email] of [
    ['Aluno', 'aluno@seg.local'],
    ['Coordenação de outra turma', 'coord2@seg.local'],
  ]) {
    const tk = await token(email)
    const get = async (path) => {
      const r = await rest(tk, 'GET', path)
      return { r, body: await json(r) }
    }
    // Leitura direta
    for (const table of ['faculty_contacts', 'ops_people_contacts', 'module_faculty_logistics']) {
      const { r, body } = await get(`${table}?select=*`)
      t.check(`${who}: não lê ${table}`, deny(r, body), body)
    }
    const tasks = await get(`admin_tasks?id=eq.${task}&select=*`)
    t.check(`${who}: não lê a pendência da turma 1`, deny(tasks.r, tasks.body), tasks.body)
    // Relacionamentos (embedding)
    const e1 = await get(`faculty?id=eq.${victor}&select=id,faculty_contacts(*),module_faculty_logistics(*)`)
    t.check(`${who}: embedding a partir de "faculty" não traz contato nem logística`, !SECRET_RX.test(JSON.stringify(e1.body ?? '')), e1.body)
    const e2 = await get(`modules?id=eq.${m1}&select=id,module_faculty_logistics(*)`)
    t.check(`${who}: embedding a partir de "modules" não traz logística`, !SECRET_RX.test(JSON.stringify(e2.body ?? '')), e2.body)
    const e3 = await get(`admin_tasks?select=*,ops_people(*)`)
    t.check(`${who}: embedding pendência → equipe operacional não traz nada da turma 1`, !JSON.stringify(e3.body ?? '').includes('Tarefa segura'), e3.body)
    // Histórico
    const h = await get('change_log?table_name=in.(faculty_contacts,ops_people_contacts,module_faculty_logistics,admin_tasks,ops_people)&select=*')
    t.check(`${who}: histórico não expõe contatos, localizadores nem pendências`, !SECRET_RX.test(JSON.stringify(h.body ?? '')) && !JSON.stringify(h.body ?? '').includes('Tarefa segura'), h.body)
    // Funções do banco
    const f1 = await json(await rest(tk, 'POST', 'rpc/faculty_contact_readable', { p_faculty_id: victor }))
    const f2 = await json(await rest(tk, 'POST', 'rpc/module_logistics_readable', { p_module_id: m1 }))
    t.check(`${who}: funções de permissão respondem "não" (e só sim/não)`, f1 === false && f2 === false, { f1, f2 })
    // Escrita direta
    await rest(tk, 'PATCH', `module_faculty_logistics?id=eq.${lid}`, { travel_locator: 'HACK' })
    await rest(tk, 'POST', 'faculty_contacts', { faculty_id: victor, email: 'hack@x.y' })
    await rest(tk, 'PATCH', `ops_people_contacts?person_id=eq.${ops}`, { email: 'hack@x.y' })
    await rest(tk, 'DELETE', `admin_tasks?id=eq.${task}`)
    t.check(
      `${who}: nenhuma escrita direta passa (logística, contatos, exclusão de pendência)`,
      one(`select travel_locator from module_faculty_logistics where id='${lid}'`) === 'LOC999' &&
        one(`select email from faculty_contacts where faculty_id='${victor}'`) === 'victor@seg.local' &&
        one(`select email from ops_people_contacts where person_id='${ops}'`) === 'compras@seg.local' &&
        one(`select count(*) from admin_tasks where id='${task}'`) === '1',
    )
  }

  // Coordenação da própria turma: consulta logística e contato do professor, mas nunca contatos da Equipe operacional
  // nem o histórico de contatos.
  const tkCo = await token('coord@seg.local')
  const coLog = await json(await rest(tkCo, 'GET', `module_faculty_logistics?id=eq.${lid}&select=travel_locator`))
  t.check('Coordenação da turma consulta a logística da própria turma', Array.isArray(coLog) && coLog[0]?.travel_locator === 'LOC999')
  const coOps = await json(await rest(tkCo, 'GET', 'ops_people_contacts?select=*'))
  t.check('Coordenação da turma não lê contatos da Equipe operacional', empty(coOps), coOps)
  const coHist = await json(await rest(tkCo, 'GET', 'change_log?table_name=in.(faculty_contacts,ops_people_contacts,ops_people)&select=*'))
  t.check('Coordenação da turma não lê o histórico de contatos', empty(coHist), coHist)
  void u
} catch (e) {
  t.fail(e)
} finally {
  t.finish()
}
