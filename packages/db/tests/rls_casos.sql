-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Meus casos (Etapa 6 · Parte 1): catálogo, isolamento, validações, exclusão lógica e definitiva,
-- auditoria, turma encerrada e base da Produção. Transação desfeita no final; lista "ordem|teste|passou".
--
-- Turmas: T1 (ativa) · T2 (ativa)
-- Pessoas: A e B (alunos T1) · E (aluno T2) · C (coordena T1) · D (admin) · G (sem vínculo, recebe acesso extra)

begin;

create temp table resultados (ordem serial, teste text not null, passou boolean not null) on commit drop;
grant insert, select on resultados to anon, authenticated;
grant usage on sequence resultados_ordem_seq to anon, authenticated;
create temp table ids (k text primary key, v uuid) on commit drop;
grant select, insert on ids to authenticated;

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

create function pg_temp.etapa(p_proc text, p_step text) returns uuid language sql as $$
  select s.id from public.procedure_steps s join public.procedures p on p.id = s.procedure_id
  where p.slug = p_proc and s.slug = p_step
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000e', 'e@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000f0', 'g@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id = '00000000-0000-4000-a000-0000000000c0';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;

insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000c1', 'Turma Casos T1', 'teste-casos-t1', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-0000000000c2', 'Turma Casos T2', 'teste-casos-t2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000c1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000000c1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000e', '00000000-0000-4000-b000-0000000000c2', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000000c1', 'coordenacao');

-- Módulo publicado da T1 com dias de hoje-10 a hoje-8 (para o módulo automático pela data).
insert into public.modules (id, cohort_id, position, number, title, status) values
  ('00000000-0000-4000-d000-0000000000c1', '00000000-0000-4000-b000-0000000000c1', 1, 1, 'Módulo Casos 1', 'publicado');
insert into public.module_days (module_id, date) values
  ('00000000-0000-4000-d000-0000000000c1', public.sp_today() - 10),
  ('00000000-0000-4000-d000-0000000000c1', public.sp_today() - 8);

do $$
declare
  ok boolean;
  n integer;
  m integer;
  t1 constant uuid := '00000000-0000-4000-b000-0000000000c1';
  t2 constant uuid := '00000000-0000-4000-b000-0000000000c2';
  a constant uuid := '00000000-0000-4000-a000-00000000000a';
  b constant uuid := '00000000-0000-4000-a000-00000000000b';
  e constant uuid := '00000000-0000-4000-a000-00000000000e';
  c constant uuid := '00000000-0000-4000-a000-0000000000c0';
  d constant uuid := '00000000-0000-4000-a000-0000000000d0';
  g constant uuid := '00000000-0000-4000-a000-0000000000f0';
  hoje constant date := public.sp_today();
  caso_a uuid;
  caso_e uuid;
  reg uuid;
  r record;
begin
  -- ── Catálogo ──
  insert into resultados (teste, passou) values ('Catálogo aprovado carregado: 12 categorias, 41 procedimentos, 56 etapas',
    (select count(*) from public.procedure_categories) = 12 and (select count(*) from public.procedures) = 41
    and (select count(*) from public.procedure_steps) = 56);

  insert into resultados (teste, passou) values ('Laminado cerâmico: Preparo (dente) · Provisório (peça) · Cimentação (peça, conclui)',
    (select string_agg(s.name || ':' || s.unit || ':' || s.completes, ',' order by s.position)
       from public.procedure_steps s join public.procedures p on p.id = s.procedure_id where p.slug = 'laminado-ceramico')
    = 'Preparo:dente:false,Provisório:peca:false,Cimentação:peca:true');

  insert into resultados (teste, passou) values ('Clareamentos, procedimentos gerais e "Outro" só contam como experiência (sem etapa que conclui)',
    not exists (select 1 from public.procedure_steps s join public.procedures p on p.id = s.procedure_id
                where s.completes and (p.kind = 'geral' or p.slug like 'clareamento-%'))
    and (select requires_description from public.procedure_steps where id = pg_temp.etapa('outro-procedimento', 'outro-procedimento')));

  ok := false;
  begin
    insert into public.procedure_steps (procedure_id, name, slug, unit, completes)
    values ((select id from public.procedures where slug = 'laminado-ceramico'), 'Outra conclusão', 'outra-conclusao', 'peca', true);
  exception when unique_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('No máximo uma etapa que conclui por procedimento', ok);

  ok := false;
  begin
    insert into public.procedure_steps (procedure_id, name, slug, unit, completes)
    values ((select id from public.procedures where slug = 'mock-up'), 'Conclusão', 'conclusao', 'caso', true);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Procedimento geral não aceita etapa que conclui', ok);

  perform pg_temp.entrar(a);
  select count(*) into n from public.procedure_steps;
  reset role;
  insert into resultados (teste, passou) values ('Aluno lê o catálogo (para registrar)', n = 56);

  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.procedures (category_id, name, slug) values ((select id from public.procedure_categories where slug = 'outros'), 'Da coordenação', 'da-coordenacao');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Só admin altera o catálogo (coordenação não)', ok);

  perform pg_temp.entrar(d);
  insert into public.procedures (id, category_id, name, slug, synonyms)
  values ('00000000-0000-4000-9000-0000000000c1', (select id from public.procedure_categories where slug = 'outros'), 'Procedimento do admin', 'procedimento-do-admin', array['teste']);
  insert into public.procedure_steps (procedure_id, name, slug, unit, completes)
  values ('00000000-0000-4000-9000-0000000000c1', 'Única', 'unica', 'dente', true);
  update public.procedures set name = 'Procedimento do admin (editado)' where id = '00000000-0000-4000-9000-0000000000c1';
  reset role;
  insert into resultados (teste, passou) values ('Admin cria procedimento e etapa; o histórico registra "de → para"',
    exists (select 1 from public.change_log where table_name = 'procedures' and row_id = '00000000-0000-4000-9000-0000000000c1'
            and action = 'update' and actor = d and changes -> 'name' ->> 'para' = 'Procedimento do admin (editado)'));

  -- ── Criar caso e registrar ──
  perform pg_temp.entrar(a);
  insert into public.clinical_cases (cohort_id, patient_label) values (t1, ' m.a.s. ') returning id into caso_a;
  reset role;
  insert into ids values ('caso_a', caso_a);
  insert into resultados (teste, passou) values ('Aluno cria caso na própria turma (código em maiúsculas, dono = aluno)',
    (select patient_label = 'M.A.S.' and owner_id = a from public.clinical_cases where id = caso_a));

  ok := true;
  for r in select unnest(array['Maria Silva', 'José Lima', 'MARIASILVA', '12345678909', '11987654321']) as label loop
    begin
      perform pg_temp.entrar(a);
      insert into public.clinical_cases (cohort_id, patient_label) values (t1, r.label);
      reset role;
      ok := false;
    exception when check_violation then reset role;
    end;
  end loop;
  insert into resultados (teste, passou) values ('Identificação recusa nome ("Maria Silva", "José Lima", "MARIASILVA"), CPF e telefone', ok);

  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.clinical_cases (cohort_id, patient_label) values (t2, 'X.Y.');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Aluno não cria caso em turma em que não está matriculado', ok);

  ok := false;
  perform pg_temp.entrar(c);
  begin
    insert into public.clinical_cases (cohort_id, patient_label) values (t1, 'C.O.');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação não cria casos (só alunos registram)', ok);

  perform pg_temp.entrar(a);
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
  values (caso_a, pg_temp.etapa('laminado-ceramico', 'preparo'), hoje - 9, 4, '{12,11,21,22}') returning id into reg;
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
  values (caso_a, pg_temp.etapa('laminado-ceramico', 'cimentacao'), hoje - 2, 4, '{12,11,21,22}');
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, arch)
  values (caso_a, pg_temp.etapa('escaneamento-intraoral', 'escaneamento-intraoral'), hoje - 30, 2, 'ambas');
  reset role;
  insert into ids values ('reg', reg);
  insert into resultados (teste, passou) values ('Registro copia dono, turma e procedimento da etapa',
    (select owner_id = a and cohort_id = t1 and procedure_id = (select id from public.procedures where slug = 'laminado-ceramico')
       from public.performed_procedures where id = reg));
  insert into resultados (teste, passou) values ('Módulo automático pela data: durante o módulo → ele; depois → o último; antes de todos → nenhum',
    (select module_id = '00000000-0000-4000-d000-0000000000c1' from public.performed_procedures where id = reg)
    and (select module_id = '00000000-0000-4000-d000-0000000000c1' from public.performed_procedures where case_id = caso_a and performed_on = hoje - 2)
    and (select module_id is null from public.performed_procedures where case_id = caso_a and performed_on = hoje - 30));
  insert into resultados (teste, passou) values ('Caso guarda início e última atividade a partir dos registros',
    (select started_on = hoje - 30 and last_activity_on = hoje - 2 from public.clinical_cases where id = caso_a));

  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity)
    values (caso_a, pg_temp.etapa('mock-up', 'mock-up'), hoje + 1, 1);
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Data no futuro é recusada', ok);

  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity)
    values (caso_a, pg_temp.etapa('outro-procedimento', 'outro-procedimento'), hoje, 1);
  exception when check_violation then ok := true;
  end;
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, other_description)
  values (caso_a, pg_temp.etapa('outro-procedimento', 'outro-procedimento'), hoje, 1, 'Remoção de Bráquetes');
  reset role;
  insert into resultados (teste, passou) values ('"Outro procedimento" exige descrição; a descrição é guardada também normalizada',
    ok and exists (select 1 from public.performed_procedures where case_id = caso_a and other_description_norm = 'remocao de braquetes'));

  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
    values (caso_a, pg_temp.etapa('exodontia', 'exodontia'), hoje, 1, '{19}');
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Dente fora da notação FDI é recusado', ok);

  ok := false;
  perform pg_temp.entrar(a);
  begin
    update public.clinical_cases set difficulty_text = 'Paciente CPF 123.456.789-09' where id = caso_a;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Texto com CPF ou telefone é recusado nas reflexões', ok);

  perform pg_temp.entrar(a);
  update public.clinical_cases set owner_id = b, cohort_id = t2, status = 'concluido' where id = caso_a;
  reset role;
  insert into resultados (teste, passou) values ('Dono e turma do caso não mudam; concluir carimba a data',
    (select owner_id = a and cohort_id = t1 and concluded_on = hoje from public.clinical_cases where id = caso_a));
  perform pg_temp.entrar(a);
  update public.clinical_cases set status = 'em_andamento' where id = caso_a;
  reset role;

  -- ── Temas de dificuldade ──
  perform pg_temp.entrar(a);
  select count(*) into n from public.suggest_topics('Tive dificuldade na fotografia odontológica do caso') s
   where s.name = 'Fotografia odontológica';
  insert into public.case_difficulty_topics (case_id, topic_id)
  select caso_a, id from public.topics where archived_at is null order by name limit 3;
  reset role;
  ok := false;
  perform pg_temp.entrar(a);
  begin
    insert into public.case_difficulty_topics (case_id, topic_id)
    select caso_a, id from public.topics where archived_at is null order by name offset 3 limit 1;
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Temas sugeridos pelo texto (sem IA); no máximo 3 temas por caso', n = 1 and ok);

  -- ── Isolamento ──
  perform pg_temp.entrar(b);
  select count(*) into n from public.clinical_cases;
  select n + count(*) into n from public.performed_procedures;
  select n + count(*) into n from public.case_difficulty_topics;
  reset role;
  insert into resultados (teste, passou) values ('Colega da mesma turma não vê casos, registros nem temas de outro aluno', n = 0);

  ok := false;
  perform pg_temp.entrar(b);
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity) values (caso_a, pg_temp.etapa('mock-up', 'mock-up'), hoje, 1);
  exception when insufficient_privilege then ok := true;
  end;
  update public.clinical_cases set title = 'invasão' where id = caso_a;
  get diagnostics n = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Colega não registra nem edita no caso de outro aluno', ok and n = 0);

  perform pg_temp.entrar(e);
  insert into public.clinical_cases (cohort_id, patient_label) values (t2, 'E.T.') returning id into caso_e;
  reset role;
  perform pg_temp.entrar(c);
  select count(*) into n from public.clinical_cases where id = caso_a;
  select count(*) = 0 into ok from public.clinical_cases where id = caso_e;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação lê os casos da própria turma, não os de outra turma', n = 1 and ok);

  perform pg_temp.entrar(c);
  select count(*) into n from public.performed_procedures where case_id = caso_a;
  update public.clinical_cases set title = 'pela coordenação' where id = caso_a;
  get diagnostics m = row_count;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação lê os registros, mas não edita o caso', n = 4 and m = 0 and (select title is null from public.clinical_cases where id = caso_a));

  perform pg_temp.entrar(d);
  select count(*) into n from public.clinical_cases where id in (caso_a, caso_e);
  reset role;
  insert into resultados (teste, passou) values ('Admin lê casos de qualquer turma', n = 2);

  perform pg_temp.entrar(g);
  select count(*) into n from public.clinical_cases;
  reset role;
  insert into public.case_access_grants (case_id, grantee_id, granted_by, reason) values (caso_a, g, d, 'Supervisão autorizada');
  perform pg_temp.entrar(g);
  select n * 10 + count(*) into n from public.clinical_cases;
  reset role;
  update public.case_access_grants set expires_at = now() - interval '1 day' where case_id = caso_a;
  perform pg_temp.entrar(g);
  select n * 10 + count(*) into n from public.clinical_cases;
  reset role;
  insert into resultados (teste, passou) values ('Supervisor/terceiro só lê com acesso extra vigente (sem acesso → nada; expirado → nada)', n = 10);

  ok := false;
  perform pg_temp.visitante();
  begin
    perform 1 from public.clinical_cases;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Visitante sem login não lê casos', ok);

  -- ── Auditoria ──
  perform pg_temp.entrar(c);
  perform public.log_case_view(caso_a);
  reset role;
  perform pg_temp.entrar(a);
  perform public.log_case_view(caso_a);
  reset role;
  perform pg_temp.entrar(b);
  select public.log_case_view(caso_a) into ok;
  reset role;
  insert into resultados (teste, passou) values ('Abertura pela coordenação vai para a auditoria; a do próprio aluno não; colega não abre',
    (select count(*) from public.audit_log where entity_id = caso_a and action = 'caso.abrir') = 1
    and exists (select 1 from public.audit_log where entity_id = caso_a and actor = c and cohort_id = t1 and owner_id = a)
    and not ok);

  perform pg_temp.entrar(c);
  select count(*) into n from public.audit_log;
  reset role;
  perform pg_temp.entrar(a);
  select n * 10 + count(*) into n from public.audit_log;
  reset role;
  insert into resultados (teste, passou) values ('Coordenação vê a auditoria da própria turma; aluno não vê auditoria', n = 10);

  -- ── Base da Produção ──
  perform pg_temp.entrar(a);
  select
    coalesce(sum(quantity) filter (where procedure_id = (select id from public.procedures where slug = 'laminado-ceramico')), 0) * 100
    + coalesce(sum(quantity) filter (where completes and procedure_id = (select id from public.procedures where slug = 'laminado-ceramico')), 0)
    into n from public.active_performed_procedures;
  reset role;
  insert into resultados (teste, passou) values ('Produção: 4 preparos + 4 cimentações = experiência 8, concluídos 4 (não 8)', n = 804);

  -- ── Exclusão lógica ──
  perform pg_temp.entrar(a);
  update public.performed_procedures set removed_at = now() where id = reg;
  select coalesce(sum(quantity), 0) into n from public.active_performed_procedures where step_id = pg_temp.etapa('laminado-ceramico', 'preparo');
  reset role;
  perform pg_temp.entrar(c);
  select n * 10 + count(*) into n from public.performed_procedures where id = reg;
  reset role;
  insert into resultados (teste, passou) values ('Registro excluído pelo aluno sai da Produção e da vista da coordenação', n = 0);

  perform pg_temp.entrar(a);
  update public.performed_procedures set removed_at = null where id = reg;
  update public.clinical_cases set removed_at = now() where id = caso_a;
  select count(*) into n from public.clinical_cases where id = caso_a;
  select n * 10 + count(*) into n from public.active_performed_procedures where case_id = caso_a;
  reset role;
  perform pg_temp.entrar(c);
  select n * 10 + count(*) into n from public.clinical_cases where id = caso_a;
  select n * 10 + count(*) into n from public.performed_procedures where case_id = caso_a;
  reset role;
  insert into resultados (teste, passou) values ('Caso excluído: o aluno ainda o vê (para restaurar); some da Produção e da coordenação', n = 1000);

  perform pg_temp.entrar(a);
  update public.clinical_cases set removed_at = null where id = caso_a;
  select count(*) into n from public.active_performed_procedures where case_id = caso_a;
  reset role;
  insert into resultados (teste, passou) values ('Restaurar devolve o caso e os registros à Produção, com as datas originais', n = 4);

  ok := false;
  perform pg_temp.entrar(a);
  begin
    delete from public.clinical_cases where id = caso_a;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  perform pg_temp.entrar(d);
  begin
    delete from public.performed_procedures where case_id = caso_a;
    ok := false;
  exception when insufficient_privilege then null;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Ninguém apaga casos ou registros diretamente (nem o aluno, nem o admin)', ok);

  -- ── Exclusão definitiva ──
  ok := false;
  perform pg_temp.entrar(c);
  begin
    perform public.purge_case(caso_a, 'Pedido do titular');
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Exclusão definitiva: coordenação não pode', ok);

  ok := false;
  perform pg_temp.entrar(d);
  begin
    perform public.purge_case(caso_a, 'Pedido do titular');
  exception when check_violation then ok := true;
  end;
  reset role;
  insert into resultados (teste, passou) values ('Exclusão definitiva só de caso já excluído pelo aluno', ok);

  perform pg_temp.entrar(a);
  update public.clinical_cases set removed_at = now() where id = caso_a;
  reset role;
  ok := false;
  perform pg_temp.entrar(d);
  begin
    perform public.purge_case(caso_a, '');
  exception when check_violation then ok := true;
  end;
  perform public.purge_case(caso_a, 'Nome do paciente digitado por engano');
  reset role;
  insert into resultados (teste, passou) values ('Admin exclui definitivamente (com motivo): caso, registros e temas apagados',
    ok and not exists (select 1 from public.clinical_cases where id = caso_a)
    and not exists (select 1 from public.performed_procedures where case_id = caso_a)
    and not exists (select 1 from public.case_difficulty_topics where case_id = caso_a));
  insert into resultados (teste, passou) values ('Auditoria da exclusão definitiva: quem, motivo e contagens, sem conteúdo clínico',
    exists (select 1 from public.audit_log where action = 'caso.excluir_definitivo' and entity_id = caso_a and actor = d
            and owner_id = a and cohort_id = t1 and details ->> 'motivo' = 'Nome do paciente digitado por engano'
            and (details ->> 'registros')::int = 4 and (details ->> 'temas')::int = 3
            and details::text not like '%M.A.S.%'));

  -- ── Turma encerrada ──
  perform pg_temp.entrar(e);
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity) values (caso_e, pg_temp.etapa('mock-up', 'mock-up'), hoje, 1);
  reset role;
  update public.cohorts set status = 'encerrada' where id = t2;
  ok := false;
  perform pg_temp.entrar(e);
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity) values (caso_e, pg_temp.etapa('mock-up', 'mock-up'), hoje, 1);
  exception when insufficient_privilege then ok := true;
  end;
  update public.clinical_cases set title = 'depois do fim' where id = caso_e;
  get diagnostics n = row_count;
  select ok and n = 0 and count(*) = 1 into ok from public.clinical_cases where id = caso_e;
  reset role;
  insert into resultados (teste, passou) values ('Turma encerrada: o aluno continua lendo, mas não registra nem edita', ok);
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
