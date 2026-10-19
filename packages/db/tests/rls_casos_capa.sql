-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — foto de capa do caso (Etapa 6 · Parte 3): caminho dos arquivos e restrição da coluna.
-- As regras do bucket (storage) são testadas ponta a ponta no Supabase local (o Postgres do CI não tem storage).

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
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid');
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000e1', 'Turma Capa', 'teste-capa', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000e1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000000e1', 'aluno');

do $$
declare
  ok boolean;
  a constant uuid := '00000000-0000-4000-a000-00000000000a';
  b constant uuid := '00000000-0000-4000-a000-00000000000b';
  caso_a uuid;
  caso_b uuid;
begin
  perform pg_temp.entrar(a);
  insert into public.clinical_cases (cohort_id, patient_label) values ('00000000-0000-4000-b000-0000000000e1', 'A.A.') returning id into caso_a;
  reset role;
  perform pg_temp.entrar(b);
  insert into public.clinical_cases (cohort_id, patient_label) values ('00000000-0000-4000-b000-0000000000e1', 'B.B.') returning id into caso_b;
  reset role;

  insert into resultados (teste, passou) values ('Caminho do arquivo identifica o caso (capa e miniatura); fora do padrão → nulo',
    public.case_file_case(a || '/' || caso_a || '/1760900000000.webp') = caso_a
    and public.case_file_case(a || '/' || caso_a || '/1760900000000-mini.webp') = caso_a
    and public.case_file_case(a || '/' || caso_a || '/foto.jpg') is null
    and public.case_file_case('../' || caso_a || '/1760900000000.webp') is null
    and public.case_file_case(a || '/' || caso_a || '/1760900000000.webp/x') is null);

  perform pg_temp.entrar(a);
  update public.clinical_cases set cover_path = a || '/' || caso_a || '/1760900000000.webp', cover_updated_at = now() where id = caso_a;
  reset role;
  insert into resultados (teste, passou) values ('Dono grava a capa na pasta do próprio caso',
    (select cover_path like a || '/%' from public.clinical_cases where id = caso_a));

  ok := false;
  perform pg_temp.entrar(a);
  begin
    update public.clinical_cases set cover_path = b || '/' || caso_b || '/1760900000000.webp' where id = caso_a;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Capa não pode apontar para arquivo de outro caso ou de outra pessoa', ok);

  ok := false;
  perform pg_temp.entrar(a);
  begin
    update public.clinical_cases set cover_path = a || '/' || caso_a || '/1760900000000-mini.webp' where id = caso_a;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Capa guarda o arquivo principal (a miniatura é derivada)', ok);

  perform pg_temp.entrar(b);
  update public.clinical_cases set cover_path = null where id = caso_a;
  reset role;
  insert into resultados (teste, passou) values ('Colega não remove a capa do caso de outro aluno',
    (select cover_path is not null from public.clinical_cases where id = caso_a));
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
