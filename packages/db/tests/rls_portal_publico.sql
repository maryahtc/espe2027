-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — portal público lendo o banco (visões públicas).
-- Mesmo formato dos demais: transação desfeita no final, lista "ordem|teste|passou".
--
-- Turmas: T1 (exibida no portal) · T2 (não exibida)
-- Módulos T1: M1 publicado · M2 rascunho · M3 publicado e depois arquivado · Módulo T2: publicado
-- Docentes: F1 (aula em M1, "a confirmar") · F2 (equipe visível de M1) · F3 (equipe interna de M1)
--           F4 (aula no rascunho M2) · F5 (aula em T2) · F6 (sem vínculo)

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

create function pg_temp.visitante() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;

-- Turmas reais (se houver) ficam fora do portal até o rollback: o teste enxerga só as suas.
update public.cohorts set show_on_public = false where show_on_public;

insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000f1', 'Turma T1', 'teste-pp-t1', '2027-02-01', '2029-07-31'),
  ('00000000-0000-4000-b000-0000000000f2', 'Turma T2', 'teste-pp-t2', '2028-02-01', '2030-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000f1', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000f1', 'coordenacao');

insert into public.modules (id, cohort_id, position, number, title, theme, description, location, preparation, status) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-0000000000f1', 1, 1, 'Módulo 1', 'Tema público', 'Descrição pública', 'Sala secreta', 'Preparo interno', 'rascunho'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-0000000000f1', 2, 2, 'Módulo 2', null, null, null, null, 'rascunho'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-0000000000f1', 3, 3, 'Módulo 3', null, null, null, null, 'rascunho'),
  ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-b000-0000000000f2', 1, 1, 'Módulo T2', null, null, null, null, 'rascunho');
insert into public.module_internal_notes (module_id, notes) values ('00000000-0000-4000-d000-000000000001', 'NOTA INTERNA');
insert into public.module_days (id, module_id, date, note) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001', '2027-02-11', 'nota interna do dia'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000001', '2027-02-12', null),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-d000-000000000002', '2027-03-11', null),
  ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-d000-000000000003', '2027-04-11', null),
  ('00000000-0000-4000-e000-000000000009', '00000000-0000-4000-d000-000000000009', '2028-02-11', null);
insert into public.faculty (id, full_name, display_name, honorific, specialty, short_bio) values
  ('00000000-0000-4000-c000-0000000000f1', 'Docente Um Completo', 'F1', 'Dra.', 'Prótese', 'Bio F1'),
  ('00000000-0000-4000-c000-0000000000f2', 'Docente Dois', 'F2', null, null, null),
  ('00000000-0000-4000-c000-0000000000f3', 'Equipe Interna', 'F3', null, null, null),
  ('00000000-0000-4000-c000-0000000000f4', 'Docente Rascunho', 'F4', null, null, null),
  ('00000000-0000-4000-c000-0000000000f5', 'Docente T2', 'F5', null, null, null),
  ('00000000-0000-4000-c000-0000000000f6', 'Docente Solto', 'F6', null, null, null);
insert into public.module_sessions (id, module_id, day_id, period, starts_at, ends_at, title, activity_type) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-e000-000000000002', 'manha', '08:30', '12:00', 'Aula M1 dia 2', 'teorica'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-e000-000000000003', 'tarde', null, null, 'Aula rascunho', 'pratica'),
  ('00000000-0000-4000-f000-000000000009', '00000000-0000-4000-d000-000000000009', '00000000-0000-4000-e000-000000000009', 'manha', null, null, 'Aula T2', 'teorica');
insert into public.session_faculty (session_id, module_id, faculty_id, tentative) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-0000000000f1', true),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-0000000000f4', false),
  ('00000000-0000-4000-f000-000000000009', '00000000-0000-4000-d000-000000000009', '00000000-0000-4000-c000-0000000000f5', false);
insert into public.module_staff (module_id, faculty_id, role, visible_to_students) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-0000000000f2', 'equipe_clinica', true),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-0000000000f3', 'apoio', false);
update public.modules set status = 'publicado'
 where id in ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-d000-000000000003', '00000000-0000-4000-d000-000000000009');
update public.modules set status = 'arquivado' where id = '00000000-0000-4000-d000-000000000003';

-- ── Caixa "Exibir no portal público" ──
do $$
declare n int; ok boolean;
begin
  perform pg_temp.visitante();
  select count(*) into n from public.public_modules;
  reset role;
  insert into resultados (teste, passou) values ('Sem turma marcada, o portal público não mostra nada (a caixa começa desmarcada)', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000c0');
  update public.cohorts set show_on_public = true where id = '00000000-0000-4000-b000-0000000000f1';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não marca turma no portal público', n = 0);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.cohorts set show_on_public = true where id = '00000000-0000-4000-b000-0000000000f1';
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Admin marca a turma para o portal público', n = 1);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  begin
    update public.cohorts set show_on_public = true where id = '00000000-0000-4000-b000-0000000000f2';
    ok := false;
  exception when unique_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só uma turma pode estar no portal público por vez', ok);
end
$$;

-- ── O que o visitante vê ──
do $$
declare n int; ok boolean; r record;
begin
  perform pg_temp.visitante();
  select array_agg(number order by number) = array[1] into ok from public.public_modules;
  reset role;
  insert into resultados (teste, passou) values ('Visitante vê só módulos publicados da turma exibida (sem rascunho nem outra turma)', ok);

  perform pg_temp.visitante();
  select * into r from public.public_modules where number = 1;
  reset role;
  insert into resultados (teste, passou) values ('Módulo público traz tema, descrição e datas dos dias',
    r.theme = 'Tema público' and r.description = 'Descrição pública' and r.starts_on = '2027-02-11' and r.ends_on = '2027-02-12');

  perform pg_temp.visitante();
  select count(*) = 1 and bool_and(title = 'Aula M1 dia 2' and day_number = 2 and tentative) into ok from public.public_schedule;
  reset role;
  insert into resultados (teste, passou) values ('Programação pública: só atividades de módulos publicados, com dia do módulo e "a confirmar"', ok);

  perform pg_temp.visitante();
  select array_agg(display_name order by display_name) = array['F1', 'F2'] into ok from public.public_teachers;
  reset role;
  insert into resultados (teste, passou) values ('Professores públicos: só quem dá aula publicada ou está na equipe visível', ok);
end
$$;

-- ── Nunca expostos ──
do $$
declare n int; ok boolean; v_cols text[];
begin
  select array_agg(table_name || '.' || column_name order by table_name, column_name) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name in ('public_modules', 'public_schedule', 'public_teachers');
  insert into resultados (teste, passou) values ('As visões públicas têm exatamente a lista fechada de colunas aprovada', v_cols = array[
    'public_modules.description', 'public_modules.ends_on', 'public_modules.id', 'public_modules.number',
    'public_modules.position', 'public_modules.staff_ids', 'public_modules.starts_on', 'public_modules.theme',
    'public_modules.title',
    'public_schedule.activity_type', 'public_schedule.date', 'public_schedule.day_number', 'public_schedule.description',
    'public_schedule.ends_at', 'public_schedule.faculty_ids', 'public_schedule.id', 'public_schedule.module_id',
    'public_schedule.period', 'public_schedule.position', 'public_schedule.starts_at', 'public_schedule.tentative',
    'public_schedule.title',
    'public_teachers.display_name', 'public_teachers.honorific', 'public_teachers.id', 'public_teachers.short_bio',
    'public_teachers.specialty']);

  perform pg_temp.visitante();
  select count(*) into n from public.public_modules pm
   where row_to_json(pm)::text ~ '(NOTA INTERNA|nota interna|Sala secreta|Preparo interno|Docente Um Completo|teste\.invalid)';
  reset role;
  perform pg_temp.visitante();
  select n + count(*) into n from public.public_schedule ps
   where row_to_json(ps)::text ~ '(NOTA INTERNA|nota interna|Sala secreta|teste\.invalid)';
  select n + count(*) into n from public.public_teachers pt
   where row_to_json(pt)::text ~ '(Docente Um Completo|Equipe Interna|teste\.invalid)';
  reset role;
  insert into resultados (teste, passou) values ('Nada interno sai pelas visões (observações, local, preparo, nome completo, e-mails)', n = 0);

  perform pg_temp.visitante();
  select count(*) = 0 into ok from public.public_teachers where display_name = 'F3';
  reset role;
  insert into resultados (teste, passou) values ('Equipe interna nunca aparece no portal público', ok);

  ok := true;
  perform pg_temp.visitante();
  begin perform 1 from public.modules; ok := false; exception when insufficient_privilege then null; end;
  begin perform 1 from public.module_internal_notes; ok := false; exception when insufficient_privilege then null; end;
  begin perform 1 from public.faculty; ok := false; exception when insufficient_privilege then null; end;
  begin perform 1 from public.module_sessions; ok := false; exception when insufficient_privilege then null; end;
  begin perform 1 from public.change_log; ok := false; exception when insufficient_privilege then null; end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante não lê nenhuma tabela acadêmica diretamente', ok);

  n := 0;
  perform pg_temp.visitante();
  begin select n + count(*) into n from public.profiles; exception when insufficient_privilege then null; end;
  begin select n + count(*) into n from public.enrollments; exception when insufficient_privilege then null; end;
  begin select n + count(*) into n from public.cohorts; exception when insufficient_privilege then null; end;
  begin select n + count(*) into n from public.terms_acceptances; exception when insufficient_privilege then null; end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante não vê alunos, matrículas, termos nem turmas', n = 0);

  select not has_table_privilege('anon', 'public.public_modules', 'INSERT, UPDATE, DELETE')
     and not has_table_privilege('anon', 'public.public_schedule', 'INSERT, UPDATE, DELETE')
     and not has_table_privilege('anon', 'public.public_teachers', 'INSERT, UPDATE, DELETE')
     and not has_table_privilege('authenticated', 'public.public_modules', 'INSERT, UPDATE, DELETE')
    into ok;
  perform pg_temp.visitante();
  begin
    update public.public_modules set theme = 'invadido';
    ok := false;
  exception when insufficient_privilege or object_not_in_prerequisite_state then null;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante não consegue alterar nada pelas visões', ok);
end
$$;

-- ── Alterações no Admin refletem na hora ──
do $$
declare ok boolean;
begin
  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.modules set theme = 'Tema novo' where id = '00000000-0000-4000-d000-000000000001';
  update public.module_days set date = '2027-02-13' where id = '00000000-0000-4000-e000-000000000002';
  update public.session_faculty set tentative = false where session_id = '00000000-0000-4000-f000-000000000001';
  reset role;
  perform pg_temp.visitante();
  select theme = 'Tema novo' and ends_on = '2027-02-13' into ok from public.public_modules where number = 1;
  select ok and not tentative into ok from public.public_schedule;
  reset role;
  insert into resultados (teste, passou) values ('Tema, data e professor alterados no Admin aparecem no portal público', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.module_staff set visible_to_students = false where faculty_id = '00000000-0000-4000-c000-0000000000f2';
  reset role;
  perform pg_temp.visitante();
  select count(*) = 0 into ok from public.public_teachers where display_name = 'F2';
  reset role;
  insert into resultados (teste, passou) values ('Marcar alguém da equipe como interno tira a pessoa do portal público', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.modules set status = 'arquivado' where id = '00000000-0000-4000-d000-000000000001';
  reset role;
  perform pg_temp.visitante();
  select (select count(*) from public.public_modules) + (select count(*) from public.public_schedule)
       + (select count(*) from public.public_teachers) = 0 into ok;
  reset role;
  insert into resultados (teste, passou) values ('Módulo arquivado some do portal público (com programação e professores)', ok);

  perform pg_temp.entrar('00000000-0000-4000-a000-0000000000d0');
  update public.modules set status = 'publicado' where id = '00000000-0000-4000-d000-000000000001';
  update public.cohorts set show_on_public = false where id = '00000000-0000-4000-b000-0000000000f1';
  reset role;
  perform pg_temp.visitante();
  select count(*) = 0 into ok from public.public_modules;
  reset role;
  insert into resultados (teste, passou) values ('Desmarcar a turma tira tudo do portal público', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
