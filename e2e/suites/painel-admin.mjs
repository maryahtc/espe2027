// Etapa 10 · Parte 3 — painel inicial do Admin (números reais, "Precisa da sua atenção" pelas regras aprovadas,
// pendências × lembretes editoriais) e "Quem vê o quê" do Perfil (sem controles fictícios). Banco LOCAL.
import { cohortId, fingerprint, go, launch, login, noScroll, one, people, rest, sql, suite, today, token } from '../lib.mjs'

const t = suite('Painel do Admin e Privacidade')
let browser
const items = (p) => p.locator('[data-atencao]').evaluateAll((els) => els.map((e) => ({ kind: e.getAttribute('data-atencao'), tone: e.getAttribute('data-tom'), text: e.textContent.trim() })))
const num = async (p, k) => (await p.locator(`[data-numero="${k}"] [data-valor]`).innerText()).trim()
const shift = (number, days) =>
  sql(`update module_days d set date = d.date + ((date '${today()}' + ${days}) - x.first) from (select m.id, min(md.date) first from modules m join module_days md on md.module_id=m.id where m.cohort_id='${cohortId()}' and m.number=${number} group by m.id) x where d.module_id = x.id`)
const moduleId = (number) => one(`select id from modules where cohort_id='${cohortId()}' and number=${number}`)

try {
  const u = await people('painel.local')
  browser = await launch()
  const ad = await login(browser, 'admin@painel.local', { phone: false })

  // ── Linha de base: seed sem pendências ──
  t.check('Painel do Admin abre (200), sem aviso de protótipo nem números fictícios', (await go(ad, '/admin')) === 200 && (await ad.locator('[data-painel-admin]').count()) === 1 && !/protótipo|fictíci/i.test(await ad.locator('main').innerText()))
  const base = await items(ad)
  // O seed (cronograma inteiro publicado) tem módulos futuros ainda sem professor: um único item agregado.
  t.check(
    'Linha de base: só o item agregado de módulos sem professor (sem uma linha por módulo)',
    base.length === 1 && base[0].kind === 'modulo-sem-professor' && /\d+ módulos publicados sem professor definido/.test(base[0].text) && /o mais próximo/.test(base[0].text),
    base,
  )
  const agg = ad.locator('[data-atencao="modulo-sem-professor"]')
  t.check('Item agregado leva a Módulos e cronograma, com a ação explícita', (await agg.getAttribute('href')) === '/admin/modulos' && /Definir professores em Módulos e cronograma/.test(await agg.locator('[data-atencao-acao]').innerText()))
  t.check('O link do item abre Módulos e cronograma (200)', (await go(ad, '/admin/modulos')) === 200)
  await go(ad, '/admin')

  // ── Números reais = banco ──
  const T = cohortId()
  const expected = {
    alunos: one("select count(*) from enrollments e join cohorts c on c.id=e.cohort_id where e.role_in_cohort='aluno' and e.status='ativa' and c.status='ativa'"),
    procedimentos: one('select count(*) from procedures where active'),
    conteudos: one("select count(*) from contents where status='publicado'"),
    avisos: one(`select count(*) from announcements where status='publicado' and visible_from <= '${today()}' and visible_until >= '${today()}'`),
  }
  const shown = {}
  for (const k of Object.keys(expected)) shown[k] = await num(ad, k)
  t.check('Números do painel = banco (alunos ativos, procedimentos, conteúdos, avisos)', JSON.stringify(shown) === JSON.stringify(expected), { shown, expected })
  t.check('Atalhos mostram a situação real de cada cadastro', /2 alunos ativos/.test(await ad.locator('[data-atalho="alunos"] [data-situacao]').innerText()) && /30 publicados/.test(await ad.locator('[data-atalho="modulos"] [data-situacao]').innerText()))

  // ── Montar cada situação das regras aprovadas ──
  // Convite pendente há 3 dias
  sql("delete from auth.users where email='convidado@painel.local'")
  sql("insert into auth.users (id, email, invited_at) values (gen_random_uuid(), 'convidado@painel.local', now() - interval '3 days')")
  // Módulo 1 começa em 10 dias, sem nenhuma preparação; Módulo 2 em 20 dias com preparação obrigatória em rascunho;
  // Módulo 3 fica fora da janela de 30 dias (sem preparação, não deve aparecer).
  shift(1, 10)
  shift(2, 20)
  sql(`insert into module_resources (module_id, kind, title, url, requirement, status) values ('${moduleId(2)}','link','Leitura prévia E2E','https://exemplo.org','obrigatorio','rascunho')`)
  // Módulo 4 sem nenhum professor (sem equipe docente nem professor nas atividades)
  sql(`delete from session_faculty where session_id in (select id from module_sessions where module_id='${moduleId(4)}')`)
  sql(`delete from module_staff where module_id='${moduleId(4)}' and role in ('principal','docente')`)
  // Conteúdo publicado sem tema (e outro com tema, que não conta)
  const cat = one('select id from categories order by name limit 1')
  sql(`insert into contents (kind,title,slug,category_id,url,status) values ('link','Sem tema E2E','sem-tema-e2e','${cat}','https://exemplo.org','publicado')`)
  const withTopic = one(`insert into contents (kind,title,slug,category_id,url,status) values ('link','Com tema E2E','com-tema-e2e','${cat}','https://exemplo.org','publicado') returning id`)
  sql(`insert into content_topics (content_id, topic_id) values ('${withTopic}', (select id from topics where archived_at is null limit 1))`)
  // Workflow em rascunho
  sql("insert into workflows (procedure_id) values ((select id from procedures where active order by position limit 1))")

  const FP = fingerprint()
  await go(ad, '/admin')
  const it = await items(ad)
  const find = (k) => it.filter((x) => x.kind === k)
  t.check('Abrir o painel não grava nada', fingerprint() === FP)
  t.check('Convite pendente: pendência, com a idade do mais antigo', find('convite').length === 1 && find('convite')[0].tone === 'pendencia' && /1 convite ainda não aceito/.test(find('convite')[0].text) && /há 3 dias/.test(find('convite')[0].text), find('convite'))
  t.check('Módulo em 10 dias sem nenhuma preparação: lembrete editorial', find('sem-preparacao').length === 1 && find('sem-preparacao')[0].tone === 'editorial' && /Módulo 1/.test(find('sem-preparacao')[0].text) && /começa em 10 dias/.test(find('sem-preparacao')[0].text), find('sem-preparacao'))
  t.check('Módulo em 20 dias com preparação obrigatória em rascunho: pendência', find('preparacao-rascunho').length === 1 && find('preparacao-rascunho')[0].tone === 'pendencia' && /Módulo 2/.test(find('preparacao-rascunho')[0].text), find('preparacao-rascunho'))
  t.check('Módulo fora da janela de 30 dias não aparece', !it.some((x) => /Módulo 3 /.test(x.text)))
  const noTeacherBase = Number(/(\d+) módulos/.exec(base[0]?.text ?? '')?.[1] ?? 0)
  t.check('Módulo publicado sem professor: pendência agregada (+1 com o Módulo 4)', find('modulo-sem-professor').length === 1 && find('modulo-sem-professor')[0].tone === 'pendencia' && new RegExp(`${noTeacherBase + 1} módulos publicados sem professor`).test(find('modulo-sem-professor')[0].text), find('modulo-sem-professor'))
  t.check('Conteúdo publicado sem tema: pendência (só o sem tema conta)', find('conteudo-sem-tema').length === 1 && /1 conteúdo publicado sem tema/.test(find('conteudo-sem-tema')[0].text))
  t.check('Workflow em rascunho: lembrete editorial (não erro)', find('workflow-rascunho').length === 1 && find('workflow-rascunho')[0].tone === 'editorial')
  // Módulos 1 e 2 entram na janela de 45 dias: professores a confirmar e logística pendente também são pendências (B1).
  t.check('Professores a confirmar e logística pendente aparecem (módulos dentro de 45 dias)', find('professores-a-confirmar').length === 1 && find('logistica-pendente').length === 1)
  t.check(
    'Pendências e lembretes editoriais em grupos separados',
    (await ad.locator('[data-atencao-grupo="pendencia"] [data-tom="editorial"]').count()) === 0 && (await ad.locator('[data-atencao-grupo="editorial"] [data-tom="pendencia"]').count()) === 0 && (await ad.locator('[data-atencao-grupo="pendencia"] [data-atencao]').count()) === 6 && (await ad.locator('[data-atencao-grupo="editorial"] [data-atencao]').count()) === 2,
  )
  t.check('Cada item leva à tela certa', (await ad.locator('[data-atencao="convite"]').getAttribute('href')) === '/admin/alunos' && (await ad.locator('[data-atencao="workflow-rascunho"]').getAttribute('href')) === '/admin/workflows?status=rascunho' && (await ad.locator('[data-atencao="sem-preparacao"]').getAttribute('href')) === `/admin/modulos/${moduleId(1)}`)
  t.check('Números acompanham o banco (conteúdos publicados: 2, convites: 1)', (await num(ad, 'conteudos')) === '2' && (await num(ad, 'convites')) === '1')
  const nextText = await ad.locator('[data-proximo-modulo]').innerText()
  t.check('Próximo módulo: o publicado mais próximo (Módulo 1, em 10 dias)', /Módulo 0?1 ·/.test(nextText) && /em 10 dias/.test(nextText), nextText)
  t.check('Sem métricas de desempenho clínico no painel', !/ranking|desempenho|pouca exposição|lacuna/i.test(await ad.locator('main').innerText()))

  // Resolver: preparação publicada some da lista; módulo ainda sem nenhuma preparação continua editorial
  sql(`update module_resources set status='publicado' where module_id='${moduleId(2)}'`)
  await go(ad, '/admin')
  t.check('Preparação obrigatória publicada: a pendência some', (await ad.locator('[data-atencao="preparacao-rascunho"]').count()) === 0 && (await ad.locator('[data-atencao="sem-preparacao"]').count()) === 1)

  // Resolver tudo: a lista fica vazia ("Nada pendente agora")
  sql("delete from auth.users where email='convidado@painel.local'")
  sql(`insert into module_resources (module_id, kind, title, url, requirement, status) values ('${moduleId(1)}','link','Leitura M1 E2E','https://exemplo.org','recomendado','publicado')`)
  sql("insert into content_topics (content_id, topic_id) select id, (select id from topics where archived_at is null limit 1) from contents where slug='sem-tema-e2e'")
  sql("update workflows set status='arquivado', archived_at=now() where status='rascunho'")
  sql(
    `insert into module_staff (module_id, faculty_id, role) select m.id, (select f.id from faculty f where not exists (select 1 from module_staff s2 where s2.module_id=m.id and s2.faculty_id=f.id) order by f.id limit 1), 'principal' from modules m where m.cohort_id='${T}' and not exists (select 1 from module_staff s where s.module_id=m.id and s.role in ('principal','docente'))`,
  )
  // Logística resolvida para os professores dos módulos 1 e 2 (confirmados; passagem e hospedagem não precisam)
  sql(
    `insert into module_faculty_logistics (module_id, faculty_id, participation, travel, lodging) select distinct x.module_id, x.fid, 'confirmado'::participation_status, 'nao_precisa'::travel_status, 'nao_precisa'::lodging_status from (select module_id, faculty_id fid from module_staff union select module_id, faculty_id from session_faculty) x join modules m on m.id=x.module_id where m.cohort_id='${T}' and m.number in (1,2) on conflict (module_id, faculty_id) do update set participation='confirmado', travel='nao_precisa', lodging='nao_precisa'`,
  )
  await go(ad, '/admin')
  t.check('Tudo resolvido: "Nada pendente agora"', (await ad.locator('[data-atencao]').count()) === 0 && (await ad.locator('[data-atencao-vazia]').count()) === 1, await items(ad))

  // ── Acesso ──
  const co = await login(browser, 'coord@painel.local', { phone: false })
  const al = await login(browser, 'aluno@painel.local')
  t.check('Coordenação e aluno não abrem o painel do Admin (404)', (await go(co, '/admin')) === 404 && (await go(al, '/admin')) === 404)

  // ── 390 px ──
  const am = await login(browser, 'admin@painel.local')
  await go(am, '/admin')
  t.check('Painel do Admin em 390 px sem rolagem lateral', await noScroll(am))

  // ── Perfil: Quem vê o quê ──
  await go(al, '/perfil')
  t.check('Perfil sem o "Trocar foto" (ainda sem função)', !/Trocar foto/.test(await al.locator('main').innerText()))
  t.check('Perfil sem os controles fictícios de privacidade', (await al.locator('input[name="privacidade"]').count()) === 0 && !/Quero participar da visualização da turma|Minha produção é privada/.test(await al.locator('main').innerText()))
  t.check('"Quem vê o quê" com as 5 informações', (await al.locator('[data-quem-ve]').count()) === 5)
  t.check('Colegas não veem nenhuma delas', (await al.locator('[data-pessoa="colegas"][data-ve="sim"]').count()) === 0)
  t.check('Casos: coordenação e Admin veem, com abertura registrada', (await al.locator('[data-quem-ve="casos"] [data-pessoa="coordenacao"][data-ve="sim"]').count()) === 1 && /registrada/.test(await al.locator('[data-quem-ve="casos"] [data-pessoa="admin"]').innerText()))
  t.check('Lista de materiais e "Entendi": só o aluno', (await al.locator('[data-quem-ve="pessoal"] [data-ve="sim"]').count()) === 1 && (await al.locator('[data-quem-ve="pessoal"] [data-pessoa="voce"][data-ve="sim"]').count()) === 1)
  t.check('Notas: auditoria, acesso excepcional, caso excluído, checklist', (await al.locator('[data-privacidade-notas] [data-nota]').count()) === 4)
  t.check('Link "Quem vê o quê" no rodapé leva à seção', (await al.locator('a[href="#privacidade"]').count()) === 1)
  t.check('Perfil em 390 px sem rolagem lateral', await noScroll(al))

  // Amostra pela API (sessão do colega, como o navegador faria): o que o Perfil afirma é o que o banco faz.
  const tk = await token('colega@painel.local')
  const prof = await (await rest(tk, 'GET', `profiles?id=eq.${u.aluno}&select=id`)).json()
  const prog = await (await rest(tk, 'GET', `content_progress?user_id=eq.${u.aluno}&select=user_id`)).json()
  t.check('API confirma: colega não lê o perfil nem o progresso do aluno', Array.isArray(prof) && prof.length === 0 && Array.isArray(prog) && prog.length === 0)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
