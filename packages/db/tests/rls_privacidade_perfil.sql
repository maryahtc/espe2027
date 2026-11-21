-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Etapa 10 · Parte 3: as afirmações do texto "Quem vê o quê" do Perfil que ainda não tinham teste próprio
-- (perfil/nome, lista de materiais, produção agregada). Nenhuma regra nova: só confere as do banco. Transação desfeita.
-- Pessoas: A e B (alunos T1) · E (aluno T2) · C (coordena T1) · X (coordena T2) · D (admin).

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
  ('00000000-0000-4000-a000-00000000b00a', 'pa@teste.invalid'),
  ('00000000-0000-4000-a000-00000000b00b', 'pb@teste.invalid'),
  ('00000000-0000-4000-a000-00000000b00e', 'pe@teste.invalid'),
  ('00000000-0000-4000-a000-00000000b0c0', 'pc@teste.invalid'),
  ('00000000-0000-4000-a000-00000000b0e0', 'px@teste.invalid'),
  ('00000000-0000-4000-a000-00000000b0d0', 'pd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in ('00000000-0000-4000-a000-00000000b0c0', '00000000-0000-4000-a000-00000000b0e0');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000b0d0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-00000000b001', 'Turma Privacidade 1', 'teste-priv-1', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-00000000b002', 'Turma Privacidade 2', 'teste-priv-2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-00000000b00a', '00000000-0000-4000-b000-00000000b001', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000b00b', '00000000-0000-4000-b000-00000000b001', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000b00e', '00000000-0000-4000-b000-00000000b002', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000b0c0', '00000000-0000-4000-b000-00000000b001', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-00000000b0e0', '00000000-0000-4000-b000-00000000b002', 'coordenacao', 'ativa');
insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-00000000b001', '00000000-0000-4000-b000-00000000b001', 1, 1, 'Módulo privacidade', 'rascunho');
insert into public.module_materials (id, module_id, item) values
  ('00000000-0000-4000-a100-00000000b001', '00000000-0000-4000-d000-00000000b001', 'Kit de teste');
-- A marcou um item da lista de materiais (gravado direto, como a própria aluna faria).
insert into public.material_checks (user_id, material_id) values
  ('00000000-0000-4000-a000-00000000b00a', '00000000-0000-4000-a100-00000000b001');

do $$
declare
  n integer;
  a constant uuid := '00000000-0000-4000-a000-00000000b00a';
  b constant uuid := '00000000-0000-4000-a000-00000000b00b';
  e constant uuid := '00000000-0000-4000-a000-00000000b00e';
  c constant uuid := '00000000-0000-4000-a000-00000000b0c0';
  x constant uuid := '00000000-0000-4000-a000-00000000b0e0';
  adm constant uuid := '00000000-0000-4000-a000-00000000b0d0';
begin
  -- ── Nome e dados do perfil ──
  perform pg_temp.entrar(b);
  select count(*) into n from public.profiles where id = a;
  reset role;
  insert into resultados (teste, passou) values ('Perfil: colega da turma não vê o perfil (nome, e-mail) de outro aluno', n = 0);
  perform pg_temp.entrar(c);
  select count(*) into n from public.profiles where id in (a, b, e);
  reset role;
  insert into resultados (teste, passou) values ('Perfil: coordenação vê o perfil dos alunos da própria turma, não de outra', n = 2);
  perform pg_temp.entrar(x);
  select count(*) into n from public.profiles where id = a;
  reset role;
  insert into resultados (teste, passou) values ('Perfil: coordenação de outra turma não vê o perfil', n = 0);
  perform pg_temp.entrar(adm);
  select count(*) into n from public.profiles where id in (a, b, e);
  reset role;
  insert into resultados (teste, passou) values ('Perfil: Admin vê o perfil de todos os alunos', n = 3);

  -- ── Lista de materiais: só o próprio aluno ──
  perform pg_temp.entrar(a);
  select count(*) into n from public.material_checks;
  reset role;
  insert into resultados (teste, passou) values ('Materiais: o aluno vê a própria lista marcada', n = 1);
  perform pg_temp.entrar(b);
  select count(*) into n from public.material_checks;
  reset role;
  insert into resultados (teste, passou) values ('Materiais: colega não vê a lista marcada de outro aluno', n = 0);
  perform pg_temp.entrar(c);
  select count(*) into n from public.material_checks;
  reset role;
  insert into resultados (teste, passou) values ('Materiais: coordenação não vê a lista marcada do aluno', n = 0);
  perform pg_temp.entrar(adm);
  select count(*) into n from public.material_checks;
  reset role;
  insert into resultados (teste, passou) values ('Materiais: Admin não vê a lista marcada do aluno', n = 0);

  -- ── Matrículas: colega não lista a turma ──
  perform pg_temp.entrar(b);
  select count(*) into n from public.enrollments where user_id <> b;
  reset role;
  insert into resultados (teste, passou) values ('Turma: aluno não lista as matrículas dos colegas', n = 0);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
