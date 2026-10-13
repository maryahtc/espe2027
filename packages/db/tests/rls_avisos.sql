-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — avisos (Etapa 5 · Parte 2).
-- Mesmo formato dos demais: transação desfeita no final, lista "ordem|teste|passou".
--
-- Turmas: T1 · T2
-- Pessoas: A (aluno T1) · B (aluno T2) · C (coordena T1) · D (admin)
-- As datas são relativas a sp_today() (hoje em São Paulo), para o teste valer em qualquer dia.

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

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;

insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000a1', 'Turma Avisos T1', 'teste-av-t1', '2027-02-01', '2029-07-31'),
  ('00000000-0000-4000-b000-0000000000a2', 'Turma Avisos T2', 'teste-av-t2', '2028-02-01', '2030-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000a1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000000a2', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000a1', 'coordenacao');

do $$
declare
  ok boolean;
  n integer;
  t1 constant uuid := '00000000-0000-4000-b000-0000000000a1';
  t2 constant uuid := '00000000-0000-4000-b000-0000000000a2';
  hoje constant date := public.sp_today();
  v_id uuid;
begin
  -- ── Quem cria ──
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.announcements (id, cohort_id, title, body, visible_from, visible_until, status)
  values ('00000000-0000-4000-9000-000000000001', null, 'Todas', 'Para todas as turmas', hoje - 1, hoje + 5, 'publicado');
  insert into public.announcements (id, cohort_id, title, body, visible_from, visible_until, status)
  values ('00000000-0000-4000-9000-000000000002', t2, 'Só T2', 'Aviso da T2', hoje, hoje + 5, 'publicado');
  reset role;
  insert into resultados (teste, passou) values ('Admin cria aviso para todas as turmas e para qualquer turma',
    (select count(*) from public.announcements where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002')) = 2);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  insert into public.announcements (id, cohort_id, title, body, visible_from, visible_until, status, important)
  values
    ('00000000-0000-4000-9000-000000000011', t1, 'Comum T1', 'Aviso comum', hoje, hoje + 3, 'publicado', false),
    ('00000000-0000-4000-9000-000000000012', t1, 'Importante T1', 'Aviso importante', hoje, hoje + 3, 'publicado', true),
    ('00000000-0000-4000-9000-000000000013', t1, 'Rascunho T1', 'Ainda não', hoje, hoje + 3, 'rascunho', false),
    ('00000000-0000-4000-9000-000000000014', t1, 'Futuro T1', 'Semana que vem', hoje + 7, hoje + 9, 'publicado', false),
    ('00000000-0000-4000-9000-000000000015', t1, 'Vencido T1', 'Já passou', hoje - 9, hoje - 1, 'publicado', false),
    ('00000000-0000-4000-9000-000000000016', t1, 'Arquivado T1', 'Saiu', hoje, hoje + 3, 'arquivado', false);
  reset role;
  insert into resultados (teste, passou) values ('Coordenação cria avisos para a própria turma',
    (select count(*) from public.announcements where cohort_id = t1) = 6);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    insert into public.announcements (cohort_id, title, body, visible_from, visible_until) values (t2, 'Invasão', 'x', hoje, hoje);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria aviso para outra turma', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    insert into public.announcements (cohort_id, title, body, visible_from, visible_until) values (null, 'Para todas', 'x', hoje, hoje);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria aviso "para todas as turmas"', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    update public.announcements set cohort_id = t2 where id = '00000000-0000-4000-9000-000000000011';
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não move um aviso para outra turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.announcements set title = 'Editado pela coordenação' where id = '00000000-0000-4000-9000-000000000002';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita aviso de outra turma',
    n = 0 and (select title from public.announcements where id = '00000000-0000-4000-9000-000000000002') = 'Só T2');

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.announcements (cohort_id, title, body, visible_from, visible_until) values (t1, 'Do aluno', 'x', hoje, hoje);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não cria aviso', ok);

  ok := false;
  begin
    insert into public.announcements (cohort_id, title, body, visible_from, visible_until) values (t1, 'Datas', 'x', hoje, hoje - 1);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('"Exibir até" não pode ser antes de "exibir de"', ok);

  ok := false;
  begin
    insert into public.announcements (cohort_id, title, body, visible_from, visible_until, link_url) values (t1, 'Link', 'x', hoje, hoje, 'javascript:alert(1)');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Link só https:// ou caminho do portal', ok);

  -- ── Quem vê ──
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.announcements;
  select coalesce(array_agg(title order by title) = array['Comum T1', 'Importante T1', 'Todas'], false) into ok from public.announcements;
  reset role;
  insert into resultados (teste, passou) values
    ('Aluno vê só os publicados da sua turma e os "para todas", dentro do período', ok and n = 3);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  select coalesce(array_agg(title order by title) = array['Só T2', 'Todas'], false) into ok from public.announcements;
  reset role;
  insert into resultados (teste, passou) values ('Aluno de outra turma não vê os avisos da T1', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.announcements where cohort_id = t1;
  select count(*) = 0 into ok from public.announcements where cohort_id = t2;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê tudo da própria turma (rascunho, futuro, vencido, arquivado), nada da T2', n = 6 and ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) into n from public.announcements where id::text like '00000000-0000-4000-9000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin vê todos os avisos', n = 8);

  ok := false;
  perform pg_temp.visitante();
  begin
    perform 1 from public.announcements;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem login não lê avisos', ok);

  -- ── "Entendi" ──
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  insert into public.announcement_dismissals (announcement_id) values ('00000000-0000-4000-9000-000000000011');
  reset role;
  insert into resultados (teste, passou) values ('Aluno usa "Entendi" num aviso comum',
    exists (select 1 from public.announcement_dismissals where user_id = '00000000-0000-4000-a000-00000000000a' and announcement_id = '00000000-0000-4000-9000-000000000011'));

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.announcement_dismissals (announcement_id) values ('00000000-0000-4000-9000-000000000012');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aviso importante não pode ser dispensado', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.announcement_dismissals (announcement_id) values ('00000000-0000-4000-9000-000000000002');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não dispensa aviso que não pode ver (outra turma)', ok);

  ok := false;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.announcement_dismissals (user_id, announcement_id) values ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-9000-000000000001');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém grava "Entendi" em nome de outra pessoa', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  insert into public.announcement_dismissals (announcement_id) values ('00000000-0000-4000-9000-000000000001');
  select count(*) into n from public.announcement_dismissals;
  reset role;
  insert into resultados (teste, passou) values ('Cada aluno vê só os próprios "Entendi"', n = 1);

  -- ── Ciclo de vida e histórico ──
  insert into resultados (teste, passou) values ('Publicar carimba a data de publicação',
    (select published_at is not null from public.announcements where id = '00000000-0000-4000-9000-000000000011')
    and (select published_at is null from public.announcements where id = '00000000-0000-4000-9000-000000000013'));

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  delete from public.announcements where id = '00000000-0000-4000-9000-000000000011';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Aviso que já foi publicado não é apagado (só arquivado)',
    n = 0 and exists (select 1 from public.announcements where id = '00000000-0000-4000-9000-000000000011'));

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  delete from public.announcements where id = '00000000-0000-4000-9000-000000000013';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Rascunho que nunca foi ao ar pode ser excluído', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.announcements set status = 'arquivado' where id = '00000000-0000-4000-9000-000000000012';
  reset role;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) = 0 into ok from public.announcements where id = '00000000-0000-4000-9000-000000000012';
  reset role;
  insert into resultados (teste, passou) values ('Arquivar tira o aviso da vista do aluno na hora',
    ok and (select archived_at is not null from public.announcements where id = '00000000-0000-4000-9000-000000000012'));

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.change_log
   where table_name = 'announcements' and row_id = '00000000-0000-4000-9000-000000000012';
  select count(*) = 0 into ok from public.change_log
   where table_name = 'announcements' and row_id = '00000000-0000-4000-9000-000000000002';
  reset role;
  insert into resultados (teste, passou) values ('Histórico registra criação e alteração; coordenação vê só o da própria turma', n = 2 and ok);

  insert into resultados (teste, passou) values ('Histórico guarda quem fez a alteração ("de → para")',
    exists (select 1 from public.change_log where table_name = 'announcements' and row_id = '00000000-0000-4000-9000-000000000012'
            and action = 'update' and actor = '00000000-0000-4000-a000-0000000000c0'
            and changes -> 'status' ->> 'para' = 'arquivado'));
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
