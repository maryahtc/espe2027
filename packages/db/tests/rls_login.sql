-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes de isolamento — login e primeiro admin (Etapa 2 · Parte 2, sem 2FA desde 07/10/2026).
-- Todos os perfis entram só com e-mail e senha (sessão aal1). Os poderes vêm do papel e da matrícula.
-- Mesmo formato dos demais: transação desfeita no final, lista "ordem|teste|passou".
--
-- Pessoas de teste:  A aluno da Turma 2027 · C coordenação da Turma 2027 · D admin

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;

-- Sessão de login comum (só e-mail e senha).
create function pg_temp.entrar(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
end
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'aluno.a@teste.invalid', '{"full_name":"Aluno A"}'),
  ('00000000-0000-4000-a000-0000000000c0', 'coord.c@teste.invalid', '{"full_name":"Coordenação C"}'),
  ('00000000-0000-4000-a000-0000000000d0', 'admin.d@teste.invalid', '{"full_name":"Admin D"}');

insert into public.enrollments (user_id, cohort_id, role_in_cohort)
select u, (select id from public.cohorts where slug = 'turma-2027'), r::public.cohort_role
from (values ('00000000-0000-4000-a000-00000000000a'::uuid, 'aluno'),
             ('00000000-0000-4000-a000-0000000000c0'::uuid, 'coordenacao')) v(u, r);
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';

-- ── Primeiro admin ──
-- Simula um projeto sem admin (só dentro desta transação) para testar a criação do primeiro.
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where role = 'admin';
alter table public.profiles enable trigger profiles_guard;

do $$
declare ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    perform public.bootstrap_first_admin('admin.d@teste.invalid');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Usuário logado não consegue usar a criação do primeiro admin', ok);
end
$$;

do $$
declare ok boolean;
begin
  perform public.bootstrap_first_admin('  ADMIN.D@teste.invalid ');
  select role = 'admin' into ok from public.profiles where id = '00000000-0000-4000-a000-0000000000d0';
  insert into resultados (teste, passou) values ('Dono do banco cria o primeiro admin a partir do e-mail', ok);
  begin
    perform public.bootstrap_first_admin('aluno.a@teste.invalid');
    ok := false;
  exception when raise_exception then ok := true;
  end;
  insert into resultados (teste, passou) values ('Com um admin já existente, a criação do primeiro admin é recusada', ok);
end
$$;

-- ── Admin, só com e-mail e senha ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin (só senha) vê todos os perfis', n = 3);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) = 3 and bool_and(email is not null) into ok
    from public.admin_people() where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin (só senha) abre a lista de pessoas com e-mail', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.cohorts (name, slug, starts_on, ends_on) values ('Turma teste', 'teste-sem-2fa', '2028-01-01', '2030-01-01');
  update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Admin (só senha) cria turma e altera papéis', n = 1);
  update public.profiles set role = 'aluno' where id = '00000000-0000-4000-a000-00000000000a';
end
$$;

-- ── Coordenação, só com e-mail e senha ──
do $$
declare n int; m int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  select count(*) into m from public.enrollments where user_id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou)
  values ('Coordenação (só senha) vê perfis e matrículas da própria turma (não o admin)', n = 2 and m = 2);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    perform public.admin_people();
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não abre a lista de pessoas do admin', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000c0';
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não consegue se promover a admin', ok);
end
$$;

-- ── Aluno, só com e-mail e senha ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.cohorts where slug = 'turma-2027';
  reset role;
  insert into resultados (teste, passou) values ('Aluno (só senha) usa o portal normalmente (vê a própria turma)', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    perform public.admin_people();
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não abre a lista de pessoas', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê só o próprio perfil', n = 1);
end
$$;

-- ── Funções do 2FA não existem mais ──
insert into resultados (teste, passou)
select 'Funções de 2FA removidas do banco (has_mfa, my_mfa_enrolled, admin_reset_mfa)',
       not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                    where s.nspname = 'public' and p.proname in ('has_mfa', 'my_mfa_enrolled', 'admin_reset_mfa'));

select ordem, teste, passou from resultados order by ordem;

rollback;
