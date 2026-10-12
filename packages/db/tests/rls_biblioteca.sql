-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Temas e Biblioteca (Etapa 4 · Parte 1). Transação desfeita no final, lista "ordem|teste|passou".
--
-- Pessoas: A aluno T1 · B aluno T2 · C coordenação T1 · D admin · E sem matrícula
-- Conteúdos: P1 publicado, todas as turmas, arquivo p1.pdf, tema Adesão · P2 publicado só T2 (arquivo p2.pdf)
--            P3 rascunho · P4 publicado, liberado no futuro · P5 publicado e depois arquivado

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;

create function pg_temp.entrar(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
end
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000e0', 'e@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;

insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000f1', 'Turma T1', 'teste-bib-t1', '2027-02-01', '2029-07-31'),
  ('00000000-0000-4000-b000-0000000000f2', 'Turma T2', 'teste-bib-t2', '2028-02-01', '2030-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000f1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000000f2', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000f1', 'coordenacao');

insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-0000000000f1', 1, 1, 'M1', 'publicado');
insert into public.faculty (id, full_name, display_name) values ('00000000-0000-4000-c000-0000000000f1', 'Docente Biblioteca Completo', 'Docente Bib');

insert into public.contents (id, kind, title, slug, description, category_id, file_path, status, available_from) values
  ('00000000-0000-4000-e000-000000000001', 'pdf', 'Protocolo de hibridização', 'teste-p1', 'Leitura de apoio.',
    (select id from public.categories where slug = 'materiais-e-adesao'), 'p1.pdf', 'publicado', null),
  ('00000000-0000-4000-e000-000000000002', 'artigo', 'Artigo só da T2', 'teste-p2', null,
    (select id from public.categories where slug = 'materiais-e-adesao'), 'p2.pdf', 'publicado', null),
  ('00000000-0000-4000-e000-000000000003', 'link', 'Rascunho secreto', 'teste-p3', null,
    (select id from public.categories where slug = 'gestao'), null, 'rascunho', null),
  ('00000000-0000-4000-e000-000000000004', 'pdf', 'Liberado depois', 'teste-p4', null,
    (select id from public.categories where slug = 'gestao'), null, 'publicado', now() + interval '30 days'),
  ('00000000-0000-4000-e000-000000000005', 'pdf', 'Arquivado', 'teste-p5', null,
    (select id from public.categories where slug = 'gestao'), null, 'publicado', null);
update public.contents set status = 'arquivado' where id = '00000000-0000-4000-e000-000000000005';
insert into public.content_cohorts (content_id, cohort_id) values ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-0000000000f2');
insert into public.content_topics (content_id, topic_id) values
  ('00000000-0000-4000-e000-000000000001', (select id from public.topics where slug = 'adesao')),
  ('00000000-0000-4000-e000-000000000002', (select id from public.topics where slug = 'adesao')),
  ('00000000-0000-4000-e000-000000000003', (select id from public.topics where slug = 'adesao'));
insert into public.content_faculty (content_id, faculty_id) values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-c000-0000000000f1');
insert into public.content_attachments (content_id, title, file_path) values ('00000000-0000-4000-e000-000000000001', 'Anexo', 'p1-anexo.pdf');
insert into public.module_contents (module_id, content_id, phase, requirement) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000001', 'antes', 'obrigatorio'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000003', 'antes', 'recomendado');

-- ── Taxonomia ──
do $$
declare n int; ok boolean;
begin
  select (select count(*) from public.categories where slug in ('diagnostico-e-documentacao', 'planejamento-e-odontologia-digital',
      'oclusao', 'materiais-e-adesao', 'dentistica-restauradora', 'protese-e-reabilitacao', 'gestao')) = 7
     and (select count(*) from public.topics t join public.topic_notes n on n.topic_id = t.id) >= 27
     and not exists (select 1 from public.topics where slug like '%inteligencia' and slug <> 'inteligencia-artificial-em-exames-de-imagem')
     and not exists (select 1 from public.topics where slug in ('mock-up', 'cimentacao-adesiva', 'selecao-de-cor', 'restauracoes-provisorias'))
     and not exists (select 1 from public.topics where slug = 'apresentacao-e-aceitacao-do-plano-de-tratamento' and 'venda' = any (synonyms))
    into ok;
  insert into resultados (teste, passou) values ('Taxonomia inicial: 7 áreas e 27 temas aprovados (sem pendentes nem descartados)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.topics;
  reset role;
  insert into resultados (teste, passou) values ('Aluno lê a lista de temas', n >= 27);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.topic_notes;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não vê a origem interna dos temas', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.topic_notes;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê a origem dos temas', n >= 27);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    insert into public.topics (category_id, name, slug) values ((select id from public.categories where slug = 'gestao'), 'Tema da coordenação', 'tema-coord');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só admin cria temas (coordenação não)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.topics (category_id, name, slug, synonyms) values ((select id from public.categories where slug = 'gestao'), 'Tema novo do admin', 'tema-novo-admin', array['sinonimo teste']);
  reset role;
  insert into resultados (teste, passou) values ('Admin cria tema novo pelo painel', exists (select 1 from public.topics where slug = 'tema-novo-admin'));
end
$$;

-- ── Quem vê cada conteúdo ──
do $$
declare v text; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(slug, ',' order by slug) into v from public.contents where slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Aluno T1 vê só o publicado, liberado e disponível para a turma dele', v = 'teste-p1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  select string_agg(slug, ',' order by slug) into v from public.contents where slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Conteúdo restrito a T2 aparece só para a T2', v = 'teste-p1,teste-p2');

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select string_agg(slug, ',' order by slug) into v from public.contents where slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê antes da data de liberação, mas não rascunho nem outra turma', v = 'teste-p1,teste-p4');

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select string_agg(slug, ',' order by slug) into v from public.contents where slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Admin vê tudo (inclusive rascunho e arquivado)', v = 'teste-p1,teste-p2,teste-p3,teste-p4,teste-p5');

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000e0');
  select count(*)::text into v from public.contents where slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Pessoa sem matrícula não vê a biblioteca', v = '0');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*)::text into v from public.module_contents;
  reset role;
  insert into resultados (teste, passou) values ('No módulo, aluno vê só o vínculo de conteúdo publicado', v = '1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select (select count(*) from public.content_topics ct join public.contents c on c.id = ct.content_id where c.slug like 'teste-p%') = 1
     and (select count(*) from public.content_attachments) = 1 into ok;
  reset role;
  insert into resultados (teste, passou) values ('Temas e anexos de conteúdo invisível também ficam invisíveis', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select public.library_file_readable('p1.pdf') and public.library_file_readable('p1-anexo.pdf') and not public.library_file_readable('p2.pdf') into ok;
  reset role;
  insert into resultados (teste, passou) values ('Arquivos: aluno abre só PDFs de conteúdo que pode ver', ok);

  ok := false;
  begin
    execute 'set local role anon';
    perform 1 from public.contents;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem login não lê a biblioteca', ok);

  -- desativado perde acesso
  update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-00000000000a';
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*)::text into v from public.contents where slug like 'teste-p%';
  reset role;
  update public.profiles set deactivated_at = null where id = '00000000-0000-4000-a000-00000000000a';
  insert into resultados (teste, passou) values ('Conta desativada perde a biblioteca na hora', v = '0');
end
$$;

-- ── Busca ──
do $$
declare v text;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(c.slug, ',') into v from public.search_library('ADESÃO') s join public.contents c on c.id = s.content_id where c.slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Busca sem acento e sem maiúsculas encontra pelo tema', v = 'teste-p1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(c.slug, ',') into v from public.search_library('sistema adesivo') s join public.contents c on c.id = s.content_id where c.slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Busca encontra pelo sinônimo do tema', v = 'teste-p1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(c.slug, ',') into v from public.search_library('hibrid') s join public.contents c on c.id = s.content_id where c.slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Busca por começo de palavra (título)', v = 'teste-p1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(c.slug, ',') into v from public.search_library('docente bib') s join public.contents c on c.id = s.content_id where c.slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Busca pelo professor', v = 'teste-p1');

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*)::text into v from public.search_library('artigo') s join public.contents c on c.id = s.content_id where c.slug in ('teste-p2', 'teste-p3');
  reset role;
  insert into resultados (teste, passou) values ('Busca nunca revela conteúdo que a pessoa não pode ver', v = '0');

  update public.topics set synonyms = synonyms || array['palavranova'] where slug = 'adesao';
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select string_agg(c.slug, ',') into v from public.search_library('palavranova') s join public.contents c on c.id = s.content_id where c.slug like 'teste-p%';
  reset role;
  insert into resultados (teste, passou) values ('Sinônimo novo no tema já vale na busca', v = 'teste-p1');
end
$$;

-- ── Progresso ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  insert into public.content_progress (content_id) values ('00000000-0000-4000-e000-000000000001');
  update public.content_progress set status = 'concluido' where content_id = '00000000-0000-4000-e000-000000000001';
  select completed_at is not null and percent = 100 into ok from public.content_progress where content_id = '00000000-0000-4000-e000-000000000001';
  reset role;
  insert into resultados (teste, passou) values ('Aluno marca como concluído (data e 100% pelo banco)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  update public.content_progress set status = 'iniciado' where content_id = '00000000-0000-4000-e000-000000000001';
  select completed_at is null into ok from public.content_progress where content_id = '00000000-0000-4000-e000-000000000001';
  update public.content_progress set status = 'concluido' where content_id = '00000000-0000-4000-e000-000000000001';
  reset role;
  insert into resultados (teste, passou) values ('Aluno desmarca a conclusão', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.content_progress (content_id) values ('00000000-0000-4000-e000-000000000002');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não registra progresso em conteúdo que não pode ver', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.content_progress (user_id, content_id) values ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-e000-000000000001');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém grava progresso em nome de outra pessoa', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  insert into public.content_progress (content_id) values ('00000000-0000-4000-e000-000000000002');
  select count(*) into n from public.content_progress;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê só o próprio progresso', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.content_progress where user_id = '00000000-0000-4000-a000-00000000000a';
  select n * 10 + count(*) into n from public.content_progress where user_id = '00000000-0000-4000-a000-00000000000b';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê o progresso individual da própria turma, não de outra', n = 10);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.content_progress set status = 'iniciado' where user_id = '00000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não altera progresso de aluno', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) into n from public.content_progress where user_id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b');
  reset role;
  insert into resultados (teste, passou) values ('Admin vê o progresso de todas as turmas', n = 2);
end
$$;

-- ── Escrita, exclusão, junção de temas e histórico ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.contents set title = 'invadido' where id = '00000000-0000-4000-e000-000000000001';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita conteúdo', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.contents set title = 'Protocolo de hibridização (revisado)' where id = '00000000-0000-4000-e000-000000000001';
  reset role;
  select exists (select 1 from public.change_log where content_id = '00000000-0000-4000-e000-000000000001' and action = 'update'
                  and actor = '00000000-0000-4000-a000-0000000000d0' and changes ? 'title') into ok;
  insert into resultados (teste, passou) values ('Alteração no conteúdo entra no histórico "de → para" com autor', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    delete from public.contents where id = '00000000-0000-4000-e000-000000000005';
  exception when raise_exception then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Conteúdo já publicado não pode ser excluído (só arquivado)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  delete from public.contents where id = '00000000-0000-4000-e000-000000000003';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Rascunho nunca publicado pode ser excluído', n = 1);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    perform public.merge_topics((select id from public.topics where slug = 'tema-novo-admin'), (select id from public.topics where slug = 'adesao'));
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só admin junta temas', ok);

  insert into public.content_topics (content_id, topic_id) values ('00000000-0000-4000-e000-000000000004', (select id from public.topics where slug = 'tema-novo-admin'));
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  perform public.merge_topics((select id from public.topics where slug = 'tema-novo-admin'), (select id from public.topics where slug = 'adesao'));
  reset role;
  select (select archived_at is not null and merged_into = (select id from public.topics where slug = 'adesao') from public.topics where slug = 'tema-novo-admin')
     and exists (select 1 from public.content_topics where content_id = '00000000-0000-4000-e000-000000000004' and topic_id = (select id from public.topics where slug = 'adesao'))
     and not exists (select 1 from public.content_topics where topic_id = (select id from public.topics where slug = 'tema-novo-admin'))
     and (select 'Tema novo do admin' = any (synonyms) and 'sinonimo teste' = any (synonyms) from public.topics where slug = 'adesao')
    into ok;
  insert into resultados (teste, passou) values ('Juntar temas: vínculos e sinônimos passam para o tema que fica; o outro é arquivado', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
