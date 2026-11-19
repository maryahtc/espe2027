// Etapa 10 · Parte 2 — Visão da turma (Coordenação), Produção da turma (Admin) e produção individual auditada.
// Agregados = soma dos alunos; filtros; seleção e isolamento de turmas; ordenação da tabela; abertura individual
// auditada (e indisponível sem a auditoria); recusas; estados vazios; 390 px. Banco LOCAL.
import { cohortId, fingerprint, go, launch, login, newCase, newRecord, noScroll, one, people, sql, stepId, suite } from '../lib.mjs'

const t = suite('Visão da turma')
let browser
const KEYS = ['casos', 'consultas', 'experiencias', 'concluidos']
const cards = async (p) => {
  const out = []
  for (const k of KEYS) out.push((await p.locator(`[data-indicador="${k}"] [data-valor]`).innerText()).trim())
  return out.join(',')
}
/** Linhas da tabela (na ordem exibida): id, nome e as colunas numéricas. */
const tableRows = (p) =>
  p.locator('[data-tabela-alunos] tbody tr').evaluateAll((trs) =>
    trs.map((tr) => {
      const v = (k) => Number(tr.querySelector(`[data-col="${k}"] .num`)?.textContent ?? 'NaN')
      return {
        id: tr.getAttribute('data-aluno'),
        name: tr.querySelector('[data-col="nome"]').textContent.trim(),
        casos: v('casos'),
        consultas: v('consultas'),
        experiencias: v('experiencias'),
        concluidos: v('concluidos'),
        ultimo: tr.querySelector('[data-col="ultimo"]').getAttribute('data-data'),
      }
    }),
  )
const sumRows = (rows) => KEYS.map((k) => rows.reduce((s, r) => s + r[k], 0)).join(',')
const rowOf = (rows, id) => {
  const r = rows.find((x) => x.id === id)
  return r ? KEYS.map((k) => r[k]).join(',') : null
}
const cov = async (p, k) => (await p.locator(`[data-cobertura-item="${k}"] [data-valor]`).innerText()).trim()
const audits = (actor, student) => Number(one(`select count(*) from audit_log where action='aluno.producao.abrir' and actor='${actor}'${student ? ` and entity_id='${student}'` : ''}`))

try {
  sql("delete from cohorts where slug in ('visao-t2','visao-t3')")
  const T = cohortId()
  const T2 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Visão 2','visao-t2','2026-01-01','2028-07-31') returning id")
  const T3 = one("insert into cohorts (name, slug, starts_on, ends_on) values ('Turma Visão 3','visao-t3','2026-01-01','2028-07-31') returning id")
  const u = await people('visao.local', {
    inativo: { role: 'aluno', cohort: T, cohortRole: 'aluno', status: 'inativa' },
    semreg: { role: 'aluno', cohort: T, cohortRole: 'aluno' },
    coord2: { role: 'coordenacao', cohort: T2, cohortRole: 'coordenacao' },
    aluno2: { role: 'aluno', cohort: T2, cohortRole: 'aluno' },
  })

  // Mesmos dados da suíte Minha Produção (aluno: 2 casos · 4 consultas · 6 experiências · 3 concluídos)
  const A = newCase(u.aluno, 'P.D.A.')
  newRecord(A, stepId('restauracao-em-resina-anterior'), '2026-10-01', [11])
  newRecord(A, stepId('restauracao-em-resina-anterior'), '2026-10-01', [11])
  newRecord(A, stepId('laminado-ceramico', 'preparo'), '2026-10-02', [11, 21])
  newRecord(A, stepId('laminado-ceramico', 'cimentacao'), '2026-10-09', [11, 21])
  const B = newCase(u.aluno, 'P.D.B.')
  newRecord(B, stepId('mock-up'), '2026-10-02')
  const removed = newRecord(B, stepId('restauracao-em-resina-anterior'), '2026-10-03', [22])
  sql(`update performed_procedures set removed_at = now() where id='${removed}'`)
  const C = newCase(u.aluno, 'P.D.C.')
  newRecord(C, stepId('mock-up'), '2026-10-04')
  sql(`update clinical_cases set removed_at = now() where id='${C}'`)
  newRecord(newCase(u.colega, 'P.D.X.'), stepId('mock-up'), '2026-10-05')
  newRecord(newCase(u.inativo, 'P.D.I.'), stepId('mock-up'), '2026-10-06')
  newRecord(newCase(u.aluno2, 'P.D.Y.', T2), stepId('mock-up'), '2026-10-07')
  // Dificuldade marcada no caso A (tema real do catálogo)
  const topic = one("select id||'|'||name from topics where archived_at is null order by name limit 1").split('|')
  sql(`insert into case_difficulty_topics (case_id, topic_id) values ('${A}','${topic[0]}')`)

  browser = await launch()

  // ── Coordenação: painel da própria turma ──
  const co = await login(browser, 'coord@visao.local', { phone: false })
  const FP0 = fingerprint()
  t.check('Coordenação abre a Visão da turma (200) na própria turma', (await go(co, '/coordenacao')) === 200 && (await co.locator(`[data-visao-turma="${T}"]`).count()) === 1)
  t.check('Painel não grava nada no banco', fingerprint() === FP0)
  t.check('Aviso: ausência de registro não significa ausência de atividade clínica', /não significa ausência de atividade\s+clínica/.test(await co.locator('[data-aviso-registro]').innerText()))
  t.check('Coordenação de uma turma só não vê seletor de turmas', (await co.locator('[data-turmas]').count()) === 0)

  let rows = await tableRows(co)
  const all = await cards(co)
  t.check('Indicadores da turma = soma dos alunos da tabela', all === sumRows(rows), `${all} × ${sumRows(rows)}`)
  t.check('Turma no curso: 4 casos · 6 consultas · 8 experiências · 3 concluídos', all === '4,6,8,3', all)
  t.check('Linha do aluno segue as regras da Etapa 7 (2 · 4 · 6 · 3)', rowOf(rows, u.aluno) === '2,4,6,3', rowOf(rows, u.aluno))
  const enrolled = one(`select count(*) from enrollments where cohort_id='${T}' and role_in_cohort='aluno'`)
  t.check('Cobertura: matriculados = alunos da turma (ativos e inativos)', (await cov(co, 'matriculados')) === enrolled && rows.length === Number(enrolled), `${await cov(co, 'matriculados')} × ${enrolled}`)
  t.check(
    'Cobertura: com registro + sem registro = matriculados (3 + 1)',
    (await cov(co, 'com-registro')) === '3' && (await cov(co, 'sem-registro')) === '1' && rows.filter((r) => r.casos > 0).length === 3,
  )
  t.check('Matrícula inativa aparece na tabela', /Inativa/.test(await co.locator(`[data-aluno="${u.inativo}"] [data-col="situacao"]`).innerText()))
  t.check('Último registro considera o curso inteiro', rows.find((r) => r.id === u.aluno)?.ultimo === '2026-10-09' && rows.find((r) => r.id === u.semreg)?.ultimo === '')

  // Panorama
  const proc = (name) => co.locator(`[data-panorama-procedimento="${name}"]`)
  const resina = one("select name from procedures where slug='restauracao-em-resina-anterior'")
  const mock = one("select name from procedures where slug='mock-up'")
  t.check('Panorama: resina com 1 aluno, mock-up com 3 alunos', (await proc(resina).getAttribute('data-alunos')) === '1' && (await proc(mock).getAttribute('data-alunos')) === '3')
  const pano = await co.locator('[data-panorama-procedimento]').evaluateAll((els) => els.reduce((s, e) => s + Number(e.getAttribute('data-experiencias')), 0))
  t.check('Panorama soma as mesmas experiências dos indicadores', String(pano) === all.split(',')[2], `${pano}`)
  const noRec = co.locator('[data-sem-registros]')
  t.check('"Sem registros neste período" existe e começa recolhido', (await noRec.count()) === 1 && (await noRec.evaluate((d) => d.open)) === false)
  t.check('Procedimento registrado não aparece em "Sem registros"', (await co.locator(`[data-sem-registro="${mock}"]`).count()) === 0)
  t.check('Sem linguagem de lacuna ou desempenho', !/lacuna|pouca exposição|desempenho|ranking/i.test((await co.locator('main').innerText()).replace(/Sem ranking nem metas/, '')))

  // Dificuldades
  t.check('Dificuldades por tema: 1 caso · 1 aluno', /1 caso · 1 aluno/.test(await co.locator(`[data-dificuldade="${topic[1]}"]`).innerText()))

  // ── Filtros ──
  await go(co, `/coordenacao?turma=${T}&filtro=periodo&de=2026-10-05&ate=2026-10-31`)
  rows = await tableRows(co)
  const per = await cards(co)
  t.check('Filtro por período (05–31/10): turma 3 · 3 · 4 · 2 = soma dos alunos', per === '3,3,4,2' && per === sumRows(rows), per)
  t.check('Filtro por período: linha do aluno 1 · 1 · 2 · 2 (igual à Minha Produção)', rowOf(rows, u.aluno) === '1,1,2,2', rowOf(rows, u.aluno))
  t.check('Filtro preserva a turma nos links de ordenação', (await co.locator('[data-coluna="casos"]').getAttribute('href')).includes(`turma=${T}`) && (await co.locator('[data-coluna="casos"]').getAttribute('href')).includes('de=2026-10-05'))
  t.check('Dificuldade do caso A continua no período (ele tem registro em 09/10)', (await co.locator(`[data-dificuldade="${topic[1]}"]`).count()) === 1)
  await go(co, `/coordenacao?turma=${T}&filtro=periodo&de=2026-10-03&ate=2026-10-08`)
  t.check('Período sem registro do caso A: a dificuldade dele não entra', (await co.locator('[data-dificuldades-vazio]').count()) === 1 && (await cards(co)) === sumRows(await tableRows(co)))

  await go(co, `/coordenacao?turma=${T}&filtro=periodo&de=2026-09-01&ate=2026-09-30`)
  t.check(
    'Período sem registros: indicadores zerados, cobertura 0 com registro, panorama vazio',
    (await cards(co)) === '0,0,0,0' && (await cov(co, 'com-registro')) === '0' && (await co.locator('[data-panorama-vazio]').count()) === 1,
  )
  t.check('Período sem registros: todos os procedimentos ficam em "Sem registros neste período"', (await co.locator(`[data-sem-registro="${mock}"]`).count()) === 1)
  t.check('Último registro continua visível fora do período', (await tableRows(co)).find((r) => r.id === u.aluno)?.ultimo === '2026-10-09')

  // ── Ordenação ──
  await go(co, '/coordenacao')
  rows = await tableRows(co)
  const names = rows.map((r) => r.name)
  t.check('Tabela começa em ordem alfabética', JSON.stringify(names) === JSON.stringify([...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))), names)
  await co.locator('[data-coluna="experiencias"]').click()
  await co.waitForURL(/ordem=experiencias/)
  await co.waitForLoadState('networkidle')
  let ex = (await tableRows(co)).map((r) => r.experiencias)
  t.check('Ordenar por experiências (crescente)', ex.every((v, i) => i === 0 || ex[i - 1] <= v) && co.url().includes('dir=asc'), ex)
  await co.locator('[data-coluna="experiencias"]').click()
  await co.waitForURL(/dir=desc/)
  await co.waitForLoadState('networkidle')
  ex = (await tableRows(co)).map((r) => r.experiencias)
  t.check('Clicar de novo inverte (decrescente)', ex.every((v, i) => i === 0 || ex[i - 1] >= v), ex)
  t.check('Coluna ordenada marcada para leitores de tela', (await co.locator('th[aria-sort="descending"] [data-coluna="experiencias"]').count()) === 1)
  await go(co, '/coordenacao?ordem=ultimo&dir=desc')
  const last = (await tableRows(co)).map((r) => r.ultimo)
  t.check('Ordenar por último registro', last[0] === '2026-10-09' && last.at(-1) === '', last)
  await go(co, '/coordenacao?ordem=situacao&dir=desc')
  t.check('Ordenar por matrícula (inativa primeiro no decrescente)', (await tableRows(co))[0].id === u.inativo)

  // ── Produção individual auditada ──
  await go(co, '/coordenacao')
  const n0 = audits(u.coord, u.aluno)
  const FP1 = fingerprint(['audit_log'])
  await co.locator(`[data-aluno="${u.aluno}"] [data-abrir-aluno]`).click()
  await co.waitForURL(/\/coordenacao\/alunos\//)
  await co.waitForLoadState('networkidle')
  t.check('Nome do aluno abre a produção individual (com a turma no endereço)', co.url().includes(`/coordenacao/alunos/${u.aluno}?turma=${T}`))
  t.check('Abertura gravou auditoria: quem, qual aluno, turma', audits(u.coord, u.aluno) === n0 + 1 && one(`select count(*) from audit_log where action='aluno.producao.abrir' and actor='${u.coord}' and entity_id='${u.aluno}' and cohort_id='${T}'`) !== '0')
  t.check('Fora a auditoria, nada foi gravado', fingerprint(['audit_log']) === FP1)
  t.check('Mesmo visual e números da Minha Produção (2 · 4 · 6 · 3)', (await cards(co)) === '2,4,6,3' && (await co.locator('[data-procedimento-producao]').count()) >= 3)
  t.check('Aviso de somente leitura e auditoria', /Somente leitura.*auditoria/s.test(await co.locator('[data-aviso-auditoria]').innerText()))
  t.check('Lista de casos do aluno (sem o caso excluído)', (await co.locator('[data-casos-aluno] [data-caso]').count()) === 2 && (await co.locator('[data-caso="P.D.C."]').count()) === 0)
  t.check('Somente leitura: nenhum formulário além do filtro de período', (await co.locator('main form').count()) === 1 && (await co.locator('main form[action*="/coordenacao/alunos/"]').count()) === 1)
  await go(co, `/coordenacao/alunos/${u.aluno}?turma=${T}&filtro=periodo&de=2026-10-05&ate=2026-10-31`)
  t.check('Filtro na página individual (1 · 1 · 2 · 2) e cada abertura auditada', (await cards(co)) === '1,1,2,2' && audits(u.coord, u.aluno) === n0 + 2)
  const caseLink = await co.locator('[data-caso="P.D.A."] a').getAttribute('href')
  t.check('Caso abre na leitura de caso existente', caseLink === `/coordenacao/casos/${A}`)
  await go(co, caseLink)
  t.check('Leitura do caso continua com a própria auditoria', one(`select count(*) from audit_log where action='caso.abrir' and actor='${u.coord}' and entity_id='${A}'`) === '1')
  await go(co, `/coordenacao/alunos/${u.semreg}?turma=${T}`)
  t.check('Aluno sem registros: estado vazio na página individual', (await co.locator('[data-producao="vazia"]').count()) === 1)

  // Recusas da coordenação
  const nAll = audits(u.coord)
  t.check('Coordenação não abre turma que não coordena (404)', (await go(co, `/coordenacao?turma=${T2}`)) === 404)
  t.check('Coordenação não abre aluno de outra turma (404), sem auditoria', (await go(co, `/coordenacao/alunos/${u.aluno2}?turma=${T}`)) === 404 && (await go(co, `/coordenacao/alunos/${u.aluno2}?turma=${T2}`)) === 404 && audits(u.coord) === nAll)
  t.check('Página individual sem turma no endereço: 404', (await go(co, `/coordenacao/alunos/${u.aluno}`)) === 404)
  t.check('Coordenação não usa o painel do Admin (404)', (await go(co, '/admin/producao')) === 404)

  const co2 = await login(browser, 'coord2@visao.local', { phone: false })
  await go(co2, '/coordenacao')
  t.check('Coordenação da outra turma vê só a própria (Turma Visão 2)', (await co2.locator(`[data-visao-turma="${T2}"]`).count()) === 1 && (await cards(co2)) === '1,1,1,0')
  t.check('…e não abre a Turma 2027 nem seus alunos (404, sem auditoria)', (await go(co2, `/coordenacao?turma=${T}`)) === 404 && (await go(co2, `/coordenacao/alunos/${u.aluno}?turma=${T}`)) === 404 && audits(u.coord2) === 0)

  // ── Alunos: nenhum dado agregado nem individual ──
  const al = await login(browser, 'aluno@visao.local')
  t.check(
    'Aluno não abre Visão da turma, página individual nem Produção da turma (404)',
    (await go(al, '/coordenacao')) === 404 && (await go(al, `/coordenacao/alunos/${u.colega}?turma=${T}`)) === 404 && (await go(al, '/admin/producao')) === 404 && (await go(al, `/admin/producao/alunos/${u.colega}?turma=${T}`)) === 404,
  )
  t.check('Nenhuma auditoria em nome do aluno', audits(u.aluno) === 0)
  await go(al, '/producao')
  t.check('Minha Produção do aluno bate com a linha dele no painel (2 · 4 · 6 · 3)', (await cards(al)) === '2,4,6,3')

  // ── Admin ──
  const ad = await login(browser, 'admin@visao.local', { phone: false })
  t.check('Admin abre Produção da turma (200) com seletor de turmas', (await go(ad, '/admin/producao')) === 200 && (await ad.locator(`[data-turmas] [data-turma="${T2}"]`).count()) === 1 && (await ad.locator(`[data-turmas] [data-turma="${T}"]`).count()) === 1)
  t.check('Admin vê os mesmos números da coordenação na Turma 2027', (await go(ad, `/admin/producao?turma=${T}`), await cards(ad)) === '4,6,8,3')
  await ad.locator(`[data-turmas] [data-turma="${T2}"]`).click()
  await ad.waitForURL(new RegExp(`turma=${T2}`))
  await ad.waitForLoadState('networkidle')
  t.check('Trocar de turma troca os dados (Turma Visão 2: 1 · 1 · 1 · 0)', (await cards(ad)) === '1,1,1,0' && (await tableRows(ad)).map((r) => r.id).join() === u.aluno2)
  await ad.locator(`[data-aluno="${u.aluno2}"] [data-abrir-aluno]`).click()
  await ad.waitForURL(/\/admin\/producao\/alunos\//)
  await ad.waitForLoadState('networkidle')
  t.check('Admin abre a produção individual, auditada', ad.url().includes(`/admin/producao/alunos/${u.aluno2}?turma=${T2}`) && audits(u.admin, u.aluno2) === 1)
  t.check('Caso abre na leitura de caso do Admin', ((await ad.locator('[data-casos-aluno] a').first().getAttribute('href')) ?? '').startsWith('/admin/casos/'))
  t.check('Admin: aluno fora da turma indicada → 404, sem auditoria', (await go(ad, `/admin/producao/alunos/${u.aluno2}?turma=${T}`)) === 404 && audits(u.admin) === 1)
  await go(ad, `/admin/producao?turma=${T3}`)
  t.check('Turma sem alunos: estado vazio', /Nenhum aluno nesta turma/.test(await ad.locator('main').innerText()) && (await cov(ad, 'matriculados')) === '0')
  t.check('Turma inexistente → 404', (await go(ad, '/admin/producao?turma=00000000-0000-0000-0000-000000000000')) === 404)

  // ── Sem a função de auditoria no banco: página individual indisponível ──
  const version = one('select version from schema_info')
  sql("update schema_info set version='20261024120000_workflows_clinicos'")
  try {
    const nA = audits(u.admin)
    await go(ad, `/admin/producao/alunos/${u.aluno2}?turma=${T2}`)
    t.check('Sem a auditoria: página individual indisponível e sem dados', (await ad.locator('[data-producao-individual="indisponivel"]').count()) === 1 && (await ad.locator('[data-indicador]').count()) === 0 && audits(u.admin) === nA)
    t.check('Sem a auditoria: a Visão da turma continua', (await go(ad, `/admin/producao?turma=${T2}`)) === 200 && (await cards(ad)) === '1,1,1,0')
  } finally {
    sql(`update schema_info set version='${version}'`)
  }

  // ── 390 px ──
  const cm = await login(browser, 'coord@visao.local')
  await go(cm, '/coordenacao')
  t.check('Visão da turma em 390 px sem rolagem lateral', await noScroll(cm))
  t.check('Tabela vira lista no celular (cabeçalho escondido, ordenação no menu)', !(await cm.locator('[data-tabela-alunos] thead').isVisible()) && (await cm.locator('[data-ordenar]').isVisible()))
  const box = await cm.locator(`[data-aluno="${u.aluno}"]`).boundingBox()
  t.check('Linha do aluno cabe na largura da tela', !!box && box.x >= 0 && box.x + box.width <= 390)
  await cm.locator('[data-ordenar] summary').click()
  await cm.locator('[data-ordenar-por="casos"]').click()
  await cm.waitForURL(/ordem=casos/)
  await cm.waitForLoadState('networkidle')
  const cs = (await tableRows(cm)).map((r) => r.casos)
  t.check('Ordenar pelo menu no celular', cs.every((v, i) => i === 0 || cs[i - 1] <= v), cs)
  await go(cm, `/coordenacao/alunos/${u.aluno}?turma=${T}`)
  t.check('Produção individual em 390 px sem rolagem lateral', await noScroll(cm))
  const am = await login(browser, 'admin@visao.local')
  await go(am, `/admin/producao?turma=${T}`)
  t.check('Produção da turma (Admin) em 390 px sem rolagem lateral', await noScroll(am))
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
