-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Etapa 10 · Parte 1: auditoria do acesso à produção individual (log_student_production_view) e as
-- permissões reais de leitura dos casos (fonte do texto de Privacidade do Perfil, Parte 3). Transação desfeita no final.
-- Pessoas: A e B (alunos T1) · I (aluno T1, matrícula inativa) · E (aluno T2) · C (coordena T1) · X (coordena T2)
--          · Y (coordena T1, perfil desativado) · Z (coordenação T1 com matrícula inativa) · S (supervisor, sem turma)
--          · D (admin).

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

-- Tudo, menos a própria auditoria: a função não pode tocar em mais nada.
create function pg_temp.resto() returns text language sql as $$
  select md5(string_agg(h, '|' order by h)) from (
    select 'clinical_cases:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) h from public.clinical_cases r
    union all select 'performed_procedures:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.performed_procedures r
    union all select 'case_plan_visits:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.case_plan_visits r
    union all select 'workflows:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.workflows r
    union all select 'enrollments:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.enrollments r
    union all select 'profiles:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.profiles r
    union all select 'change_log:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.change_log r
  ) x
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000a0a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-000000000a0b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-000000000a01', 'i@teste.invalid'),
  ('00000000-0000-4000-a000-000000000a0e', 'e@teste.invalid'),
  ('00000000-0000-4000-a000-000000000ac0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-000000000ae0', 'x@teste.invalid'),
  ('00000000-0000-4000-a000-000000000af0', 'y@teste.invalid'),
  ('00000000-0000-4000-a000-000000000a20', 'z@teste.invalid'),
  ('00000000-0000-4000-a000-000000000a50', 's@teste.invalid'),
  ('00000000-0000-4000-a000-000000000ad0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in
  ('00000000-0000-4000-a000-000000000ac0', '00000000-0000-4000-a000-000000000ae0', '00000000-0000-4000-a000-000000000af0', '00000000-0000-4000-a000-000000000a20');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000ad0';
update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-000000000af0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-000000000a01', 'Turma Auditoria 1', 'teste-aud-1', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-000000000a02', 'Turma Auditoria 2', 'teste-aud-2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-000000000a0a', '00000000-0000-4000-b000-000000000a01', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-000000000a0b', '00000000-0000-4000-b000-000000000a01', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-000000000a01', '00000000-0000-4000-b000-000000000a01', 'aluno', 'inativa'),
  ('00000000-0000-4000-a000-000000000a0e', '00000000-0000-4000-b000-000000000a02', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-000000000ac0', '00000000-0000-4000-b000-000000000a01', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-000000000ae0', '00000000-0000-4000-b000-000000000a02', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-000000000af0', '00000000-0000-4000-b000-000000000a01', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-000000000a20', '00000000-0000-4000-b000-000000000a01', 'coordenacao', 'inativa');

do $$
declare
  ok boolean;
  n integer;
  r record;
  fp text;
  a constant uuid := '00000000-0000-4000-a000-000000000a0a';
  b constant uuid := '00000000-0000-4000-a000-000000000a0b';
  i constant uuid := '00000000-0000-4000-a000-000000000a01';
  e constant uuid := '00000000-0000-4000-a000-000000000a0e';
  c constant uuid := '00000000-0000-4000-a000-000000000ac0';
  x constant uuid := '00000000-0000-4000-a000-000000000ae0';
  y constant uuid := '00000000-0000-4000-a000-000000000af0';
  z constant uuid := '00000000-0000-4000-a000-000000000a20';
  s constant uuid := '00000000-0000-4000-a000-000000000a50';
  adm constant uuid := '00000000-0000-4000-a000-000000000ad0';
  t1 constant uuid := '00000000-0000-4000-b000-000000000a01';
  t2 constant uuid := '00000000-0000-4000-b000-000000000a02';
  caso_a uuid;
  caso_a2 uuid;
  base integer;
  -- Linhas de auditoria desta função (como postgres, sem RLS).
  logs constant text := 'select count(*) from public.audit_log where action = ''aluno.producao.abrir''';
begin
  fp := pg_temp.resto();

  -- ── Coordenação ativa da turma: pode, e fica registrado ──
  perform pg_temp.entrar(c);
  ok := public.log_student_production_view(a, t1);
  reset role;
  select * into r from public.audit_log where action = 'aluno.producao.abrir' order by id desc limit 1;
  insert into resultados (teste, passou) values ('Coordenação ativa abre a produção de aluno da própria turma', ok);
  insert into resultados (teste, passou) values ('Auditoria: quem acessou, qual aluno, turma e horário',
    r.actor = c and r.entity = 'profiles' and r.entity_id = a and r.owner_id = a and r.cohort_id = t1 and r.at is not null);
  insert into resultados (teste, passou) values ('Auditoria sem dados clínicos nem identificadores de paciente (details vazio)',
    r.details = '{}'::jsonb);
  execute logs into base;

  -- ── Recusas: devolvem false e NÃO gravam nada ──
  perform pg_temp.entrar(c);
  ok := not public.log_student_production_view(e, t2);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Coordenação não abre aluno de outra turma (sem registro de auditoria)', ok and n = base);

  perform pg_temp.entrar(c);
  ok := not public.log_student_production_view(e, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Turma autorizada com aluno de outra turma é recusado (sem registro)', ok and n = base);

  perform pg_temp.entrar(c);
  ok := not public.log_student_production_view(x, t1) and not public.log_student_production_view(c, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Só alunos da turma: coordenação/não-matriculado recusados (sem registro)', ok and n = base);

  perform pg_temp.entrar(a);
  ok := not public.log_student_production_view(b, t1) and not public.log_student_production_view(a, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Aluno não abre a produção de colega nem usa a função para si (sem registro)', ok and n = base);

  perform pg_temp.entrar(y);
  ok := not public.log_student_production_view(a, t1);
  reset role;
  perform pg_temp.entrar(z);
  ok := ok and not public.log_student_production_view(a, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Coordenação desativada ou com matrícula inativa é recusada (sem registro)', ok and n = base);

  perform pg_temp.entrar(s);
  ok := not public.log_student_production_view(a, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Pessoa sem papel na turma é recusada (sem registro)', ok and n = base);

  perform pg_temp.entrar(c);
  ok := not public.log_student_production_view(null, t1) and not public.log_student_production_view(a, null);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Parâmetros vazios são recusados (sem registro)', ok and n = base);

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  ok := false;
  begin
    perform public.log_student_production_view(a, t1);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Visitante sem login não executa a função (sem registro)', ok and n = base);

  -- ── Admin e matrícula inativa ──
  perform pg_temp.entrar(adm);
  ok := public.log_student_production_view(e, t2) and public.log_student_production_view(i, t1);
  reset role;
  execute logs into n;
  insert into resultados (teste, passou) values ('Admin abre qualquer turma; aluno com matrícula inativa pertence à turma', ok and n = base + 2);

  -- ── Quem lê a auditoria (regra existente, sem mudança) ──
  perform pg_temp.entrar(c);
  select count(*) into n from public.audit_log where action = 'aluno.producao.abrir';
  insert into resultados (teste, passou) values ('Coordenação lê só a auditoria da própria turma', n = 2);
  reset role;
  perform pg_temp.entrar(a);
  select count(*) into n from public.audit_log;
  insert into resultados (teste, passou) values ('Aluno não lê a auditoria', n = 0);
  reset role;
  perform pg_temp.entrar(c);
  ok := false;
  begin
    insert into public.audit_log (actor, action, entity) values (c, 'aluno.producao.abrir', 'profiles');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém grava direto na auditoria (só a função)', ok);

  insert into resultados (teste, passou) values ('A função não altera nada além da auditoria', pg_temp.resto() = fp);

  -- ── Permissões reais de leitura dos casos (fonte do texto de Privacidade, Parte 3) ──
  perform pg_temp.entrar(a);
  insert into public.clinical_cases (cohort_id, patient_label) values (t1, 'P.V.') returning id into caso_a;
  insert into public.clinical_cases (cohort_id, patient_label) values (t1, 'Q.R.') returning id into caso_a2;
  insert into resultados (teste, passou) values ('Privacidade: o próprio aluno lê o caso', public.case_readable(caso_a));
  reset role;
  perform pg_temp.entrar(b);
  insert into resultados (teste, passou) values ('Privacidade: colega da turma NÃO lê o caso',
    not public.case_readable(caso_a) and not exists (select 1 from public.clinical_cases where id = caso_a));
  reset role;
  perform pg_temp.entrar(c);
  insert into resultados (teste, passou) values ('Privacidade: coordenação da turma lê o caso', public.case_readable(caso_a));
  reset role;
  perform pg_temp.entrar(x);
  insert into resultados (teste, passou) values ('Privacidade: coordenação de outra turma NÃO lê o caso', not public.case_readable(caso_a));
  reset role;
  perform pg_temp.entrar(adm);
  insert into resultados (teste, passou) values ('Privacidade: Admin lê o caso', public.case_readable(caso_a));
  insert into public.case_access_grants (case_id, grantee_id, reason) values (caso_a, s, 'Supervisão clínica do caso');
  insert into public.case_access_grants (case_id, grantee_id, reason, expires_at) values (caso_a2, s, 'Supervisão já encerrada', now() - interval '1 day');
  reset role;
  perform pg_temp.entrar(s);
  insert into resultados (teste, passou) values ('Privacidade: acesso excepcional só com autorização do Admin, enquanto vigente',
    public.case_readable(caso_a) and not public.case_readable(caso_a2));
  reset role;
  perform pg_temp.entrar(c);
  ok := false;
  begin
    insert into public.case_access_grants (case_id, grantee_id, reason) values (caso_a2, s, 'Coordenação tentando liberar');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Privacidade: só o Admin concede acesso excepcional (coordenação não)', ok);
  perform pg_temp.entrar(a);
  update public.clinical_cases set removed_at = now() where id = caso_a;
  reset role;
  perform pg_temp.entrar(c);
  insert into resultados (teste, passou) values ('Privacidade: caso excluído pelo aluno sai da vista da coordenação', not public.case_readable(caso_a));
  reset role;
  perform pg_temp.entrar(s);
  insert into resultados (teste, passou) values ('Privacidade: caso excluído sai também do acesso excepcional', not public.case_readable(caso_a));
  reset role;
  perform pg_temp.entrar(adm);
  insert into resultados (teste, passou) values ('Privacidade: Admin continua vendo o caso excluído (exclusão definitiva é dele)', public.case_readable(caso_a));
  reset role;
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
