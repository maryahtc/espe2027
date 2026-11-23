-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Bloco A · B1: contatos dos professores e logística por módulo (participação, passagem, hospedagem).
-- Pessoas: A (aluno T1) · C (coordena T1) · X (coordena T2) · D (admin). Docentes: P1 (equipe do M1/T1),
-- P2 (atividade do M1/T1), P3 (só na turma 2). Transação desfeita no final.

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

-- Programação acadêmica: não pode mudar.
create function pg_temp.academico() returns text language sql as $$
  select md5(string_agg(h, '|' order by h)) from (
    select 'modules:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) h from public.modules r
    union all select 'sessions:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.module_sessions r
    union all select 'session_faculty:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.session_faculty r
    union all select 'module_staff:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.module_staff r
    union all select 'faculty:' || md5(coalesce(string_agg(r::text, '' order by r::text), '')) from public.faculty r
  ) x
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000f00a', 'la@teste.invalid'),
  ('00000000-0000-4000-a000-00000000f0c0', 'lc@teste.invalid'),
  ('00000000-0000-4000-a000-00000000f0e0', 'lx@teste.invalid'),
  ('00000000-0000-4000-a000-00000000f0d0', 'ld@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in ('00000000-0000-4000-a000-00000000f0c0', '00000000-0000-4000-a000-00000000f0e0');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000f0d0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-00000000f001', 'Turma Logística 1', 'teste-log-1', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-00000000f002', 'Turma Logística 2', 'teste-log-2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort, status) values
  ('00000000-0000-4000-a000-00000000f00a', '00000000-0000-4000-b000-00000000f001', 'aluno', 'ativa'),
  ('00000000-0000-4000-a000-00000000f0c0', '00000000-0000-4000-b000-00000000f001', 'coordenacao', 'ativa'),
  ('00000000-0000-4000-a000-00000000f0e0', '00000000-0000-4000-b000-00000000f002', 'coordenacao', 'ativa');
insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-00000000f001', '00000000-0000-4000-b000-00000000f001', 1, 1, 'M1 T1', 'rascunho'),
  ('00000000-0000-4000-d000-00000000f002', '00000000-0000-4000-b000-00000000f002', 1, 1, 'M1 T2', 'rascunho');
insert into public.module_days (id, module_id, date, label) values
  ('00000000-0000-4000-d100-00000000f001', '00000000-0000-4000-d000-00000000f001', '2027-02-11', 'Dia 1');
insert into public.module_sessions (id, module_id, day_id, period, title) values
  ('00000000-0000-4000-d200-00000000f001', '00000000-0000-4000-d000-00000000f001', '00000000-0000-4000-d100-00000000f001', 'manha', 'Aula');
insert into public.faculty (id, full_name, display_name, kind) values
  ('00000000-0000-4000-e000-00000000f001', 'Professor Um', 'P1', 'docente'),
  ('00000000-0000-4000-e000-00000000f002', 'Professor Dois', 'P2', 'docente'),
  ('00000000-0000-4000-e000-00000000f003', 'Professor Três', 'P3', 'docente');
insert into public.module_staff (module_id, faculty_id, role) values
  ('00000000-0000-4000-d000-00000000f001', '00000000-0000-4000-e000-00000000f001', 'docente'),
  ('00000000-0000-4000-d000-00000000f002', '00000000-0000-4000-e000-00000000f003', 'docente');
insert into public.session_faculty (session_id, module_id, faculty_id) values
  ('00000000-0000-4000-d200-00000000f001', '00000000-0000-4000-d000-00000000f001', '00000000-0000-4000-e000-00000000f002');
insert into public.ops_people (id, name, role_title) values ('00000000-0000-4000-e100-00000000f001', 'Compras Teste', 'Compras');

do $$
declare
  ok boolean;
  n integer;
  acad text;
  l1 uuid;
  a constant uuid := '00000000-0000-4000-a000-00000000f00a';
  c constant uuid := '00000000-0000-4000-a000-00000000f0c0';
  x constant uuid := '00000000-0000-4000-a000-00000000f0e0';
  adm constant uuid := '00000000-0000-4000-a000-00000000f0d0';
  m1 constant uuid := '00000000-0000-4000-d000-00000000f001';
  m2 constant uuid := '00000000-0000-4000-d000-00000000f002';
  p1 constant uuid := '00000000-0000-4000-e000-00000000f001';
  p2 constant uuid := '00000000-0000-4000-e000-00000000f002';
  p3 constant uuid := '00000000-0000-4000-e000-00000000f003';
  ops constant uuid := '00000000-0000-4000-e100-00000000f001';
begin
  acad := pg_temp.academico();

  -- ── Admin cadastra contatos e logística ──
  perform pg_temp.entrar(adm);
  insert into public.faculty_contacts (faculty_id, email, phone, city) values
    (p1, 'p1@teste.invalid', '+55 11 90000-0001', 'Curitiba'), (p2, 'p2@teste.invalid', null, 'Recife'), (p3, 'p3@teste.invalid', null, 'Natal');
  insert into public.module_faculty_logistics (module_id, faculty_id, participation, travel, travel_locator, travel_responsible_ops_id, lodging, lodging_waiting_on)
    values (m1, p1, 'confirmado', 'comprada', 'ABC123', ops, 'aguardando_confirmacao', 'UIOA') returning id into l1;
  insert into public.module_faculty_logistics (module_id, faculty_id) values (m2, p3);
  reset role;
  insert into resultados (teste, passou) values ('Admin cadastra contatos e logística (situações independentes)',
    (select participation::text || travel::text || lodging::text from public.module_faculty_logistics where id = l1) = 'confirmadocompradaaguardando_confirmacao');
  insert into resultados (teste, passou) values ('Padrões: a convidar, passagem a providenciar, hospedagem a reservar',
    (select participation::text || '|' || travel::text || '|' || lodging::text from public.module_faculty_logistics where module_id = m2) = 'a_convidar|a_providenciar|a_reservar');
  insert into resultados (teste, passou) values ('Logística e contatos não alteram a programação acadêmica', pg_temp.academico() = acad);

  -- ── Coordenação da turma 1: consulta, não edita ──
  perform pg_temp.entrar(c);
  select count(*) into n from public.faculty_contacts where faculty_id in (p1, p2, p3);
  reset role;
  insert into resultados (teste, passou) values ('Coordenação lê contatos dos professores ligados à própria turma (equipe e atividade), não de outra', n = 2);
  perform pg_temp.entrar(c);
  select count(*) into n from public.module_faculty_logistics;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação lê a logística só dos módulos da própria turma', n = 1);
  perform pg_temp.entrar(c);
  update public.module_faculty_logistics set travel = 'cancelada' where id = l1;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita a logística', n = 0);
  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.module_faculty_logistics (module_id, faculty_id) values (m1, p2);
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria logística', ok);
  perform pg_temp.entrar(c);
  update public.faculty_contacts set phone = '0' where faculty_id = p1;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não edita contatos', n = 0);
  perform pg_temp.entrar(c);
  select count(*) into n from public.change_log where table_name = 'faculty_contacts';
  reset role;
  insert into resultados (teste, passou) values ('Histórico dos contatos só para o Admin', n = 0);
  perform pg_temp.entrar(c);
  select count(*) into n from public.change_log where table_name = 'module_faculty_logistics' and row_id = l1::text;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação lê o histórico da logística da própria turma', n >= 1);

  -- ── Coordenação de outra turma, aluno, visitante ──
  perform pg_temp.entrar(x);
  select count(*) into n from public.faculty_contacts where faculty_id in (p1, p2);
  reset role;
  insert into resultados (teste, passou) values ('Coordenação de outra turma não lê contatos da turma 1', n = 0);
  perform pg_temp.entrar(x);
  select count(*) into n from public.module_faculty_logistics where module_id = m1;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação de outra turma não lê a logística da turma 1', n = 0);
  perform pg_temp.entrar(a);
  select (select count(*) from public.faculty_contacts) + (select count(*) from public.module_faculty_logistics) into n;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não lê contatos nem logística', n = 0);
  ok := false;
  begin
    set local role anon;
    perform 1 from public.module_faculty_logistics limit 1;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem acesso', ok);

  -- ── Regras ──
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    insert into public.module_faculty_logistics (module_id, faculty_id) values (m1, p1);
  exception when unique_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Um registro por professor e módulo', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.module_faculty_logistics set travel_responsible_id = p2 where id = l1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Responsável da passagem: acadêmico OU operacional', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.module_faculty_logistics set check_in = '2027-02-12', check_out = '2027-02-10' where id = l1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Check-out não pode ser antes do check-in', ok);
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    update public.module_faculty_logistics set travel_receipt_url = 'http://inseguro' where id = l1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Comprovante só por link https', ok);
  perform pg_temp.entrar(adm);
  update public.module_faculty_logistics set module_id = m2, faculty_id = p3 where id = l1;
  reset role;
  insert into resultados (teste, passou) values ('Professor e módulo de um registro não mudam (só o conteúdo)',
    (select module_id = m1 and faculty_id = p1 from public.module_faculty_logistics where id = l1));
  ok := false;
  perform pg_temp.entrar(adm);
  begin
    delete from public.module_faculty_logistics where id = l1;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém exclui (cancelar)', ok);
  insert into resultados (teste, passou) values ('Histórico registra quem alterou',
    (select updated_by from public.module_faculty_logistics where id = l1) = adm
    and (select count(*) from public.change_log where table_name = 'module_faculty_logistics' and row_id = l1::text) >= 1);
  insert into resultados (teste, passou) values ('A programação acadêmica segue intocada', pg_temp.academico() = acad);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
