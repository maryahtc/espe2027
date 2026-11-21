-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Bloco A · B2: quadro de pendências (admin_tasks). Permissões por papel e turma, consistência e histórico.
-- Transação desfeita no final.
-- Pessoas: A (aluno T1) · C (coordena T1) · X (coordena T2) · Y (coordena T1, perfil desativado) · Z (coordenação T1,
--          matrícula inativa) · D (admin). Equipe sem login: R (apoio).

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

-- Tudo o que já existia antes: a tabela nova não pode mexer em nada disso.
create function pg_temp.resto() returns text language sql as $$
  select md5(string_agg(h, '|' order by h)) from (
    select 'modules:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) h from public.modules r
    union all select 'module_sessions:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.module_sessions r
    union all select 'module_staff:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.module_staff r
    union all select 'faculty:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.faculty r
    union all select 'enrollments:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.enrollments r
    union all select 'profiles:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.profiles r
  ) x
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000c00a', 'ta@teste.invalid'),
  ('00000000-0000-4000-a000-00000000c0c0', 'tc@teste.invalid'),
  ('00000000-0000-4000-a000-00000000c0e0', 'tx@teste.invalid'),
  ('00000000-0000-4000-a000-00000000c0f0', 'ty@teste.invalid'),
  ('00000000-0000-4000-a000-00000000c020', 'tz@teste.invalid'),
  ('00000000-0000-4000-a000-00000000c0d0', 'td@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in
  ('00000000-0000-4000-a000-00000000c0c0', '00000000-0000-4000-a000-00000000c0e0', '00000000-0000-4000-a000-00000000c0f0', '00000000-0000-4000-a000-00000000c020');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000c0d0';
update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-00000000c0f0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-00000000c001', 'Turma Pendências 1', 'teste-pend-1', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-00000000c002', 'Turma Pendências 2', 'teste-pend-2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-00000000c00a', '00000000-0000-4000-b000-00000000c001', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000c0c0', '00000000-0000-4000-b000-00000000c001', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-00000000c0e0', '00000000-0000-4000-b000-00000000c002', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-00000000c0f0', '00000000-0000-4000-b000-00000000c001', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-00000000c020', '00000000-0000-4000-b000-00000000c001', 'coordenacao', 'inativa');
insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-00000000c001', '00000000-0000-4000-b000-00000000c001', 1, 1, 'Módulo T1', 'rascunho'),
  ('00000000-0000-4000-d000-00000000c002', '00000000-0000-4000-b000-00000000c002', 1, 1, 'Módulo T2', 'rascunho');
insert into public.faculty (id, full_name, display_name, kind) values
  ('00000000-0000-4000-e000-00000000c001', 'Responsável Sem Login', 'Responsável', 'apoio');

do $$
declare
  ok boolean;
  n integer;
  fp text;
  t_geral uuid;
  t_t1 uuid;
  t_t2 uuid;
  t_mod uuid;
  r record;
  a constant uuid := '00000000-0000-4000-a000-00000000c00a';
  c constant uuid := '00000000-0000-4000-a000-00000000c0c0';
  x constant uuid := '00000000-0000-4000-a000-00000000c0e0';
  y constant uuid := '00000000-0000-4000-a000-00000000c0f0';
  z constant uuid := '00000000-0000-4000-a000-00000000c020';
  adm constant uuid := '00000000-0000-4000-a000-00000000c0d0';
  t1 constant uuid := '00000000-0000-4000-b000-00000000c001';
  t2 constant uuid := '00000000-0000-4000-b000-00000000c002';
  m1 constant uuid := '00000000-0000-4000-d000-00000000c001';
  m2 constant uuid := '00000000-0000-4000-d000-00000000c002';
  resp constant uuid := '00000000-0000-4000-e000-00000000c001';
begin
  fp := pg_temp.resto();

  -- ── Admin ──
  perform pg_temp.entrar(adm);
  insert into public.admin_tasks (title, category, priority) values ('Buscar parceiros para materiais', 'parceiros', 'alta') returning id into t_geral;
  insert into public.admin_tasks (title, cohort_id, category, responsible_id, due_date)
    values ('Fechar cronograma da turma 1', t1, 'academico', resp, '2026-12-01') returning id into t_t1;
  insert into public.admin_tasks (title, cohort_id, category) values ('Mocho para a turma 2', t2, 'equipamentos') returning id into t_t2;
  select count(*) into n from public.admin_tasks where id in (t_geral, t_t1, t_t2);
  reset role;
  insert into resultados (teste, passou) values ('Admin cria pendências gerais e de qualquer turma', n = 3);
  insert into resultados (teste, passou) values ('Responsável pode ser pessoa da equipe sem login',
    (select responsible_id from public.admin_tasks where id = t_t1) = resp);
  insert into resultados (teste, passou) values ('Quem criou fica registrado',
    (select created_by from public.admin_tasks where id = t_geral) = adm);

  -- ── Coordenação da turma 1 ──
  perform pg_temp.entrar(c);
  select count(*) into n from public.admin_tasks where id in (t_geral, t_t1, t_t2);
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê só as pendências da própria turma (nem gerais, nem de outra turma)', n = 1);
  perform pg_temp.entrar(c);
  insert into public.admin_tasks (title, module_id, category, quantity_needed, quantity_available)
    values ('Kit de isolamento do módulo', m1, 'materiais', 12, 4) returning id into t_mod;
  reset role;
  insert into resultados (teste, passou) values ('Pendência com módulo recebe a turma do módulo automaticamente',
    (select cohort_id from public.admin_tasks where id = t_mod) = t1);
  perform pg_temp.entrar(c);
  update public.admin_tasks set status = 'em_andamento', next_action = 'Pedir orçamento' where id = t_t1;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação edita pendência da própria turma', n = 1);

  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.admin_tasks (title) values ('Geral pela coordenação');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria pendência geral (sem turma)', ok);

  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.admin_tasks (title, cohort_id) values ('Na outra turma', t2);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria pendência em outra turma', ok);

  perform pg_temp.entrar(c);
  update public.admin_tasks set title = 'invasão' where id in (t_t2, t_geral);
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita pendência de outra turma nem geral', n = 0);

  ok := false;
  perform pg_temp.entrar(c);
  begin
    update public.admin_tasks set cohort_id = t2 where id = t_t1;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não move pendência para turma que não coordena', ok);

  perform pg_temp.entrar(c);
  delete from public.admin_tasks where id = t_t1;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não exclui (cancela em vez disso)', n = 0 and exists (select 1 from public.admin_tasks where id = t_t1));

  -- ── Coordenação de outra turma, desativada, com matrícula inativa ──
  perform pg_temp.entrar(x);
  select count(*) into n from public.admin_tasks where cohort_id = t1 or cohort_id is null;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação de outra turma não vê nada da turma 1 nem as gerais', n = 0);
  perform pg_temp.entrar(y);
  select count(*) into n from public.admin_tasks;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação com perfil desativado não vê nada', n = 0);
  perform pg_temp.entrar(z);
  select count(*) into n from public.admin_tasks;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação com matrícula inativa não vê nada', n = 0);

  -- ── Aluno e visitante ──
  perform pg_temp.entrar(a);
  select count(*) into n from public.admin_tasks;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não vê nenhuma pendência (nem as da própria turma)', n = 0);
  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.admin_tasks (title, cohort_id) values ('Aluno tentando', t1);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não cria pendência', ok);
  ok := false;
  begin
    set local role anon;
    perform 1 from public.admin_tasks limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante (anon) sem acesso à tabela', ok);

  -- ── Consistência ──
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    insert into public.admin_tasks (title, cohort_id, module_id) values ('Módulo de outra turma', t1, m2);
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Módulo precisa ser da turma da pendência', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.admin_tasks set depends_on_id = id where id = t_t1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Pendência não depende dela mesma', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.admin_tasks set depends_on_id = t_t2 where id = t_t1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Dependência só entre pendências da mesma turma', ok);
  perform pg_temp.entrar(c);
  update public.admin_tasks set depends_on_id = t_t1 where id = t_mod;
  reset role;
  insert into resultados (teste, passou) values ('Dependência na mesma turma é aceita', (select depends_on_id from public.admin_tasks where id = t_mod) = t_t1);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    insert into public.admin_tasks (title, link_url) values ('Link inseguro', 'http://exemplo.org');
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Link só https', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    insert into public.admin_tasks (title, quantity_needed) values ('Quantidade negativa', -1);
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Quantidade não negativa', ok);

  -- Conclusão: data preenchida ao concluir, limpa ao reabrir
  perform pg_temp.entrar(c);
  update public.admin_tasks set status = 'concluida' where id = t_t1;
  reset role;
  insert into resultados (teste, passou) values ('Concluir preenche a data de conclusão',
    (select completed_at is not null from public.admin_tasks where id = t_t1));
  perform pg_temp.entrar(c);
  update public.admin_tasks set status = 'aberta' where id = t_t1;
  reset role;
  insert into resultados (teste, passou) values ('Reabrir limpa a data de conclusão',
    (select completed_at is null from public.admin_tasks where id = t_t1));
  ok := false;
  perform pg_temp.entrar(c);
  update public.admin_tasks set created_by = c where id = t_t1;
  reset role;
  insert into resultados (teste, passou) values ('Autoria original não pode ser trocada; última alteração registra quem editou',
    (select created_by = adm and updated_by = c from public.admin_tasks where id = t_t1));

  -- ── Histórico e exclusão pelo Admin ──
  insert into resultados (teste, passou) values ('Histórico registra criação e alterações (change_log), com a turma',
    (select count(*) from public.change_log where table_name = 'admin_tasks' and row_id = t_t1::text) >= 4
    and (select bool_and(cohort_id = t1) from public.change_log where table_name = 'admin_tasks' and row_id = t_t1::text));
  perform pg_temp.entrar(adm);
  delete from public.admin_tasks where id = t_t2;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Admin exclui pendência', n = 1);
  perform pg_temp.entrar(adm);
  delete from public.admin_tasks where id = t_t1;
  reset role;
  insert into resultados (teste, passou) values ('Excluir uma pendência de que outra depende só desfaz o vínculo',
    (select depends_on_id is null from public.admin_tasks where id = t_mod));

  insert into resultados (teste, passou) values ('O quadro não altera módulos, atividades, equipes, docentes, matrículas nem perfis', pg_temp.resto() = fp);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
