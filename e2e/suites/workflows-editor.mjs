// Workflows clínicos — editor Admin e Coordenação (Etapa 9 · Parte 2). Banco LOCAL.
// Recuperada do histórico da conversa e adaptada à biblioteca comum (e2e/lib.mjs): sem chaves no código.
import { createUser as mk, go as libGo, launch, login as libLogin, noScroll, one, rest, settle, sql, suite, token } from '../lib.mjs'

const t = suite('Workflows clínicos — editor Admin e Coordenação')
const check = t.check
const go = libGo

function fingerprint() {
  const tables = sql("select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name not like 'workflow%' and table_name <> 'change_log'").split(',')
  // procedures: o teste desativa/reativa o laminado de propósito (catálogo do Admin); só o updated_at muda.
  const row = (t) => (t === 'procedures' ? "(to_jsonb(r) - 'updated_at')::text" : 'r::text')
  const parts = tables.map((t) => `select 'public.${t}', count(*), md5(coalesce(string_agg(${row(t)}, '' order by ${row(t)}),'')) from public.${t} r ${t === 'contents' ? "where slug <> 'wf-e2e-arquivado'" : ''}`)
  parts.push("select 'storage.objects', count(*), md5(coalesce(string_agg(r.name, '' order by r.name),'')) from storage.objects r")
  parts.push("select 'change_log fora de workflow', count(*), md5(coalesce(string_agg(r::text, '' order by r.id),'')) from public.change_log r where table_name not like 'workflow%' and not (table_name = 'contents' and changes::text like '%arquivado%') and not (table_name = 'procedures' and changes ? 'active' and (select count(*) from jsonb_object_keys(changes)) = 1)")
  return sql(parts.join(' union all ') + ' order by 1')
}
check('Banco local com a migração dos Workflows', one('select version from schema_info') >= '20261024120000', one('select version from schema_info'))

// ── Preparação (só local) ──
sql("delete from auth.users where email like '%@wf.local'")
sql("delete from workflows")
sql("delete from contents where slug like 'wf-e2e-%'")
sql("delete from cohorts where slug = 'wf-encerrada'")
const T = one("select id from cohorts where slug='turma-2027'")
const TE = one("insert into cohorts (name, slug, starts_on, ends_on, status) values ('Turma encerrada WF','wf-encerrada','2024-01-01','2026-01-31','encerrada') returning id")
const u = {
  admin: await mk('admin@wf.local', 'Admin WF'),
  coord: await mk('coord@wf.local', 'Coord WF'),
  coordx: await mk('coordx@wf.local', 'Coord Encerrada'),
  aluno: await mk('aluno@wf.local', 'Aluno WF'),
}
sql(`alter table profiles disable trigger profiles_guard; update profiles set role='admin' where id='${u.admin}'; update profiles set role='coordenacao' where id in ('${u.coord}','${u.coordx}'); alter table profiles enable trigger profiles_guard;`)
sql(`insert into enrollments (user_id, cohort_id, role_in_cohort) values ('${u.coord}','${T}','coordenacao'),('${u.coordx}','${TE}','coordenacao'),('${u.aluno}','${T}','aluno')`)
sql(`insert into terms_acceptances (user_id, terms_version_id) select id, current_terms_version_id() from profiles where id in ('${u.admin}','${u.coord}','${u.coordx}','${u.aluno}')`)
const cat = one("select id from categories where slug='materiais-e-adesao'")
sql(`insert into contents (kind, title, slug, category_id, status) values ('pdf','Cimentação adesiva de laminados','wf-e2e-cimentacao','${cat}','publicado'),('artigo','Artigo que será arquivado','wf-e2e-arquivado','${cat}','publicado')`)
sql("update procedures set active = false where slug = 'coroa-sobre-implante'") // inativo antes de tudo
const wfId = () => one("select w.id from workflows w join procedures p on p.id=w.procedure_id where p.slug='laminado-ceramico' and w.status<>'arquivado'")
const stageId = (name) => one(`select id from workflow_stages where workflow_id='${wfId()}' and name='${name}'`)
const items = (stage, kind) => sql(`select string_agg(text, '|' order by position) from workflow_stage_items where stage_id='${stage}' and kind='${kind}'`)
const FP0 = fingerprint()

const browser = await launch()
const login = (email, phone = false) => libLogin(browser, email, { phone })
const openPanel = async (d) => {
  if (!(await d.evaluate((e) => e.open))) await d.locator(':scope > summary').click()
}
const addPanel = (scope, label) => scope.locator(`details:has(> summary:has-text("${label}"))`)
async function addStage(p, base, wid, name, { catalog, first } = {}) {
  await go(p, `${base}/${wid}`)
  const panel = addPanel(p, 'Adicionar etapa')
  await panel.locator('summary').click()
  await panel.locator('input[name=nome]').fill(name)
  if (catalog) await panel.locator('select[name=etapa_catalogo]').selectOption({ label: catalog })
  if (first) await panel.locator('input[name=primeiro_passo]').fill(first)
  await panel.locator('button[type=submit]').click()
  await p.waitForURL(/\/etapas\//, { timeout: 15000 })
  await p.waitForLoadState('networkidle')
}
async function addItem(p, kind, text) {
  const panel = p.locator(`[data-bloco="${kind}"] > details`).last()
  await openPanel(panel)
  await panel.locator('input[name=texto]').fill(text)
  await panel.locator('button[type=submit]').click()
  await settle(p)
}
const row = (p, kind, text) => p.locator(`[data-bloco="${kind}"] li[data-item="${text}"]`)
const stageUrl = (base, name) => `${base}/${wfId()}/etapas/${stageId(name)}`

const AD = '/admin/workflows'
const CO = '/coordenacao/workflows'
try {
  // ── Admin: lista vazia e novo workflow ──
  const ad = await login('admin@wf.local')
  await go(ad, AD)
  check('Admin: lista vazia com "+ Novo workflow"', (await ad.locator('[data-vazio]').count()) === 1 && (await ad.locator(`a[href="${AD}/novo"]`).count()) === 1)
  await go(ad, `${AD}/novo`)
  const opt = (slug) => ad.locator(`select[name=procedimento] option[value="${one(`select id from procedures where slug='${slug}'`)}"]`)
  check('Novo: "Outro procedimento" indisponível', await opt('outro-procedimento').evaluate((e) => e.disabled))
  check('Novo: procedimento inativo indisponível', await opt('coroa-sobre-implante').evaluate((e) => e.disabled))
  check('Novo: opções com nome e categoria (agrupadas pelo catálogo)', (await ad.locator('select[name=procedimento] optgroup').count()) >= 5 && (await opt('laminado-ceramico').innerText()).includes('Laminado cerâmico'))
  check('Novo: não há campo de nome nem de categoria', (await ad.locator('[data-novo-workflow] input[name=nome], [data-novo-workflow] select[name=categoria]').count()) === 0)
  await ad.selectOption('select[name=procedimento]', one("select id from procedures where slug='laminado-ceramico'"))
  await ad.fill('textarea[name=descricao]', 'Sequência clínica de referência para laminados.')
  await ad.click('button:has-text("Criar rascunho")')
  await ad.waitForURL(/criado=1/, { timeout: 15000 })
  await ad.waitForLoadState('networkidle')
  check('Admin cria workflow: nasce rascunho, por ele, com a descrição',
    one(`select status||'|'||(created_by='${u.admin}')||'|'||summary from workflows where id='${wfId()}'`) === 'rascunho|true|Sequência clínica de referência para laminados.')
  check('Editor: cabeçalho com nome e categoria do catálogo, status e última atualização',
    (await ad.locator('h1').innerText()).includes('Laminado cerâmico') && /Restaurações indiretas/i.test(await ad.locator('[data-editor-workflow] header .eyebrow').innerText()) && (await ad.locator('[data-status="rascunho"]').count()) >= 1 && /Última atualização: \d\d\/\d\d\/\d{4}/.test(await ad.locator('[data-ultima-atualizacao]').innerText()))
  await go(ad, `${AD}/novo`)
  check('Procedimento já utilizado fica indisponível', (await opt('laminado-ceramico').evaluate((e) => e.disabled)) && (await opt('laminado-ceramico').innerText()).includes('já tem workflow'))

  // ── Validação de publicação ──
  await go(ad, `${AD}/${wfId()}`)
  check('Sem etapas: "Publicar" desabilitado e explicação clara', (await ad.locator('[data-acao="publicar"]').isDisabled()) && (await ad.locator('[data-pendencias]').innerText()).includes('O workflow ainda não tem nenhuma etapa.'))

  // ── Etapas: adicionar (com e sem catálogo/primeiro passo), reordenar, editar, excluir ──
  await addStage(ad, AD, wfId(), 'Planejamento', { first: 'Fotografias iniciais' })
  check('Etapa criada abre o editor da etapa', /\/etapas\/.+criada=1/.test(ad.url()))
  const catOpts = await ad.locator('select[name=etapa_catalogo] option').allInnerTexts()
  check('Etapa do catálogo: só etapas do mesmo procedimento + "Nenhuma"', JSON.stringify(catOpts) === JSON.stringify(['— Nenhuma —', 'Preparo', 'Provisório', 'Cimentação']), catOpts)
  await addStage(ad, AD, wfId(), 'Preparo', { catalog: 'Preparo' })
  await addStage(ad, AD, wfId(), 'Prova')
  await addStage(ad, AD, wfId(), 'Cimentação', { catalog: 'Cimentação' })
  await addStage(ad, AD, wfId(), 'Controle')
  await addStage(ad, AD, wfId(), 'Temporária')
  const order = () => sql(`select string_agg(name, ',' order by position) from workflow_stages where workflow_id='${wfId()}'`)
  check('Etapas na ordem de criação', order() === 'Planejamento,Preparo,Prova,Cimentação,Controle,Temporária', order())
  check('Ligação com o catálogo só onde escolhida (opcional)',
    one(`select string_agg(name, ',' order by position) from workflow_stages where workflow_id='${wfId()}' and procedure_step_id is not null`) === 'Preparo,Cimentação')
  await go(ad, `${AD}/${wfId()}`)
  await ad.locator('[data-etapa="controle"] [data-acao="subir"]').click()
  await settle(ad)
  check('Etapa ↑', order() === 'Planejamento,Preparo,Prova,Controle,Cimentação,Temporária', order())
  await ad.locator('[data-etapa="controle"] [data-acao="descer"]').click()
  await settle(ad)
  check('Etapa ↓', order() === 'Planejamento,Preparo,Prova,Cimentação,Controle,Temporária', order())
  check('Primeira etapa não sobe; última não desce', (await ad.locator('[data-etapa="planejamento"] [data-acao="subir"]').isDisabled()) && (await ad.locator('[data-etapa="temporaria"] [data-acao="descer"]').isDisabled()))
  await go(ad, stageUrl(AD, 'Prova'))
  await ad.fill('form:has(input[name=nome]) input[name=nome]', 'Prova estética')
  await ad.click('button:has-text("Salvar etapa")')
  await settle(ad)
  check('Editar nome da etapa', order().includes('Prova estética'))
  await go(ad, stageUrl(AD, 'Temporária'))
  await ad.click('[data-acao="excluir-etapa"]')
  await ad.waitForURL(/etapa_excluida=1/, { timeout: 15000 })
  check('Excluir etapa (com confirmação)', order() === 'Planejamento,Preparo,Prova estética,Cimentação,Controle', order())

  // ── Passo a passo: adicionar, reordenar, editar, excluir ──
  await go(ad, stageUrl(AD, 'Cimentação'))
  for (const t of ['Remover provisórios', 'Realizar profilaxia', 'Provar individualmente', 'Passo provisório']) await addItem(ad, 'passo', t)
  const cim = stageId('Cimentação')
  check('Passos adicionados como itens individuais e numerados', items(cim, 'passo') === 'Remover provisórios|Realizar profilaxia|Provar individualmente|Passo provisório' && (await row(ad, 'passo', 'Realizar profilaxia').innerText()).includes('02'))
  await row(ad, 'passo', 'Provar individualmente').locator('[data-acao="subir"]').click()
  await settle(ad)
  check('Passo ↑', items(cim, 'passo') === 'Remover provisórios|Provar individualmente|Realizar profilaxia|Passo provisório', items(cim, 'passo'))
  await row(ad, 'passo', 'Provar individualmente').locator('[data-acao="descer"]').click()
  await settle(ad)
  check('Passo ↓', items(cim, 'passo') === 'Remover provisórios|Realizar profilaxia|Provar individualmente|Passo provisório', items(cim, 'passo'))
  const pr = row(ad, 'passo', 'Realizar profilaxia')
  await pr.locator('[data-acao="editar"]').click()
  await pr.locator('input[name=texto]').fill('Realizar profilaxia com pedra-pomes')
  await pr.locator('button:has-text("Salvar")').click()
  await settle(ad)
  check('Editar passo', items(cim, 'passo').includes('Realizar profilaxia com pedra-pomes'))
  await row(ad, 'passo', 'Passo provisório').locator('[data-acao="excluir"]').click()
  await settle(ad)
  check('Excluir passo', items(cim, 'passo') === 'Remover provisórios|Realizar profilaxia com pedra-pomes|Provar individualmente', items(cim, 'passo'))
  const tooLong = 'x'.repeat(241)
  const longPanel = ad.locator('[data-bloco="passo"] > details').last()
  await openPanel(longPanel)
  check('Tamanho máximo do texto respeitado no campo (240)', (await longPanel.locator('input[name=texto]').getAttribute('maxlength')) === '240' && tooLong.length === 241)
  await longPanel.locator('summary').click()

  // ── Materiais e pontos de atenção ──
  for (const t of ['Isolamento absoluto', 'Fio dental', 'Try-in']) await addItem(ad, 'material', t)
  check('Checklist de materiais: itens individuais com □ (só visual)', items(cim, 'material') === 'Isolamento absoluto|Fio dental|Try-in' && (await row(ad, 'material', 'Fio dental').innerText()).includes('□') && (await ad.locator('[data-bloco="material"] input[type=checkbox]').count()) === 0)
  await row(ad, 'material', 'Try-in').locator('[data-acao="subir"]').click()
  await settle(ad)
  check('Material ↑', items(cim, 'material') === 'Isolamento absoluto|Try-in|Fio dental', items(cim, 'material'))
  await addItem(ad, 'atencao', 'Conferir a cor do try-in antes de cimentar')
  check('Ponto de atenção adicionado', items(cim, 'atencao') === 'Conferir a cor do try-in antes de cimentar')

  // ── Próximos passos ──
  await go(ad, stageUrl(AD, 'Prova estética'))
  const nextPanel = () => ad.locator('[data-bloco="proximos"] > details').last()
  async function addNext(label, target, note) {
    await openPanel(nextPanel())
    if (label) await nextPanel().locator('input[name=condicao]').fill(label)
    if (target) await nextPanel().locator('select[name=destino]').selectOption({ label: target })
    if (note) await nextPanel().locator('input[name=orientacao]').fill(note)
    await nextPanel().locator('button[type=submit]').click()
    await settle(ad)
  }
  await addNext('Aprovado', '04 Cimentação')
  await addNext('Necessita ajuste laboratorial', '03 Prova estética')
  await addNext('Sensibilidade importante', null, 'Reavaliar antes de prosseguir')
  const prova = stageId('Prova estética')
  const nexts = () => sql(`select string_agg(coalesce(label,'')||'>'||coalesce((select name from workflow_stages s where s.id=n.target_stage_id),'')||'>'||coalesce(note,''), '|' order by position) from workflow_stage_next n where stage_id='${prova}'`)
  check('Próximos passos: destino, a própria etapa e orientação', nexts() === 'Aprovado>Cimentação>|Necessita ajuste laboratorial>Prova estética>|Sensibilidade importante>>Reavaliar antes de prosseguir', nexts())
  check('Próximo passo exibido como "Aprovado → Cimentação"', (await ad.locator('[data-bloco="proximos"] li[data-proximo="Aprovado"]').innerText()).includes('Aprovado → Cimentação'))
  await openPanel(nextPanel())
  await nextPanel().locator('input[name=condicao]').fill('Sem destino nem orientação')
  await nextPanel().locator('button[type=submit]').click()
  await settle(ad)
  check('Sem destino e sem orientação: recusado com mensagem clara', (await nextPanel().locator('[role=alert]').innerText()).includes('Escolha uma etapa de destino ou escreva uma orientação') && nexts().split('|').length === 3)
  check('Nenhum próximo passo inferido: etapa sem cadastro fica sem', one(`select count(*) from workflow_stage_next where stage_id='${stageId('Planejamento')}'`) === '0')

  // ── Para aprofundar (Biblioteca) ──
  await go(ad, stageUrl(AD, 'Cimentação'))
  const contentPanel = () => ad.locator('[data-bloco="conteudos"] > details').last()
  for (const slug of ['wf-e2e-cimentacao', 'wf-e2e-arquivado']) {
    await openPanel(contentPanel())
    await contentPanel().locator('select[name=conteudo]').selectOption(one(`select id from contents where slug='${slug}'`))
    await contentPanel().locator('button[type=submit]').click()
    await settle(ad)
  }
  check('Conteúdos da Biblioteca relacionados por referência (sem cópia)', one(`select count(*) from workflow_stage_contents where stage_id='${cim}'`) === '2' && one("select count(*) from contents where slug like 'wf-e2e-%'") === '2')
  const opts = await contentPanel().locator('select[name=conteudo] option').allInnerTexts()
  check('Seletor não oferece rascunho nem o que já está na etapa', !opts.some((o) => o.includes('Cimentação adesiva de laminados')))

  // ── Publicação ──
  await go(ad, `${AD}/${wfId()}`)
  const pend = await ad.locator('[data-pendencias]').innerText()
  check('Validação explica cada etapa sem passo', pend.includes('A etapa "Preparo" ainda não possui nenhum passo.') && pend.includes('A etapa "Prova estética" ainda não possui nenhum passo.') && pend.includes('A etapa "Controle" ainda não possui nenhum passo.') && (await ad.locator('[data-acao="publicar"]').isDisabled()))
  for (const s of ['Preparo', 'Prova estética', 'Controle']) {
    await go(ad, stageUrl(AD, s))
    await addItem(ad, 'passo', `Primeiro passo de ${s}`)
  }
  await go(ad, `${AD}/${wfId()}`)
  check('Sem pendências: "Publicar" liberado', (await ad.locator('[data-pendencias]').count()) === 0 && !(await ad.locator('[data-acao="publicar"]').isDisabled()))
  await ad.click('[data-acao="publicar"]')
  await settle(ad)
  check('Publicar', one(`select status||'|'||(published_at is not null) from workflows where id='${wfId()}'`) === 'publicado|true')
  check('"Ver como aluno" ativo no publicado (abre a tela do aluno)', (await ad.locator('[data-ver-como-aluno="ativo"]').getAttribute('href')) === '/workflows/laminado-ceramico')
  check('Publicado não mostra "Excluir rascunho"', (await ad.locator('[data-acao="excluir-workflow"]').count()) === 0)

  // ── Publicado continua editável ──
  await go(ad, stageUrl(AD, 'Controle'))
  await addItem(ad, 'passo', 'Avaliar margens')
  check('Publicado: edição vale na hora (passo adicionado, continua publicado)', items(stageId('Controle'), 'passo').includes('Avaliar margens') && one(`select status from workflows where id='${wfId()}'`) === 'publicado')
  await go(ad, stageUrl(AD, 'Preparo'))
  await row(ad, 'passo', 'Primeiro passo de Preparo').locator('[data-acao="excluir"]').click()
  await settle(ad)
  check('Publicado: último passo da etapa não sai (mensagem clara)', (await row(ad, 'passo', 'Primeiro passo de Preparo').locator('[role=alert]').innerText()).includes('precisa manter pelo menos um passo') && items(stageId('Preparo'), 'passo') === 'Primeiro passo de Preparo')
  await addStage(ad, AD, wfId(), 'Manutenção', { first: 'Orientar higiene' })
  check('Publicado: nova etapa entra junto com o primeiro passo', items(stageId('Manutenção'), 'passo') === 'Orientar higiene' && one(`select status from workflows where id='${wfId()}'`) === 'publicado')
  check('Publicado: campo "primeiro passo" é obrigatório ao adicionar etapa', (await (async () => { await go(ad, `${AD}/${wfId()}`); return ad.locator('input[name=primeiro_passo]').getAttribute('required') })()) !== null)

  // ── Despublicar, arquivar, restaurar ──
  await go(ad, `${AD}/${wfId()}`)
  await ad.click('[data-acao="despublicar"]')
  await settle(ad)
  check('Despublicar → rascunho', one(`select status from workflows where id='${wfId()}'`) === 'rascunho')
  check('Já publicado antes: sem "Excluir rascunho"', (await ad.locator('[data-acao="excluir-workflow"]').count()) === 0)
  const wid = wfId()
  await ad.click('[data-acao="arquivar"]')
  await settle(ad)
  check('Arquivar', one(`select status||'|'||(archived_at is not null) from workflows where id='${wid}'`) === 'arquivado|true')
  await ad.click('[data-acao="restaurar"]')
  await settle(ad)
  check('Restaurar como rascunho', one(`select status||'|'||(archived_at is null) from workflows where id='${wid}'`) === 'rascunho|true')
  await go(ad, `${AD}/${wfId()}`)
  await ad.click('[data-acao="publicar"]')
  await settle(ad)
  check('Publicar de novo', one(`select status from workflows where id='${wfId()}'`) === 'publicado')

  // ── Procedimento desativado ──
  sql("update procedures set active = false where slug = 'laminado-ceramico'")
  await go(ad, `${AD}/${wfId()}`)
  const warn = (await ad.locator('[data-aviso-desativado]').count()) === 1
  await go(ad, AD)
  check('Procedimento desativado: aviso no editor e na lista; workflow intacto', warn && (await ad.locator('[data-workflow="laminado-ceramico"] [data-aviso-desativado]').count()) === 1 && one(`select status from workflows where id='${wfId()}'`) === 'publicado')
  sql("update procedures set active = true where slug = 'laminado-ceramico'")

  // ── Conteúdo que ficou indisponível ──
  sql("update contents set status = 'arquivado' where slug = 'wf-e2e-arquivado'")
  await go(ad, stageUrl(AD, 'Cimentação'))
  const unav = ad.locator('[data-bloco="conteudos"] [data-indisponivel]')
  check('Admin: conteúdo arquivado preservado e marcado "indisponível para alunos"', (await unav.count()) === 1 && (await ad.locator('[data-bloco="conteudos"] li').count()) === 2)

  // ── Busca e filtro da lista; ↑ ↓ dos workflows ──
  sql(`insert into workflows (procedure_id, position) select id, 50 from procedures where slug='coroa-total'`)
  await go(ad, `${AD}?q=lente`)
  check('Busca pelo sinônimo do catálogo ("lente")', (await ad.locator('[data-workflow]').count()) === 1 && (await ad.locator('[data-workflow="laminado-ceramico"]').count()) === 1)
  await go(ad, `${AD}?status=rascunho`)
  check('Filtro por status', (await ad.locator('[data-workflow]').count()) === 1 && (await ad.locator('[data-workflow="coroa-total"]').count()) === 1)
  await go(ad, AD)
  const wpos = () => sql("select string_agg(p.slug, ',' order by w.position) from workflows w join procedures p on p.id=w.procedure_id")
  await ad.locator('[data-workflow="coroa-total"] [data-acao="subir"]').click()
  await settle(ad)
  check('Workflow ↑ dentro da categoria', wpos() === 'coroa-total,laminado-ceramico', wpos())
  check('Lista mostra status, etapas e última atualização', /6 etapas/.test(await ad.locator('[data-workflow="laminado-ceramico"]').innerText()) && /Atualizado em \d\d\/\d\d\/\d{4}/.test(await ad.locator('[data-workflow="laminado-ceramico"]').innerText()))

  // ── Admin em 390 px ──
  const adp = await login('admin@wf.local', true)
  for (const path of [AD, `${AD}/${wfId()}`, stageUrl(AD, 'Cimentação'), `${AD}/novo`]) {
    await go(adp, path)
    check(`390 px sem rolagem lateral: ${path.replace(/[0-9a-f-]{36}/g, ':id')}`, await noScroll(adp))
  }

  // ── Coordenação (celular 390 px) ──
  const co = await login('coord@wf.local', true)
  await go(co, '/coordenacao')
  check('Coordenação: cartão "Workflows clínicos" no painel', (await co.locator('[data-cartao-workflows]').count()) === 1)
  await go(co, CO)
  check('Coordenação: lista com o workflow (o mesmo editor)', (await co.locator('[data-workflow="laminado-ceramico"]').count()) === 1 && (await noScroll(co)))
  await go(co, `${CO}/${wfId()}`)
  await co.fill('textarea[name=descricao]', 'Revisado pela coordenação.')
  await co.click('button:has-text("Salvar descrição")')
  await settle(co)
  check('Coordenação edita workflow publicado; "atualizado por" passa a ser ela', one(`select summary||'|'||(updated_by='${u.coord}') from workflows where id='${wfId()}'`) === 'Revisado pela coordenação.|true')
  await go(co, stageUrl(CO, 'Cimentação'))
  check('Coordenação: 390 px sem rolagem lateral no editor da etapa', await noScroll(co))
  await addItem(co, 'material', 'Microbrush')
  check('Coordenação adiciona material', items(cim, 'material').endsWith('|Microbrush'))
  const coUnav = co.locator('[data-bloco="conteudos"] li[data-conteudo="indisponivel"]')
  check('Coordenação: conteúdo indisponível aparece sem revelar o título (RLS respeitada)', (await coUnav.count()) === 1 && (await coUnav.innerText()).includes('Conteúdo indisponível para alunos') && !(await co.locator('[data-bloco="conteudos"]').innerText()).includes('Artigo que será arquivado'))
  // cria, ajusta e exclui um rascunho
  await go(co, `${CO}/novo`)
  await co.selectOption('select[name=procedimento]', one("select id from procedures where slug='clareamento-de-consultorio'").length ? one("select id from procedures where slug='clareamento-de-consultorio'") : one("select id from procedures where active and slug not in ('laminado-ceramico','coroa-total','outro-procedimento') order by position limit 1"))
  await co.click('button:has-text("Criar rascunho")')
  await co.waitForURL(/criado=1/, { timeout: 15000 })
  await co.waitForLoadState('networkidle')
  const draft = co.url().split('/workflows/')[1].split('?')[0]
  check('Coordenação cria workflow (rascunho, criado por ela)', one(`select status||'|'||(created_by='${u.coord}') from workflows where id='${draft}'`) === 'rascunho|true')
  await co.click('[data-acao="excluir-workflow"]')
  await co.waitForURL(/excluido=1/, { timeout: 15000 })
  check('Excluir rascunho nunca publicado', one(`select count(*) from workflows where id='${draft}'`) === '0')

  // ── Coordenação sem permissões adicionais ──
  await go(co, AD)
  check('Coordenação não abre /admin/workflows', (await co.locator('[data-workflows-editor]').count()) === 0)
  const tk = await token('coord@wf.local')
  const r1 = await (await rest(tk, 'PATCH', 'procedures?slug=eq.laminado-ceramico', { name: 'Hackeado' })).json()
  const r2 = await (await rest(tk, 'PATCH', "contents?slug=eq.wf-e2e-cimentacao", { title: 'Hackeado' })).json()
  const r3 = await rest(tk, 'POST', 'procedure_categories', { name: 'Nova', slug: 'nova-coord' })
  const r4 = await (await rest(tk, 'PATCH', `cohorts?id=eq.${T}`, { name: 'Hackeado' })).json()
  const r5 = await (await rest(tk, 'PATCH', 'enrollments?role_in_cohort=eq.aluno', { status: 'inativa' })).json()
  check('Coordenação não altera catálogo, Biblioteca, turmas nem matrículas (API direta)',
    Array.isArray(r1) && r1.length === 0 && Array.isArray(r2) && r2.length === 0 && r3.status >= 400 && Array.isArray(r4) && r4.length === 0 && Array.isArray(r5) && r5.length === 0,
    JSON.stringify([r1, r2, r3.status, r4, r5]))
  const r6 = await (await rest(tk, 'PATCH', 'clinical_cases?patient_label=neq.x', { title: 'Hackeado' })).json()
  const r7 = await rest(tk, 'POST', 'case_plan_visits', { case_id: '00000000-0000-4000-a000-000000000001' })
  check('Coordenação não grava em Casos nem no Planejamento', Array.isArray(r6) && r6.length === 0 && r7.status >= 400, JSON.stringify([r6, r7.status]))

  const cx = await login('coordx@wf.local', true)
  await go(cx, CO)
  check('Coordenação de turma encerrada: sem acesso ao editor (aviso claro)', (await cx.locator('[data-editor-indisponivel="inativo"]').count()) === 1)
  const al = await login('aluno@wf.local', true)
  await go(al, CO)
  check('Aluno não abre o editor', (await al.locator('[data-workflows-editor]').count()) === 0)

  // ── Nada fora das tabelas de Workflow ──
  check('Nenhuma escrita fora das tabelas de Workflow (banco e Storage)', fingerprint() === FP0)
  check('Histórico interno registrou as mudanças (quem e quando)', Number(one("select count(*) from change_log where table_name like 'workflow%'")) > 20 && one(`select count(*) from change_log where table_name='workflows' and actor='${u.coord}'`) !== '0')
} catch (e) {
  t.fail(e)
} finally {
  await browser.close()
  t.finish()
}
