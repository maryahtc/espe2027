-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Bloco A · Equipe operacional (ops_people + contatos) e o responsável das pendências.
-- Pessoas: A (aluno T1) · C (coordena T1) · D (admin). Transação desfeita no final.

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

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000d00a', 'oa@teste.invalid'),
  ('00000000-0000-4000-a000-00000000d0c0', 'oc@teste.invalid'),
  ('00000000-0000-4000-a000-00000000d0d0', 'od@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-00000000d0c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000d0d0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-00000000d001', 'Turma Operacional', 'teste-ops-1', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-00000000d00a', '00000000-0000-4000-b000-00000000d001', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000d0c0', '00000000-0000-4000-b000-00000000d001', 'coordenacao', 'ativa');
insert into public.faculty (id, full_name, display_name, kind) values
  ('00000000-0000-4000-e000-00000000d001', 'Docente Teste', 'Docente', 'docente');

do $$
declare
  ok boolean;
  n integer;
  v text;
  p uuid;
  t uuid;
  fac_antes text;
  a constant uuid := '00000000-0000-4000-a000-00000000d00a';
  c constant uuid := '00000000-0000-4000-a000-00000000d0c0';
  adm constant uuid := '00000000-0000-4000-a000-00000000d0d0';
  t1 constant uuid := '00000000-0000-4000-b000-00000000d001';
  doc constant uuid := '00000000-0000-4000-e000-00000000d001';
begin
  fac_antes := (select md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.faculty r);

  -- ── Cadastro (Admin) ──
  perform pg_temp.entrar(adm);
  insert into public.ops_people (name, role_title) values ('Marlon Teste', 'Compras') returning id into p;
  insert into public.ops_people_contacts (person_id, email, phone) values (p, 'marlon@teste.invalid', '+55 11 90000-0000');
  reset role;
  insert into resultados (teste, passou) values ('Admin cadastra pessoa da equipe operacional com contato', exists (select 1 from public.ops_people_contacts where person_id = p));
  insert into resultados (teste, passou) values ('Equipe operacional é independente do cadastro de docentes (faculty intocado)',
    (select md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.faculty r) = fac_antes);

  -- ── Coordenação: nome sim, contato não, sem editar ──
  perform pg_temp.entrar(c);
  select name into v from public.ops_people where id = p;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê o nome da pessoa operacional', v = 'Marlon Teste');
  perform pg_temp.entrar(c);
  select count(*) into n from public.ops_people_contacts;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não vê contatos da equipe operacional', n = 0);
  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.ops_people (name) values ('Cadastro pela coordenação');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cadastra pessoa operacional', ok);
  perform pg_temp.entrar(c);
  update public.ops_people set name = 'Alterado' where id = p;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita pessoa operacional', n = 0);
  perform pg_temp.entrar(c);
  select count(*) into n from public.change_log where table_name in ('ops_people', 'ops_people_contacts');
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não lê o histórico da equipe operacional (nem de contatos)', n = 0);

  -- ── Aluno, visitante e exclusão ──
  perform pg_temp.entrar(a);
  select count(*) into n from public.ops_people;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não vê a equipe operacional', n = 0);
  ok := false;
  begin
    set local role anon;
    perform 1 from public.ops_people limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem acesso à equipe operacional', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    delete from public.ops_people where id = p;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém exclui pessoa operacional (desativar)', ok);
  perform pg_temp.entrar(adm);
  update public.ops_people set active = false where id = p;
  update public.ops_people set active = true where id = p;
  reset role;
  insert into resultados (teste, passou) values ('Histórico guarda as alterações (só Admin lê)',
    (select count(*) from public.change_log where table_name = 'ops_people' and row_id = p::text) >= 3);

  -- ── Fora das telas acadêmicas e do site público ──
  insert into resultados (teste, passou) values ('Não aparece nas visões do site público',
    not exists (select 1 from public.public_teachers where display_name = 'Marlon Teste'));

  -- ── Responsável das pendências ──
  perform pg_temp.entrar(c);
  insert into public.admin_tasks (title, cohort_id, category, responsible_ops_id) values ('Comprar kits', t1, 'materiais', p) returning id into t;
  reset role;
  insert into resultados (teste, passou) values ('Pendência com responsável da equipe operacional', (select responsible_ops_id from public.admin_tasks where id = t) = p);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.admin_tasks set responsible_id = doc where id = t;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Responsável é acadêmico OU operacional, nunca os dois', ok);
  perform pg_temp.entrar(c);
  update public.admin_tasks set responsible_ops_id = null, responsible_id = doc where id = t;
  reset role;
  insert into resultados (teste, passou) values ('Trocar para responsável acadêmico funciona',
    (select responsible_id = doc and responsible_ops_id is null from public.admin_tasks where id = t));
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
