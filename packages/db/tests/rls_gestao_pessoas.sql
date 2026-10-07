-- Testes — gestão de pessoas e equipe (excluir com segurança e desativar acesso).
-- Mesmo formato dos demais: transação desfeita no final, lista "ordem|teste|passou".
--
-- Pessoas: A aluno T1 · C coordenação T1 · D admin · E segundo admin
-- Docentes: F1 sem vínculo · F2 vinculado a uma atividade

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
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000e0', 'e@teste.invalid');
-- Só os admins de teste existem nesta transação (admins reais ficam como coordenação até o rollback).
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where role = 'admin';
update public.profiles set role = 'admin'
 where id in ('00000000-0000-4000-a000-0000000000d0', '00000000-0000-4000-a000-0000000000e0');
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
alter table public.profiles enable trigger profiles_guard;

insert into public.cohorts (id, name, slug, starts_on, ends_on)
values ('00000000-0000-4000-b000-0000000000f1', 'Turma T1', 'teste-gp-t1', '2027-02-01', '2029-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000f1', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000f1', 'coordenacao');
insert into public.modules (id, cohort_id, position, number, title, status)
values ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-0000000000f1', 1, 1, 'M1', 'rascunho');
insert into public.module_days (id, module_id, date)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001', '2027-02-11');
update public.modules set status = 'publicado' where id = '00000000-0000-4000-d000-000000000001';
insert into public.faculty (id, full_name, display_name) values
  ('00000000-0000-4000-c000-0000000000f1', 'Docente Sem Vínculo', 'F1'),
  ('00000000-0000-4000-c000-0000000000f2', 'Docente Vinculado', 'F2');
insert into public.module_sessions (id, module_id, day_id, period, title)
values ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000001', 'manha', 'Aula');
insert into public.session_faculty (session_id, module_id, faculty_id)
values ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-0000000000f2');

-- ── Docentes e equipe ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  delete from public.faculty where id = '00000000-0000-4000-c000-0000000000f1';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Admin exclui docente sem vínculo', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    delete from public.faculty where id = '00000000-0000-4000-c000-0000000000f2';
    ok := false;
  exception when foreign_key_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Docente vinculado a atividade não pode ser apagado (o banco protege o histórico)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.faculty set active = false where id = '00000000-0000-4000-c000-0000000000f2';
  reset role;
  select not active and exists (select 1 from public.session_faculty where faculty_id = '00000000-0000-4000-c000-0000000000f2')
    into ok from public.faculty where id = '00000000-0000-4000-c000-0000000000f2';
  insert into resultados (teste, passou) values ('Docente vinculado fica inativo e continua nas atividades', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  delete from public.faculty where id = '00000000-0000-4000-c000-0000000000f2';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não exclui docentes', n = 0);
end
$$;

-- ── Ficha de histórico (decide excluir ou desativar) ──
insert into public.terms_acceptances (user_id, terms_version_id)
select '00000000-0000-4000-a000-00000000000a', public.current_terms_version_id() where public.current_terms_version_id() is not null;
do $$
declare f jsonb; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select public.admin_person_footprint('00000000-0000-4000-a000-00000000000a') into f;
  reset role;
  insert into resultados (teste, passou)
  values ('Admin consulta o histórico de uma pessoa antes de excluir', (f ->> 'aceites')::int >= 0 and f ? 'entrou' and f ? 'alteracoes');

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    perform public.admin_person_footprint('00000000-0000-4000-a000-00000000000a');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não consulta histórico de pessoas', ok);
end
$$;

-- ── Desativação de acesso ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-00000000000a';
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só admin desativa o acesso de alguém', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.profiles set deactivated_at = now()
   where id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-0000000000c0');
  reset role;

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  insert into resultados (teste, passou) values ('Aluno desativado perde o acesso à turma na hora', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.profiles where id = '00000000-0000-4000-a000-00000000000a';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação desativada perde a visão da turma', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    update public.profiles set deactivated_at = null where id = '00000000-0000-4000-a000-00000000000a';
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Pessoa desativada não consegue se reativar', ok);

  select count(*) = 1 into ok from public.terms_acceptances where user_id = '00000000-0000-4000-a000-00000000000a';
  insert into resultados (teste, passou) values ('Desativar não apaga histórico (perfil e aceites continuam)',
    ok or public.current_terms_version_id() is null);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.profiles set deactivated_at = null where id = '00000000-0000-4000-a000-00000000000a';
  reset role;
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  insert into resultados (teste, passou) values ('Admin reativa o acesso e o aluno volta a ver a turma', n = 1);
end
$$;

-- ── Admins ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-0000000000e0';
  reset role;
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000e0');
  select count(*) into n from public.profiles where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Admin desativado perde os poderes de admin na hora', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    update public.profiles set deactivated_at = now() where id = '00000000-0000-4000-a000-0000000000d0';
    ok := false;
  exception when raise_exception then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('O último admin ativo não pode ser desativado', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select count(*) = 4 and bool_or(deactivated_at is not null) into ok
    from public.admin_people() where id::text like '00000000-0000-4000-a000-%';
  reset role;
  insert into resultados (teste, passou) values ('Lista de pessoas do admin mostra quem está desativado', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
