-- Testes de isolamento — Etapa 2 · Parte 3 (turmas, cronograma e módulos).
-- Mesmo formato dos anteriores: transação desfeita no final, lista "ordem|teste|passou".
--
-- Turmas de teste: T1 e T2.   Pessoas: A aluno T1 · B aluno T2 · E aluno T1 com matrícula inativa
--                             C coordenação T1 · D admin
-- Módulos: M1 publicado (T1) · M2 rascunho (T1) · M3 arquivado (T1) · M4 publicado (T2)

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

-- ── Massa de teste ──
insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000e', 'e@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;

insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000f1', 'Turma T1', 'teste-t1', '2027-02-01', '2029-07-31'),
  ('00000000-0000-4000-b000-0000000000f2', 'Turma T2', 'teste-t2', '2028-02-01', '2030-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000f1', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000000e', '00000000-0000-4000-b000-0000000000f1', 'aluno', 'inativa'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000000f2', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000f1', 'coordenacao', 'ativa');

insert into public.faculty (id, full_name, display_name) values
  ('00000000-0000-4000-c000-000000000001', 'Docente Um', 'Um'),
  ('00000000-0000-4000-c000-000000000002', 'Equipe Interna', 'Interna');

insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-0000000000f1', 1, 1, 'M1 publicado', 'rascunho'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-0000000000f1', 2, 2, 'M2 rascunho', 'rascunho'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-0000000000f1', 3, 3, 'M3 arquivado', 'arquivado'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-b000-0000000000f2', 1, 1, 'M4 outra turma', 'rascunho');
insert into public.module_days (id, module_id, date) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001', '2027-02-11'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000001', '2027-02-12'),
  ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-d000-000000000004', '2028-02-17');
update public.modules set status = 'publicado'
 where id in ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-d000-000000000004');
insert into public.module_sessions (id, module_id, day_id, period, title, activity_type) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000001', 'manha', 'Abertura', 'teorica'),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-d000-000000000004', '00000000-0000-4000-e000-000000000004', 'manha', 'Outra turma', 'teorica');
insert into public.session_faculty (session_id, module_id, faculty_id, tentative) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', true);
insert into public.module_staff (module_id, faculty_id, role, visible_to_students) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'principal', true),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000002', 'coordenacao', false);
insert into public.module_internal_notes (module_id, notes) values
  ('00000000-0000-4000-d000-000000000001', 'Ver com fornecedor');
insert into public.module_materials (id, module_id, item) values
  ('00000000-0000-4000-a100-000000000001', '00000000-0000-4000-d000-000000000001', 'Kit de isolamento'),
  ('00000000-0000-4000-a100-000000000004', '00000000-0000-4000-d000-000000000004', 'Material da outra turma');
insert into public.module_deliverables (module_id, title) values
  ('00000000-0000-4000-d000-000000000001', 'Anamnese');
insert into public.module_resources (id, module_id, kind, title, url, file_path, status, available_from) values
  ('00000000-0000-4000-a200-000000000001', '00000000-0000-4000-d000-000000000001', 'link', 'Liberado', 'https://exemplo.com', null, 'publicado', null),
  ('00000000-0000-4000-a200-000000000002', '00000000-0000-4000-d000-000000000001', 'link', 'Rascunho', 'https://exemplo.com', null, 'rascunho', null),
  ('00000000-0000-4000-a200-000000000003', '00000000-0000-4000-d000-000000000001', 'link', 'Futuro', 'https://exemplo.com', null, 'publicado', now() + interval '7 days'),
  ('00000000-0000-4000-a200-000000000004', '00000000-0000-4000-d000-000000000001', 'arquivo', 'PDF liberado', null, 'm1/aula.pdf', 'publicado', null),
  ('00000000-0000-4000-a200-000000000005', '00000000-0000-4000-d000-000000000001', 'arquivo', 'PDF rascunho', null, 'm1/rascunho.pdf', 'rascunho', null);
insert into public.cohort_events (cohort_id, date, title, kind, status) values
  ('00000000-0000-4000-b000-0000000000f1', '2027-02-27', 'Aula online', 'online', 'publicado'),
  ('00000000-0000-4000-b000-0000000000f1', '2027-03-01', 'Evento rascunho', 'outro', 'rascunho'),
  ('00000000-0000-4000-b000-0000000000f2', '2028-03-01', 'Evento T2', 'online', 'publicado');

-- ── Aluno A (T1) ──
do $$
declare n int; m int; ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.modules where cohort_id in ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000f2');
  select count(*) into m from public.modules where id = '00000000-0000-4000-d000-000000000001';
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê só o módulo publicado da própria turma (nem rascunho, nem arquivado, nem outra turma)', n = 1 and m = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select (select count(*) from public.module_days where module_id = '00000000-0000-4000-d000-000000000001') = 2
     and (select count(*) from public.module_sessions where module_id = '00000000-0000-4000-d000-000000000001') = 1
     and (select count(*) from public.session_faculty where module_id = '00000000-0000-4000-d000-000000000001') = 1
     and (select count(*) from public.module_materials where module_id = '00000000-0000-4000-d000-000000000001') = 1
     and (select count(*) from public.module_deliverables where module_id = '00000000-0000-4000-d000-000000000001') = 1
    into ok;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê dias, programação, professores, materiais e entregáveis do módulo publicado', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select (select count(*) from public.module_days where module_id = '00000000-0000-4000-d000-000000000004')
       + (select count(*) from public.module_sessions where module_id = '00000000-0000-4000-d000-000000000004')
       + (select count(*) from public.module_materials where module_id = '00000000-0000-4000-d000-000000000004')
    into n;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não vê dias, programação nem materiais de outra turma', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.module_internal_notes;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não lê observações internas', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.module_staff where module_id = '00000000-0000-4000-d000-000000000001';
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê só a equipe marcada como visível', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.module_resources where module_id = '00000000-0000-4000-d000-000000000001';
  select public.module_file_readable('m1/aula.pdf') and not public.module_file_readable('m1/rascunho.pdf') into ok;
  reset role;
  insert into resultados (teste, passou)
  values ('Aluno vê só recursos publicados e já liberados (rascunho e data futura ficam ocultos, inclusive arquivos)', n = 2 and ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  update public.modules set title = 'invadido' where id = '00000000-0000-4000-d000-000000000001';
  get diagnostics n = row_count;
  begin
    insert into public.module_days (module_id, date) values ('00000000-0000-4000-d000-000000000001', '2027-02-13');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não altera módulo nem programação', n = 0 and ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  insert into public.material_checks (material_id) values ('00000000-0000-4000-a100-000000000001');
  begin
    insert into public.material_checks (material_id) values ('00000000-0000-4000-a100-000000000004');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno marca material do próprio módulo, não de outra turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.cohort_events where cohort_id in ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000f2');
  select count(*) into m from public.change_log;
  reset role;
  insert into resultados (teste, passou) values ('Aluno vê só eventos publicados da própria turma e não lê o histórico', n = 1 and m = 0);
end
$$;

-- ── Aluno B (T2) não vê marcações de A; aluno com matrícula inativa ──
do $$
declare n int; m int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  select count(*) into n from public.material_checks;
  select count(*) into m from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  insert into resultados (teste, passou) values ('Aluno de outra turma não vê módulos nem marcações da T1', n = 0 and m = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000e');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  insert into resultados (teste, passou) values ('Aluno com matrícula inativa não vê os módulos da turma', n = 0);
end
$$;

-- ── Coordenação C (T1) ──
do $$
declare n int; m int; k int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  select count(*) into m from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f2';
  select count(*) into k from public.module_internal_notes;
  reset role;
  insert into resultados (teste, passou)
  values ('Coordenação vê todos os módulos e observações da própria turma, nada da outra', n = 3 and m = 0 and k = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.modules set title = 'x' where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  get diagnostics n = row_count;
  update public.module_internal_notes set notes = 'x';
  get diagnostics m = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação só lê: não altera módulos nem observações', n = 0 and m = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  select count(*) into n from public.cohort_events where cohort_id = '00000000-0000-4000-b000-0000000000f2';
  select count(*) into m from public.change_log where cohort_id = '00000000-0000-4000-b000-0000000000f2';
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não vê eventos nem histórico de outra turma', n = 0 and m = 0);
end
$$;

-- ── Admin D ──
do $$
declare n int; k int; ok boolean; v_mod uuid; v_day uuid;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  begin
    insert into public.modules (cohort_id, position, title) values ('00000000-0000-4000-b000-0000000000f1', 9, 'Aluno tentando');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não cria módulo', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  insert into public.modules (cohort_id, position, number, title) values ('00000000-0000-4000-b000-0000000000f1', 4, 4, 'Novo')
  returning id into v_mod;
  insert into public.module_days (module_id, date) values (v_mod, '2027-05-20') returning id into v_day;
  insert into public.module_sessions (module_id, day_id, period, title, activity_type) values (v_mod, v_day, 'tarde', 'Clínica', 'clinica');
  update public.modules set title = 'Novo título' where id = v_mod;
  reset role;
  select count(*) = 1 into ok from public.change_log
   where module_id = v_mod and table_name = 'modules' and action = 'update'
     and actor = '00000000-0000-4000-a000-0000000000d0'
     and changes -> 'title' ->> 'de' = 'Novo' and changes -> 'title' ->> 'para' = 'Novo título';
  insert into resultados (teste, passou)
  values ('Admin cria módulo, dia e atividade; o histórico registra quem, quando e "de → para"', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.module_days set date = '2027-02-18' where id = '00000000-0000-4000-e000-000000000002';
  reset role;
  select dates_changed_at is not null into ok from public.modules where id = '00000000-0000-4000-d000-000000000001';
  insert into resultados (teste, passou) values ('Mudar a data de módulo publicado marca "data alterada"', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  delete from public.modules where id = '00000000-0000-4000-d000-000000000001';
  get diagnostics n = row_count;
  delete from public.modules where id = '00000000-0000-4000-d000-000000000002';
  get diagnostics k = row_count;
  reset role;
  insert into resultados (teste, passou)
  values ('Módulo já publicado não pode ser excluído (só arquivado); rascunho nunca publicado pode', n = 0 and k = 1);
end
$$;

-- ── Turma encerrada ──
do $$
declare n int;
begin
  update public.cohorts set status = 'encerrada' where id = '00000000-0000-4000-b000-0000000000f1';
  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000a');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  insert into resultados (teste, passou) values ('Turma encerrada: o aluno continua vendo o histórico de módulos', n >= 1);
  update public.cohorts set status = 'ativa' where id = '00000000-0000-4000-b000-0000000000f1';
end
$$;

-- ── Copiar a estrutura da T1 para a T2 ──
do $$
declare n int; ok boolean; v_copied int;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  begin
    perform public.copy_cohort_structure('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000f2', 365);
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só admin copia a estrutura de uma turma', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  select public.copy_cohort_structure('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000f2', 371) into v_copied;
  reset role;
  select count(*) = v_copied and bool_and(m.status = 'rascunho')
    into ok
    from public.modules m where m.cohort_id = '00000000-0000-4000-b000-0000000000f2' and m.id <> '00000000-0000-4000-d000-000000000004';
  select count(*) into n
    from public.module_days d join public.modules m on m.id = d.module_id
   where m.cohort_id = '00000000-0000-4000-b000-0000000000f2' and m.id <> '00000000-0000-4000-d000-000000000004'
     and d.date = date '2027-02-11' + 371;
  insert into resultados (teste, passou)
  values ('Cópia de turma: módulos entram como rascunho, com as datas deslocadas', ok and v_copied >= 1 and n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-00000000000b');
  select count(*) into n from public.modules where cohort_id = '00000000-0000-4000-b000-0000000000f2';
  reset role;
  insert into resultados (teste, passou) values ('Alunos da turma de destino não veem os módulos copiados (rascunho)', n = 1);
end
$$;

-- ── Visitante sem login ──
do $$
declare ok boolean := true; t text;
begin
  execute 'set local role anon';
  foreach t in array array['faculty', 'modules', 'module_days', 'module_sessions', 'module_materials', 'module_resources', 'cohort_events', 'change_log'] loop
    begin
      execute format('select count(*) from public.%I', t);
      ok := false;
    exception when insufficient_privilege then null;
    end;
  end loop;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem login não lê cronograma, módulos nem histórico', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
