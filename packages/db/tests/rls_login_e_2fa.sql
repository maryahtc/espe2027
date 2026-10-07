-- Testes de isolamento — Etapa 2 · Parte 2 (login, convites e 2FA).
-- Mesmo formato de rls_pessoas_e_acesso.sql: transação desfeita no final, lista "ordem|teste|passou".
--
-- Pessoas de teste:  A aluno da Turma 2027 · C coordenação da Turma 2027 · D admin
-- Sessões: aal1 = só senha · aal2 = senha + código do aplicativo autenticador

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;

create function pg_temp.entrar(p_uid uuid, p_aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
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
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal2');
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

-- C e D têm 2FA configurado.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  (gen_random_uuid(), '00000000-0000-4000-a000-0000000000c0', 'teste-c', 'totp', 'verified', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-a000-0000000000d0', 'teste-d', 'totp', 'verified', now(), now());

-- ── Situação do próprio 2FA ──
do $$
declare c boolean; a boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0', 'aal1');
  select public.my_mfa_enrolled() into c;
  reset role;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a', 'aal1');
  select public.my_mfa_enrolled() into a;
  reset role;
  insert into resultados (teste, passou) values ('Cada pessoa sabe só se ela mesma tem 2FA configurado', c and not a);
end
$$;

-- ── Admin sem 2FA (só senha) ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal1');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin sem 2FA vê só o próprio perfil', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal1');
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000000a';
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Admin sem 2FA não altera papéis', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal1');
  begin
    insert into public.cohorts (name, slug, starts_on, ends_on) values ('X', 'x-sem-2fa', '2027-01-01', '2027-12-31');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Admin sem 2FA não cria turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal1');
  begin
    perform public.admin_people();
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Admin sem 2FA não abre a lista de pessoas', ok);
end
$$;

-- ── Coordenação sem 2FA ──
do $$
declare n int; m int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0', 'aal1');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  select count(*) into m from public.enrollments where user_id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou)
  values ('Coordenação sem 2FA não vê perfis nem matrículas da turma (só os próprios)', n = 1 and m = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0', 'aal2');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação com 2FA vê os perfis da turma', n = 2);
end
$$;

-- ── Aluno: 2FA opcional ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a', 'aal1');
  select count(*) into n from public.cohorts where slug = 'turma-2027';
  reset role;
  insert into resultados (teste, passou) values ('Aluno sem 2FA usa o portal normalmente (vê a própria turma)', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a', 'aal2');
  begin
    perform public.admin_people();
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno, mesmo com 2FA, não abre a lista de pessoas', ok);
end
$$;

-- ── Admin com 2FA ──
do $$
declare n int; ok boolean; mfa_c boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal2');
  select count(*), bool_and(email is not null) into n, ok
    from public.admin_people() where id::text like '00000000-0000-4000-a000-%';
  select has_mfa into mfa_c from public.admin_people() where id = '00000000-0000-4000-a000-0000000000c0';
  reset role;
  insert into resultados (teste, passou)
  values ('Admin com 2FA vê a lista de pessoas com e-mail e situação do 2FA', n = 3 and ok and mfa_c);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal2');
  perform public.admin_reset_mfa('00000000-0000-4000-a000-0000000000c0');
  reset role;
  select count(*) into n from auth.mfa_factors where user_id = '00000000-0000-4000-a000-0000000000c0';
  insert into resultados (teste, passou) values ('Admin redefine o 2FA de outra pessoa (celular perdido)', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0', 'aal2');
  begin
    perform public.admin_reset_mfa('00000000-0000-4000-a000-0000000000d0');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Admin não redefine o próprio 2FA pelo painel', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a', 'aal2');
  begin
    perform public.admin_reset_mfa('00000000-0000-4000-a000-0000000000d0');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não redefine o 2FA de ninguém', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
