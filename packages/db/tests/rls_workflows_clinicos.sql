-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Etapa 9 · Workflows clínicos: leitura do aluno (publicado + procedimento ativo), quem edita (admin e
-- coordenação ativa, só nas tabelas novas), relação com catálogo e Biblioteca, regra de publicação, próximos passos
-- sem inferência, limites e isolamento total de Casos/Jornada/Planejamento/Produção. Transação desfeita no final.
-- Pessoas: A (aluno T1) · B (aluno T2) · N (sem matrícula) · C (coordena T1, ativa) · X (coordena T3, encerrada)
--          · Y (coordena T1, perfil desativado) · D (admin).

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;
grant insert, select on resultados to anon, authenticated;
grant usage on sequence resultados_ordem_seq to anon, authenticated;

create function pg_temp.entrar(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
end
$$;

create function pg_temp.proc(p_slug text) returns uuid language sql as $$
  select id from public.procedures where slug = p_slug
$$;
create function pg_temp.etapa(p_proc text, p_step text) returns uuid language sql as $$
  select s.id from public.procedure_steps s join public.procedures p on p.id = s.procedure_id
  where p.slug = p_proc and s.slug = p_step
$$;

-- Impressão digital das estruturas que o Workflow NÃO pode alterar (catálogo, Biblioteca, Casos, Jornada,
-- Planejamento, Produção e pessoas).
create function pg_temp.intocadas() returns text language sql as $$
  select md5(string_agg(h, '|' order by h)) from (
    select 'procedures:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) h from public.procedures r
    union all select 'procedure_steps:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.procedure_steps r
    union all select 'procedure_categories:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.procedure_categories r
    union all select 'procedure_topics:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.procedure_topics r
    union all select 'contents:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.contents r
    union all select 'content_topics:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.content_topics r
    union all select 'content_cohorts:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.content_cohorts r
    union all select 'content_progress:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.content_progress r
    union all select 'categories:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.categories r
    union all select 'topics:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.topics r
    union all select 'clinical_cases:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.clinical_cases r
    union all select 'performed_procedures:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.performed_procedures r
    union all select 'active_performed_procedures:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.active_performed_procedures r
    union all select 'case_plan_visits:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.case_plan_visits r
    union all select 'case_plan_items:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.case_plan_items r
    union all select 'profiles:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.profiles r
    union all select 'enrollments:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.enrollments r
    union all select 'cohorts:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.cohorts r
  ) x
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000090a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000090b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-00000000090e', 'n@teste.invalid'),
  ('00000000-0000-4000-a000-0000000009c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000009e0', 'x@teste.invalid'),
  ('00000000-0000-4000-a000-0000000009f0', 'y@teste.invalid'),
  ('00000000-0000-4000-a000-0000000009d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in
  ('00000000-0000-4000-a000-0000000009c0', '00000000-0000-4000-a000-0000000009e0', '00000000-0000-4000-a000-0000000009f0');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000009d0';
update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-0000000009f0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on, status) values
  ('00000000-0000-4000-b000-0000000009a1', 'Turma WF 1', 'teste-wf-1', '2026-01-01', '2028-07-31', 'ativa'),
  ('00000000-0000-4000-b000-0000000009a2', 'Turma WF 2', 'teste-wf-2', '2026-01-01', '2028-07-31', 'ativa'),
  ('00000000-0000-4000-b000-0000000009a3', 'Turma WF 3', 'teste-wf-3', '2024-01-01', '2026-01-31', 'encerrada');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000090a', '00000000-0000-4000-b000-0000000009a1', 'aluno'),
  ('00000000-0000-4000-a000-00000000090b', '00000000-0000-4000-b000-0000000009a2', 'aluno'),
  ('00000000-0000-4000-a000-0000000009c0', '00000000-0000-4000-b000-0000000009a1', 'coordenacao'),
  ('00000000-0000-4000-a000-0000000009e0', '00000000-0000-4000-b000-0000000009a3', 'coordenacao'),
  ('00000000-0000-4000-a000-0000000009f0', '00000000-0000-4000-b000-0000000009a1', 'coordenacao');

-- Biblioteca: publicado (todas as turmas), rascunho, publicado só da T2, publicado que será arquivado e 6 extras.
insert into public.contents (id, kind, title, slug, category_id, status) values
  ('00000000-0000-4000-e000-000000000901', 'pdf', 'Cimentação adesiva', 'teste-wf-c1', (select id from public.categories where slug = 'materiais-e-adesao'), 'publicado'),
  ('00000000-0000-4000-e000-000000000902', 'pdf', 'Rascunho WF', 'teste-wf-c2', (select id from public.categories where slug = 'materiais-e-adesao'), 'rascunho'),
  ('00000000-0000-4000-e000-000000000903', 'pdf', 'Só da T2', 'teste-wf-c3', (select id from public.categories where slug = 'materiais-e-adesao'), 'publicado'),
  ('00000000-0000-4000-e000-000000000904', 'pdf', 'Será arquivado', 'teste-wf-c4', (select id from public.categories where slug = 'materiais-e-adesao'), 'publicado');
insert into public.contents (id, kind, title, slug, category_id, status)
  select ('00000000-0000-4000-e000-00000000091' || g)::uuid, 'link', 'Extra ' || g, 'teste-wf-x' || g,
         (select id from public.categories where slug = 'materiais-e-adesao'), 'publicado'
  from generate_series(0, 6) g;
insert into public.content_cohorts (content_id, cohort_id) values ('00000000-0000-4000-e000-000000000903', '00000000-0000-4000-b000-0000000009a2');

do $$
declare
  ok boolean;
  n integer;
  fp_antes text;
  a constant uuid := '00000000-0000-4000-a000-00000000090a';
  b constant uuid := '00000000-0000-4000-a000-00000000090b';
  sem constant uuid := '00000000-0000-4000-a000-00000000090e';
  c constant uuid := '00000000-0000-4000-a000-0000000009c0';
  x constant uuid := '00000000-0000-4000-a000-0000000009e0';
  y constant uuid := '00000000-0000-4000-a000-0000000009f0';
  adm constant uuid := '00000000-0000-4000-a000-0000000009d0';
  c1 constant uuid := '00000000-0000-4000-e000-000000000901';
  c2 constant uuid := '00000000-0000-4000-e000-000000000902';
  c3 constant uuid := '00000000-0000-4000-e000-000000000903';
  c4 constant uuid := '00000000-0000-4000-e000-000000000904';
  w uuid;
  w2 uuid;
  w3 uuid;
  s1 uuid;
  s2 uuid;
  s3 uuid;
  s4 uuid;
  sx uuid;
  slug2 text;
begin
  -- Regra de publicação conferida a cada comando (no app, no fim da transação de cada requisição).
  execute 'set constraints all immediate';
  fp_antes := pg_temp.intocadas();

  -- ── Coordenação ativa cria o workflow de Laminado cerâmico (rascunho) ──
  perform pg_temp.entrar(c);
  select public.workflow_editor() into ok;
  insert into resultados (teste, passou) values ('Coordenação ativa (perfil + matrícula de coordenação em turma ativa) pode editar workflows', ok);
  insert into public.workflows (procedure_id, summary, position) values (pg_temp.proc('laminado-ceramico'), 'Sequência clínica de referência.', 1)
    returning id into w;
  insert into resultados (teste, passou) values ('Coordenação cria workflow: nasce rascunho, criado/atualizado por ela',
    (select status = 'rascunho' and created_by = c and updated_by = c and published_at is null from public.workflows where id = w));
  insert into resultados (teste, passou) values ('Workflow não tem nome nem categoria próprios: vêm do catálogo (junção)',
    not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workflows'
                and column_name in ('name', 'title', 'category_id', 'slug'))
    and (select pr.name from public.workflows wf join public.procedures pr on pr.id = wf.procedure_id where wf.id = w) = 'Laminado cerâmico');

  ok := false;
  begin
    insert into public.workflows (procedure_id, status) values (pg_temp.proc('exodontia'), 'publicado');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Workflow não nasce publicado', ok);

  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('outro-procedimento'));
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('"Outro procedimento" é recusado', ok);

  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('laminado-ceramico'));
  exception when unique_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Máximo de um workflow ativo por procedimento', ok);

  ok := false;
  begin
    insert into public.workflows (procedure_id) values ('00000000-0000-4000-f000-000000000999');
  exception when foreign_key_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('procedure_id precisa existir no catálogo', ok);

  -- ── Publicação exige etapa e passo em cada etapa ──
  ok := false;
  begin
    update public.workflows set status = 'publicado' where id = w;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Publicar sem etapas é recusado', ok);

  insert into public.workflow_stages (workflow_id, name, slug, position) values (w, 'Planejamento', '', 1) returning id into s1;
  insert into public.workflow_stages (workflow_id, name, slug, position, procedure_step_id)
    values (w, 'Preparo', '', 2, pg_temp.etapa('laminado-ceramico', 'preparo')) returning id into s2;
  insert into public.workflow_stages (workflow_id, name, slug, position) values (w, 'Prova', '', 3) returning id into s3;
  insert into public.workflow_stages (workflow_id, name, slug, position, procedure_step_id)
    values (w, 'Cimentação', '', 4, pg_temp.etapa('laminado-ceramico', 'cimentacao')) returning id into s4;
  insert into resultados (teste, passou) values ('Endereço da etapa gerado do nome, sem acento ("cimentacao")',
    (select slug from public.workflow_stages where id = s4) = 'cimentacao' and (select slug from public.workflow_stages where id = s1) = 'planejamento');
  insert into public.workflow_stages (workflow_id, name, slug, position) values (w, 'Prova', '', 9) returning slug into slug2;
  insert into resultados (teste, passou) values ('Nome repetido gera endereço único ("prova-2")', slug2 = 'prova-2');
  delete from public.workflow_stages where workflow_id = w and slug = 'prova-2';

  ok := false;
  begin
    insert into public.workflow_stages (workflow_id, name, slug, procedure_step_id) values (w, 'Errada', '', pg_temp.etapa('exodontia', 'exodontia'));
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Ligação com etapa do catálogo só do mesmo procedimento (opcional)',
    ok and (select procedure_step_id from public.workflow_stages where id = s2) = pg_temp.etapa('laminado-ceramico', 'preparo')
       and (select procedure_step_id from public.workflow_stages where id = s1) is null);

  insert into public.workflow_stage_items (stage_id, kind, text, position) values
    (s1, 'passo', 'Fotografias iniciais', 1), (s1, 'passo', 'Escaneamento intraoral', 2),
    (s2, 'passo', 'Guia de silicone', 1), (s2, 'material', 'Pontas diamantadas', 1),
    (s3, 'passo', 'Prova seca e com try-in', 1);
  ok := false;
  begin
    update public.workflows set status = 'publicado' where id = w;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Publicar com etapa sem passo é recusado (material não conta como passo)', ok);

  insert into public.workflow_stage_items (stage_id, kind, text, position) values
    (s4, 'passo', 'Isolamento', 1), (s4, 'passo', 'Condicionamento', 2),
    (s4, 'material', 'Cimento resinoso', 1), (s4, 'material', 'Ácido fluorídrico', 2),
    (s4, 'atencao', 'Conferir a cor do try-in antes de cimentar', 1);
  update public.workflows set status = 'publicado' where id = w;
  insert into resultados (teste, passou) values ('Publicar com etapas e passos: published_at gravado',
    (select status = 'publicado' and published_at is not null from public.workflows where id = w));

  -- ── Próximos passos: só os cadastrados, sempre no mesmo workflow ──
  insert into public.workflow_stage_next (stage_id, label, target_stage_id, position) values
    (s3, 'Aprovado', s4, 1), (s3, 'Necessita ajuste laboratorial', s3, 2);
  insert into public.workflow_stage_next (stage_id, note, position) values (s4, 'Agendar controle em 7 dias.', 1);
  insert into resultados (teste, passou) values ('Próximo passo para outra etapa, para a própria etapa ou só orientação',
    (select count(*) from public.workflow_stage_next where workflow_id = w) = 3);
  ok := false;
  begin
    insert into public.workflow_stage_next (stage_id, label) values (s3, 'Sem destino nem orientação');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Próximo passo precisa de destino ou orientação', ok);

  insert into public.workflows (procedure_id) values (pg_temp.proc('exodontia')) returning id into w2;
  insert into public.workflow_stages (workflow_id, name, slug) values (w2, 'Avaliação', '') returning id into sx;
  ok := false;
  begin
    insert into public.workflow_stage_next (stage_id, target_stage_id) values (s3, sx);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Destino de próximo passo em outro workflow é recusado', ok);
  ok := false;
  begin
    update public.workflow_stage_next set target_stage_id = sx where stage_id = s3 and position = 1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Alterar destino para outro workflow também é recusado', ok);

  -- ── Conteúdos da Biblioteca: só referência a publicado legível ──
  ok := false;
  begin
    insert into public.workflow_stage_contents (stage_id, content_id) values (s4, c2);
  exception when check_violation or insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Conteúdo em rascunho não pode ser relacionado', ok);
  ok := false;
  begin
    insert into public.workflow_stage_contents (stage_id, content_id) values (s4, c3);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Coordenação não relaciona conteúdo que ela mesma não pode ler (só da T2)', ok);
  insert into public.workflow_stage_contents (stage_id, content_id, position) values (s4, c1, 1), (s4, c4, 2);
  reset role;
  perform pg_temp.entrar(adm);
  insert into public.workflow_stage_contents (stage_id, content_id, position) values (s4, c3, 3);
  insert into resultados (teste, passou) values ('Admin edita o mesmo workflow; "atualizado por" passa a ser o admin',
    (select updated_by from public.workflows where id = w) = adm);
  reset role;

  -- ── Aluno: lê só o publicado ──
  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Aluno lê workflow publicado, etapas, passos, materiais e atenção',
    exists (select 1 from public.workflows where id = w)
    and (select count(*) from public.workflow_stages where workflow_id = w) = 4
    and (select count(*) from public.workflow_stage_items where workflow_id = w) = 10);
  insert into resultados (teste, passou) values ('Aluno não vê workflow em rascunho (nem etapas dele)',
    not exists (select 1 from public.workflows where id = w2) and not exists (select 1 from public.workflow_stages where id = sx));
  insert into resultados (teste, passou) values ('Nenhum próximo passo inferido: etapa sem próximos passos devolve zero',
    (select count(*) from public.workflow_stage_next where stage_id = s1) = 0
    and (select count(*) from public.workflow_stage_next where stage_id = s2) = 0);
  insert into resultados (teste, passou) values ('Aluno vê só conteúdos que pode ler (o da T2 some, sem quebrar a etapa)',
    (select array_agg(content_id order by position) from public.workflow_stage_contents where stage_id = s4) = array[c1, c4]);

  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('exodontia'));
  exception when insufficient_privilege then ok := true;
  end;
  update public.workflows set summary = 'aluno' where id = w;
  get diagnostics n = row_count;
  ok := ok and n = 0;
  update public.workflow_stage_items set text = 'aluno' where workflow_id = w;
  get diagnostics n = row_count;
  ok := ok and n = 0;
  delete from public.workflow_stages where workflow_id = w;
  get diagnostics n = row_count;
  ok := ok and n = 0;
  begin
    insert into public.workflow_stage_items (stage_id, kind, text) values (s1, 'passo', 'aluno');
    ok := false;
  exception when insufficient_privilege then null;
  end;
  insert into resultados (teste, passou) values ('Aluno não cria, altera nem exclui nada de workflow', ok);
  select public.workflow_editor() into ok;
  insert into resultados (teste, passou) values ('Aluno não é editor', not ok);
  reset role;

  perform pg_temp.entrar(b);
  insert into resultados (teste, passou) values ('Workflow é institucional: aluno de outra turma também lê',
    exists (select 1 from public.workflows where id = w));
  reset role;
  perform pg_temp.entrar(sem);
  insert into resultados (teste, passou) values ('Pessoa sem matrícula ativa não lê workflows',
    not exists (select 1 from public.workflows) and not exists (select 1 from public.workflow_stage_items));
  reset role;

  -- ── Nada fora do Workflow mudou (criar, publicar e editar workflows, ler como aluno) ──
  insert into resultados (teste, passou) values ('Workflow não altera catálogo, Biblioteca, Casos, Jornada, Planejamento, Produção nem pessoas',
    pg_temp.intocadas() = fp_antes);

  -- ── Conteúdo arquivado depois: some para o aluno, workflow intacto ──
  update public.contents set status = 'arquivado' where id = c4;
  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Conteúdo arquivado some do "Para aprofundar" sem quebrar o workflow',
    (select array_agg(content_id) from public.workflow_stage_contents where stage_id = s4) = array[c1]
    and (select count(*) from public.workflow_stage_items where stage_id = s4) = 5);
  reset role;
  perform pg_temp.entrar(adm);
  insert into resultados (teste, passou) values ('Quem edita ainda vê o vínculo do conteúdo indisponível (para tratar)',
    (select count(*) from public.workflow_stage_contents where stage_id = s4) = 3);
  reset role;

  -- ── Workflow publicado continua íntegro durante a edição ──
  perform pg_temp.entrar(c);
  ok := false;
  begin
    delete from public.workflow_stage_items where stage_id = s3 and kind = 'passo';
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Publicado: excluir o último passo de uma etapa é recusado', ok);
  ok := false;
  begin
    update public.workflow_stage_items set kind = 'material' where stage_id = s3 and kind = 'passo';
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Publicado: transformar o último passo em material é recusado', ok);
  ok := false;
  begin
    insert into public.workflow_stages (workflow_id, name, slug) values (w, 'Controle', '');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Publicado: etapa nova vazia é recusada', ok);
  execute 'set constraints all deferred';
  perform public.workflow_add_stage(w, 'Controle', 'Avaliar margens e tecido gengival');
  execute 'set constraints all immediate';
  insert into resultados (teste, passou) values ('Publicado: etapa nova com o primeiro passo entra junto (workflow_add_stage)',
    (select count(*) from public.workflow_stages where workflow_id = w) = 5
    and (select position from public.workflow_stages where workflow_id = w and slug = 'controle') = 5);
  update public.workflow_stage_items set text = 'Fotografias iniciais padronizadas' where stage_id = s1 and position = 1;
  insert into resultados (teste, passou) values ('Edição em publicado vale na hora (sem cópia de rascunho)',
    (select status from public.workflows where id = w) = 'publicado'
    and exists (select 1 from public.workflow_stage_items where text = 'Fotografias iniciais padronizadas'));
  insert into resultados (teste, passou) values ('Qualquer mudança nas etapas atualiza "atualizado por" do workflow',
    (select updated_by from public.workflows where id = w) = c);

  -- Excluir etapa que é destino de próximo passo leva junto esse próximo passo.
  insert into public.workflow_stage_items (stage_id, kind, text, position) values (s2, 'passo', 'Preparo minimamente invasivo', 2);
  insert into public.workflow_stage_next (stage_id, label, target_stage_id) values (s1, 'Mock-up aprovado', s2);
  delete from public.workflow_stages where id = s2;
  insert into resultados (teste, passou) values ('Etapa excluída leva junto os próximos passos que apontavam para ela',
    not exists (select 1 from public.workflow_stage_next where target_stage_id = s2) and (select count(*) from public.workflow_stage_next where stage_id = s1) = 0);

  -- Workflow publicado não se exclui (só arquiva).
  delete from public.workflows where id = w;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Workflow já publicado não pode ser excluído', n = 0 and exists (select 1 from public.workflows where id = w));
  reset role;

  -- ── Coordenação sem outras permissões ──
  perform pg_temp.entrar(c);
  ok := true;
  update public.procedures set name = 'Renomeado pela coordenação' where id = pg_temp.proc('laminado-ceramico');
  get diagnostics n = row_count;
  ok := ok and n = 0;
  update public.procedure_steps set active = false where id = pg_temp.etapa('laminado-ceramico', 'preparo');
  get diagnostics n = row_count;
  ok := ok and n = 0;
  update public.contents set title = 'coordenação' where id = c1;
  get diagnostics n = row_count;
  ok := ok and n = 0;
  update public.cohorts set name = 'coordenação' where id = '00000000-0000-4000-b000-0000000009a1';
  get diagnostics n = row_count;
  ok := ok and n = 0;
  begin
    insert into public.procedure_categories (name, slug) values ('Nova', 'nova-coord');
    ok := false;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.topics (name, slug, category_id) values ('Tema', 'tema-coord', (select id from public.categories limit 1));
    ok := false;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.contents (kind, title, slug, category_id) values ('link', 'x', 'coord-x', (select id from public.categories limit 1));
    ok := false;
  exception when insufficient_privilege then null;
  end;
  insert into resultados (teste, passou) values ('Coordenação não altera catálogo, Biblioteca, temas nem turmas', ok);
  insert into resultados (teste, passou) values ('Coordenação não lê o histórico interno (só admin)',
    not exists (select 1 from public.change_log where table_name like 'workflow%'));
  reset role;

  perform pg_temp.entrar(x);
  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('coroa-total'));
  exception when insufficient_privilege then ok := true;
  end;
  update public.workflows set summary = 'x' where id = w;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Coordenação de turma encerrada não edita', ok and n = 0 and not public.workflow_editor());
  reset role;
  perform pg_temp.entrar(y);
  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('coroa-total'));
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Coordenação com perfil desativado não edita nem lê',
    ok and not exists (select 1 from public.workflows));
  reset role;

  -- ── Histórico interno ──
  insert into resultados (teste, passou) values ('change_log registra quem alterou workflows, etapas, itens, próximos passos e conteúdos',
    (select count(distinct table_name) from public.change_log where table_name like 'workflow%') = 5
    and exists (select 1 from public.change_log where table_name = 'workflows' and actor = c and action = 'insert'));

  -- ── Procedimento desativado: some para o aluno sem apagar; reativado, volta ──
  update public.procedures set active = false where id = pg_temp.proc('laminado-ceramico');
  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Procedimento desativado: aluno não vê o workflow nem as etapas',
    not exists (select 1 from public.workflows where id = w) and not exists (select 1 from public.workflow_stages where workflow_id = w)
    and not exists (select 1 from public.workflow_stage_items where workflow_id = w));
  reset role;
  insert into resultados (teste, passou) values ('Procedimento desativado: workflow não é apagado nem despublicado',
    (select status from public.workflows where id = w) = 'publicado' and (select count(*) from public.workflow_stages where workflow_id = w) = 4);
  perform pg_temp.entrar(c);
  insert into resultados (teste, passou) values ('Procedimento desativado: coordenação continua vendo o workflow',
    exists (select 1 from public.workflows where id = w));
  ok := false;
  begin
    insert into public.workflows (procedure_id) values (pg_temp.proc('laminado-ceramico'));
  exception when check_violation or unique_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Procedimento desativado: não aceita workflow novo', ok);
  reset role;
  update public.procedures set active = true where id = pg_temp.proc('laminado-ceramico');
  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Procedimento reativado: workflow publicado volta a aparecer',
    exists (select 1 from public.workflows where id = w) and (select count(*) from public.workflow_stages where workflow_id = w) = 4);
  reset role;

  -- ── Arquivar, restaurar e excluir rascunho ──
  perform pg_temp.entrar(c);
  update public.workflows set status = 'arquivado' where id = w;
  insert into resultados (teste, passou) values ('Arquivar grava archived_at e libera o procedimento para novo workflow',
    (select archived_at is not null from public.workflows where id = w));
  insert into public.workflows (procedure_id) values (pg_temp.proc('laminado-ceramico')) returning id into w3;
  ok := false;
  begin
    update public.workflows set status = 'rascunho' where id = w;
  exception when unique_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Restaurar arquivado com outro ativo do mesmo procedimento é recusado', ok);
  delete from public.workflows where id = w3;
  update public.workflows set status = 'rascunho' where id = w;
  insert into resultados (teste, passou) values ('Despublicar/restaurar volta a rascunho (archived_at limpo, published_at mantido)',
    (select status = 'rascunho' and archived_at is null and published_at is not null from public.workflows where id = w));
  reset role;
  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Despublicado some para o aluno', not exists (select 1 from public.workflows where id = w));
  reset role;
  perform pg_temp.entrar(c);
  delete from public.workflows where id = w2;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Rascunho nunca publicado pode ser excluído (etapas vão junto)',
    n = 1 and not exists (select 1 from public.workflow_stages where id = sx));
  reset role;

  -- ── Limites ──
  perform pg_temp.entrar(adm);
  insert into public.workflows (procedure_id) values (pg_temp.proc('exodontia')) returning id into w2;
  for i in 1..15 loop
    insert into public.workflow_stages (workflow_id, name, slug, position) values (w2, 'Etapa ' || i, '', i);
  end loop;
  ok := false;
  begin
    insert into public.workflow_stages (workflow_id, name, slug) values (w2, 'Etapa 16', '');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Limite: 15 etapas por workflow', ok);
  select id into sx from public.workflow_stages where workflow_id = w2 and slug = 'etapa-1';
  for i in 1..30 loop
    insert into public.workflow_stage_items (stage_id, kind, text, position) values (sx, 'passo', 'Passo ' || i, i);
  end loop;
  ok := false;
  begin
    insert into public.workflow_stage_items (stage_id, kind, text) values (sx, 'passo', 'Passo 31');
  exception when check_violation then ok := true;
  end;
  insert into public.workflow_stage_items (stage_id, kind, text) values (sx, 'material', 'Material ainda cabe');
  insert into resultados (teste, passou) values ('Limite: 30 itens de cada tipo por etapa (conta por tipo)', ok);
  for i in 1..6 loop
    insert into public.workflow_stage_next (stage_id, note, position) values (sx, 'Orientação ' || i, i);
  end loop;
  ok := false;
  begin
    insert into public.workflow_stage_next (stage_id, note) values (sx, 'Orientação 7');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Limite: 6 próximos passos por etapa', ok);
  for i in 0..5 loop
    insert into public.workflow_stage_contents (stage_id, content_id, position) values (sx, ('00000000-0000-4000-e000-00000000091' || i)::uuid, i);
  end loop;
  ok := false;
  begin
    insert into public.workflow_stage_contents (stage_id, content_id) values (sx, '00000000-0000-4000-e000-000000000916');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Limite: 6 conteúdos por etapa', ok);
  ok := false;
  begin
    insert into public.workflow_stage_items (stage_id, kind, text) values (sx, 'atencao', repeat('x', 241));
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Limite: texto do item até 240 caracteres', ok);
  reset role;

  -- ── Checklist não existe no banco ──
  insert into resultados (teste, passou) values ('Checklist/progresso não fazem parte do banco (nenhuma coluna ou tabela de marcação)',
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name like 'workflow%'
        and column_name ~ '(check|progress|done|conclu|marc|percent|complete)'
    )
    and (select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'workflow%') = 5);

  -- ── Anônimo não lê nada ──
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  ok := false;
  begin
    perform count(*) from public.workflows;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Anônimo sem acesso às tabelas de workflow', ok);
  reset role;
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
