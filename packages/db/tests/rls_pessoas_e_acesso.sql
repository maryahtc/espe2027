-- Testes de isolamento — Etapa 2 · Parte 1 (pessoas e acesso).
-- Roda inteiro numa transação desfeita no final: não deixa nenhum dado, nem no banco local nem no Supabase.
-- Cada teste entra como um usuário (papel authenticated + JWT simulado), tenta a ação e registra o resultado.
-- A última consulta devolve a lista de testes com passou = true/false.
--
-- Pessoas de teste:
--   A, B  alunos da Turma 2027      X  aluno de outra turma      N  conta nova, sem matrícula
--   C     coordenação da Turma 2027 D  admin

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;

create function pg_temp.entrar(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
end
$$;

-- ── Massa de teste (como dono do banco) ──
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'aluno.a@teste.invalid', '{"full_name":"Aluno A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'aluno.b@teste.invalid', '{"full_name":"Aluno B"}'),
  ('00000000-0000-4000-a000-0000000000c0', 'coord.c@teste.invalid', '{"full_name":"Coordenação C"}'),
  ('00000000-0000-4000-a000-0000000000d0', 'admin.d@teste.invalid', '{"full_name":"Admin D", "role":"admin"}'),
  ('00000000-0000-4000-a000-0000000000e0', 'aluno.x@teste.invalid', '{"full_name":"Aluno X"}'),
  ('00000000-0000-4000-a000-0000000000f0', 'nova.n@teste.invalid', '{}');

insert into resultados (teste, passou)
select 'Conta nova ganha perfil de aluno automaticamente (mesmo pedindo "admin" nos metadados)',
       (select count(*) from public.profiles
         where id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-0000000000d0',
                      '00000000-0000-4000-a000-0000000000f0') and role = 'aluno') = 3
   and (select full_name from public.profiles where id = '00000000-0000-4000-a000-00000000000a') = 'Aluno A';

-- Rebaixa admins reais (se houver) só dentro desta transação, para o teste do "último admin" ser determinístico.
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
update public.profiles set role = 'coordenacao' where role = 'admin' and id <> '00000000-0000-4000-a000-0000000000d0';
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';

insert into public.cohorts (id, name, slug, starts_on, ends_on)
values ('00000000-0000-4000-b000-000000000001', 'Turma de teste (outra)', 'teste-outra-turma', '2027-01-01', '2028-01-01');

insert into public.enrollments (user_id, cohort_id, role_in_cohort)
select u, (select id from public.cohorts where slug = 'turma-2027'), r::public.cohort_role
from (values ('00000000-0000-4000-a000-00000000000a'::uuid, 'aluno'),
             ('00000000-0000-4000-a000-00000000000b'::uuid, 'aluno'),
             ('00000000-0000-4000-a000-0000000000c0'::uuid, 'coordenacao')) v(u, r);
insert into public.enrollments (user_id, cohort_id)
values ('00000000-0000-4000-a000-0000000000e0', '00000000-0000-4000-b000-000000000001');

-- ── Aluno A ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.profiles;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê apenas o próprio perfil', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.cohorts;
  select exists (select 1 from public.cohorts where slug = 'turma-2027') into ok;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê apenas a própria turma', n = 1 and ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.enrollments;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê apenas a própria matrícula', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  update public.profiles set display_name = 'A.' where id = '00000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Aluno edita o próprio nome de exibição', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  update public.profiles set display_name = 'invadido' where id = '00000000-0000-4000-a000-00000000000b';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não edita o perfil de outro aluno', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000000a';
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não consegue se promover a admin', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.enrollments (user_id, cohort_id)
    values ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-000000000001');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não consegue se matricular em outra turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  update public.enrollments set role_in_cohort = 'coordenacao' where user_id = '00000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não consegue virar coordenação da turma', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.cohorts (name, slug, starts_on, ends_on) values ('Invasão', 'invasao', '2027-01-01', '2027-12-31');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não cria turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    delete from public.profiles where id = '00000000-0000-4000-a000-00000000000a';
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém apaga perfis pela API', ok);
end
$$;

-- ── Coordenação C (Turma 2027) ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  select exists (select 1 from public.profiles where id = '00000000-0000-4000-a000-0000000000e0') into ok;
  reset role;
  insert into resultados (teste, passou)
  values ('Coordenação vê os perfis da própria turma (A, B, C) e não os de outra turma', n = 3 and not ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.enrollments where user_id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê só as matrículas da própria turma', n = 3);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.profiles set display_name = 'x' where id = '00000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita perfil de aluno', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000c0';
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não consegue se promover a admin', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    insert into public.enrollments (user_id, cohort_id)
    values ('00000000-0000-4000-a000-0000000000f0', (select id from public.cohorts where slug = 'turma-2027'));
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não matricula pessoas (só admin)', ok);
end
$$;

-- ── Conta nova N, sem matrícula ──
do $$
declare n int; m int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000f0');
  select count(*) into n from public.cohorts;
  select count(*) into m from public.profiles;
  reset role;
  insert into resultados (teste, passou) values ('Conta sem matrícula não vê nenhuma turma, só o próprio perfil', n = 0 and m = 1);
end
$$;

-- ── Matrícula inativa perde o acesso à turma ──
update public.enrollments set status = 'inativa' where user_id = '00000000-0000-4000-a000-00000000000b';
do $$
declare n int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  select count(*) into n from public.cohorts;
  reset role;
  insert into resultados (teste, passou) values ('Aluno com matrícula inativa deixa de ver a turma', n = 0);
end
$$;

-- ── Admin D ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) into n from public.profiles
   where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin vê todos os perfis', n = 6);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.cohorts (name, slug, starts_on, ends_on) values ('Turma 2029 (teste)', 'turma-2029-teste', '2029-02-01', '2031-07-31');
  insert into public.enrollments (user_id, cohort_id)
  values ('00000000-0000-4000-a000-0000000000f0', (select id from public.cohorts where slug = 'turma-2029-teste'));
  update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-00000000000b';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Admin cria turma, matricula pessoa e altera papel', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    update public.profiles set role = 'aluno' where id = '00000000-0000-4000-a000-0000000000d0';
    ok := false;
  exception when raise_exception then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('O último admin não pode ser rebaixado', ok);
end
$$;

-- ── Termo de uso versionado ──
do $$
declare ok1 boolean; ok2 boolean; n int; quando timestamptz;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select public.needs_terms_acceptance() into ok1;
  insert into public.terms_acceptances (user_id, terms_version_id, accepted_at)
  values ('00000000-0000-4000-a000-00000000000a', public.current_terms_version_id(), '2000-01-01');
  select public.needs_terms_acceptance() into ok2;
  select accepted_at into quando from public.terms_acceptances where user_id = '00000000-0000-4000-a000-00000000000a';
  reset role;
  insert into resultados (teste, passou)
  values ('Aluno aceita a versão vigente; a data é a do banco, não a enviada', ok1 and not ok2 and quando = now());

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.terms_acceptances (user_id, terms_version_id)
    values ('00000000-0000-4000-a000-0000000000c0', public.current_terms_version_id());
    ok1 := false;
  exception when insufficient_privilege then ok1 := true;
  end;
  begin
    delete from public.terms_acceptances where user_id = '00000000-0000-4000-a000-00000000000a';
    ok2 := false;
  exception when insufficient_privilege then ok2 := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não aceita em nome de outro nem apaga o próprio aceite', ok1 and ok2);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.terms_versions set body = 'alterado' where version = '0.1-provisorio';
  get diagnostics n = row_count;
  insert into public.terms_versions (version, body, effective_from) values ('teste-futura', 'Versão futura', now() + interval '30 days');
  reset role;
  insert into resultados (teste, passou) values ('Texto de versão já vigente é imutável, até para o admin', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.terms_versions where version = 'teste-futura';
  reset role;
  insert into resultados (teste, passou) values ('Aluno não vê versão do termo que ainda não entrou em vigor', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.terms_versions (version, body, effective_from) values ('teste-nova', 'Nova versão vigente', now());
  reset role;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select public.needs_terms_acceptance() into ok1;
  reset role;
  insert into resultados (teste, passou) values ('Nova versão vigente exige novo aceite', ok1);
end
$$;

-- ── Visitante sem login (anon) ──
do $$
declare ok boolean := true; t text;
begin
  execute 'set local role anon';
  foreach t in array array['cohorts', 'profiles', 'enrollments', 'terms_versions', 'terms_acceptances'] loop
    begin
      execute format('select count(*) from public.%I', t);
      ok := false;
    exception when insufficient_privilege then null;
    end;
  end loop;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem login não lê nenhuma tabela de pessoas', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
