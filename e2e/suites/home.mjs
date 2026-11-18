// Início do aluno (Etapas 3–5): boas-vindas antes do curso, avisos (comum com "Entendi", importante sem dispensa,
// rascunho/outra turma/fora do período invisíveis), navegação e 390 px. Banco LOCAL.
import { go, launch, login, noScroll, one, people, sql, suite, today } from '../lib.mjs'

const t = suite('Início')
let browser
try {
  const u = await people('home.local')
  sql("delete from cohorts where slug = 'home-t2'")
  const T = one("select id from cohorts where slug='turma-2027'")
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Outra turma','home-t2','2026-01-01','2028-07-31') returning id")
  const d = today()
  const ann = (title, cohort, status, important = false, from = d, until = d) =>
    one(`insert into announcements (cohort_id, title, body, important, visible_from, visible_until, status, published_at) values (${cohort ? `'${cohort}'` : 'null'},'${title}','Texto de ${title}',${important},'${from}','${until}','${status}', ${status === 'publicado' ? 'now()' : 'null'}) returning id`)
  const comum = ann('Aviso comum E2E', T, 'publicado')
  ann('Aviso importante E2E', T, 'publicado', true)
  ann('Aviso para todas E2E', null, 'publicado')
  ann('Rascunho E2E', T, 'rascunho')
  ann('Outra turma E2E', T2, 'publicado')
  ann('Vencido E2E', T, 'publicado', false, '2026-01-01', '2026-01-31')

  browser = await launch()
  const al = await login(browser, 'aluno@home.local')
  t.check('Início abre para o aluno (200)', (await go(al, '/')) === 200)
  const body = await al.locator('main').innerText()
  const cohortStart = one(`select starts_on from cohorts where id='${T}'`)
  if (d < cohortStart) t.check('Antes do início da turma: boas-vindas com a contagem de dias', /Boas-vindas/.test(body) && /faltam/.test(body))
  else t.check('Turma em andamento: Início com "O que fazer agora"', /O que fazer agora/.test(body))
  t.check('Avisos visíveis: comum, importante e "para todas"', ['Aviso comum E2E', 'Aviso importante E2E', 'Aviso para todas E2E'].every((x) => body.includes(x)))
  t.check('Avisos invisíveis: rascunho, outra turma e fora do período', !['Rascunho E2E', 'Outra turma E2E', 'Vencido E2E'].some((x) => body.includes(x)))
  t.check('Aviso importante não tem "Entendi"', (await al.locator('[data-aviso="importante"] button:has-text("Entendi")').count()) === 0)
  await al.locator('[data-aviso="comum"]', { hasText: 'Aviso comum E2E' }).locator('button:has-text("Entendi")').click()
  await al.waitForTimeout(1200)
  await go(al, '/')
  t.check('"Entendi" esconde o aviso comum e fica gravado só para o aluno', !(await al.locator('main').innerText()).includes('Aviso comum E2E') && one(`select count(*) from announcement_dismissals where announcement_id='${comum}' and user_id='${u.aluno}'`) === '1')
  t.check('Início em 390 px sem rolagem lateral', await noScroll(al))
  t.check('Barra inferior com as áreas do aluno', (await al.locator('nav.fixed[aria-label="Principal"] > ul > li').count()) >= 4)

  const col = await login(browser, 'colega@home.local')
  await go(col, '/')
  t.check('"Entendi" de um aluno não esconde o aviso do colega', (await col.locator('main').innerText()).includes('Aviso comum E2E'))
  t.check('Cronograma e Biblioteca abrem', (await go(col, '/cronograma')) === 200 && (await go(col, '/biblioteca')) === 200)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
