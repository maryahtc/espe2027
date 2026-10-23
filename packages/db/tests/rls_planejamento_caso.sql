-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — Etapa 8 · Planejamento do caso: isolamento, regras herdadas, vínculo com consulta real, somente leitura,
-- limites, exclusão definitiva e separação absoluta entre planejado e realizado. Transação desfeita no final.
-- Pessoas: A e B (alunos T1) · C (coordena T1) · X (coordena T2) · D (admin).

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

create function pg_temp.etapa(p_proc text, p_step text) returns uuid language sql as $$
  select s.id from public.procedure_steps s join public.procedures p on p.id = s.procedure_id
  where p.slug = p_proc and s.slug = p_step
$$;
create function pg_temp.unica(p_proc text) returns uuid language sql as $$
  select s.id from public.procedure_steps s join public.procedures p on p.id = s.procedure_id where p.slug = p_proc
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000c0', 'c@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000e0', 'x@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'coordenacao' where id in ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-a000-0000000000e0');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000008a1', 'Turma Plano', 'teste-plano', '2026-01-01', '2028-07-31'),
  ('00000000-0000-4000-b000-0000000008a2', 'Turma Plano 2', 'teste-plano-2', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000008a1', 'aluno'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-b000-0000000008a1', 'aluno'),
  ('00000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-b000-0000000008a1', 'coordenacao'),
  ('00000000-0000-4000-a000-0000000000e0', '00000000-0000-4000-b000-0000000008a2', 'coordenacao');

do $$
declare
  ok boolean;
  e text;
  n integer;
  q integer;
  a constant uuid := '00000000-0000-4000-a000-00000000000a';
  b constant uuid := '00000000-0000-4000-a000-00000000000b';
  c constant uuid := '00000000-0000-4000-a000-0000000000c0';
  x constant uuid := '00000000-0000-4000-a000-0000000000e0';
  adm constant uuid := '00000000-0000-4000-a000-0000000000d0';
  t1 constant uuid := '00000000-0000-4000-b000-0000000008a1';
  caso uuid;
  v1 uuid;
  v2 uuid;
  i1 uuid;
  dia constant date := current_date - 2;
  fp_rec text;
  fp_view text;
begin
  -- ── Aluno A: caso, consulta planejada e itens (mesmo catálogo, mesmas regras) ──
  perform pg_temp.entrar(a);
  insert into public.clinical_cases (cohort_id, patient_label) values (t1, 'P.L.') returning id into caso;
  insert into public.case_plan_visits (case_id, position, note) values (caso, 1, 'Conferir cor antes') returning id into v1;
  insert into resultados (teste, passou) values ('Aluno cria consulta planejada; dono copiado do caso',
    (select owner_id from public.case_plan_visits where id = v1) = a);

  insert into public.case_plan_items (visit_id, step_id, quantity, teeth)
    values (v1, pg_temp.etapa('laminado-ceramico', 'preparo'), 9, '{12,11,21,22}') returning id, quantity into i1, q;
  insert into resultados (teste, passou) values ('Item planejado: mesma regra do registro (4 posições → quantidade 4)', q = 4);
  insert into resultados (teste, passou) values ('Item copia caso, dono e procedimento',
    (select case_id = caso and owner_id = a and procedure_id = (select procedure_id from public.procedure_steps where id = pg_temp.etapa('laminado-ceramico', 'preparo'))
     from public.case_plan_items where id = i1));

  insert into public.case_plan_items (visit_id, step_id, quantity, arch)
    values (v1, pg_temp.unica('escaneamento-intraoral'), 1, 'ambas') returning quantity into q;
  insert into resultados (teste, passou) values ('Item por arcada: "ambas" → quantidade 2 (gatilho da Etapa 6 reutilizado)', q = 2);

  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity) values (v1, pg_temp.unica('escaneamento-intraoral'), 1);
  exception when check_violation then ok := true; e := sqlerrm;
  end;
  insert into resultados (teste, passou) values ('Item por arcada exige arcada (mesma mensagem do registro)', ok and e like 'Informe a arcada%');

  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity, teeth) values (v1, pg_temp.unica('mock-up'), 1, '{11}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Item sem localização recusa dentes', ok);

  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity, teeth) values (v1, pg_temp.etapa('laminado-ceramico', 'preparo'), 1, '{19}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Dente fora da notação FDI recusado', ok);

  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity) values (v1, pg_temp.unica('outro-procedimento'), 1);
  exception when check_violation then ok := true;
  end;
  insert into public.case_plan_items (visit_id, step_id, quantity, other_description) values (v1, pg_temp.unica('outro-procedimento'), 1, '  Remoção de bráquetes ');
  insert into resultados (teste, passou) values ('"Outro procedimento": descrição obrigatória (e aparada)',
    ok and exists (select 1 from public.case_plan_items where visit_id = v1 and other_description = 'Remoção de bráquetes'));

  ok := false;
  begin
    update public.case_plan_visits set note = 'Paciente 123.456.789-09' where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Observação recusa CPF/telefone', ok);
  ok := false;
  begin
    update public.case_plan_visits set note = repeat('a', 201) where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Observação até 200 caracteres', ok);

  ok := false;
  begin
    insert into public.case_plan_visits (case_id, realized_on) values (caso, dia);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Consulta planejada nasce sem vínculo', ok);
  reset role;

  -- Etapa desativada no catálogo: item novo recusado
  update public.procedure_steps set active = false where id = pg_temp.unica('exodontia');
  perform pg_temp.entrar(a);
  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity, teeth) values (v1, pg_temp.unica('exodontia'), 1, '{36}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Etapa desativada recusada em item novo', ok);
  reset role;
  update public.procedure_steps set active = true where id = pg_temp.unica('exodontia');

  -- ── Isolamento e leitura ──
  perform pg_temp.entrar(b);
  insert into resultados (teste, passou) values ('Colega não vê o planejamento',
    (select count(*) from public.case_plan_visits where case_id = caso) = 0 and (select count(*) from public.case_plan_items where case_id = caso) = 0);
  ok := false;
  begin
    insert into public.case_plan_visits (case_id) values (caso);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Colega não cria consulta no caso de outro', ok);
  update public.case_plan_visits set note = 'x' where id = v1;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Colega não altera', n = 0);
  reset role;

  perform pg_temp.entrar(c);
  insert into resultados (teste, passou) values ('Coordenação da turma lê o planejamento',
    (select count(*) from public.case_plan_visits where case_id = caso) = 1 and (select count(*) from public.case_plan_items where case_id = caso) = 3);
  update public.case_plan_visits set note = 'coord' where id = v1;
  get diagnostics n = row_count;
  delete from public.case_plan_items where case_id = caso;
  get diagnostics q = row_count;
  ok := false;
  begin
    insert into public.case_plan_visits (case_id) values (caso);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Coordenação não cria, altera nem apaga', n = 0 and q = 0 and ok);
  reset role;

  perform pg_temp.entrar(x);
  insert into resultados (teste, passou) values ('Coordenação de outra turma não vê',
    (select count(*) from public.case_plan_visits where case_id = caso) = 0);
  reset role;

  perform pg_temp.entrar(adm);
  update public.case_plan_visits set note = 'admin' where id = v1;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Admin lê e não escreve',
    (select count(*) from public.case_plan_visits where case_id = caso) = 1 and n = 0);
  reset role;

  -- ── Vínculo com consulta real ──
  perform pg_temp.entrar(a);
  ok := false;
  begin
    update public.case_plan_visits set realized_on = dia where id = v1;
  exception when check_violation then ok := true; e := sqlerrm;
  end;
  insert into resultados (teste, passou) values ('Vínculo exige consulta real com registro ativo na data', ok and e like 'Só é possível vincular%');

  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
    values (caso, pg_temp.etapa('laminado-ceramico', 'preparo'), dia, 1, '{11,21}');
  select count(*) || '|' || md5(coalesce(string_agg(r::text, '' order by r.id), '')) into fp_rec from public.performed_procedures r where case_id = caso;
  select count(*) || '|' || md5(coalesce(string_agg(r::text, '' order by r.id), '')) into fp_view from public.active_performed_procedures r where case_id = caso;

  update public.case_plan_visits set realized_on = dia where id = v1;
  insert into resultados (teste, passou) values ('Vincula à consulta real (caso + data)', (select realized_on from public.case_plan_visits where id = v1) = dia);

  ok := false;
  begin
    update public.case_plan_visits set note = 'mudar' where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: observação não muda', ok);
  ok := false;
  begin
    update public.case_plan_visits set position = 9 where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: posição não muda', ok);
  ok := false;
  begin
    update public.case_plan_visits set realized_on = dia - 1 where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: não troca de data (desfazer antes)', ok);
  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity, teeth) values (v1, pg_temp.etapa('laminado-ceramico', 'cimentacao'), 1, '{11}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: não aceita item novo', ok);
  ok := false;
  begin
    update public.case_plan_items set teeth = '{11}' where id = i1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: item não muda', ok);
  ok := false;
  begin
    delete from public.case_plan_items where id = i1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: item não é apagado', ok);
  ok := false;
  begin
    delete from public.case_plan_visits where id = v1;
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Vinculada: consulta não é apagada', ok);

  insert into public.case_plan_visits (case_id, position) values (caso, 2) returning id into v2;
  ok := false;
  begin
    update public.case_plan_visits set realized_on = dia where id = v2;
  exception when unique_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Uma consulta real vincula no máximo uma consulta planejada', ok);

  update public.case_plan_visits set realized_on = null where id = v1;
  update public.case_plan_items set teeth = '{11,21}' where id = i1 returning quantity into q;
  insert into resultados (teste, passou) values ('Desfazer vínculo volta a permitir edição (2 posições → quantidade 2)',
    (select realized_on is null from public.case_plan_visits where id = v1) and q = 2);

  -- Planejado × realizado: nada do planejamento tocou registros ou a base da Produção.
  insert into resultados (teste, passou) values ('Registros reais e base da Produção idênticos depois de todas as operações do plano',
    (select count(*) || '|' || md5(coalesce(string_agg(r::text, '' order by r.id), '')) from public.performed_procedures r where case_id = caso) = fp_rec
    and (select count(*) || '|' || md5(coalesce(string_agg(r::text, '' order by r.id), '')) from public.active_performed_procedures r where case_id = caso) = fp_view);

  -- Registro real removido depois do vínculo: o vínculo fica (a tela mostra "nenhum registro ativo"), sem erro.
  update public.case_plan_visits set realized_on = dia where id = v1;
  update public.performed_procedures set removed_at = now() where case_id = caso;
  insert into resultados (teste, passou) values ('Remover o registro real não quebra o vínculo existente',
    (select realized_on from public.case_plan_visits where id = v1) = dia);
  update public.performed_procedures set removed_at = null where case_id = caso;
  update public.case_plan_visits set realized_on = null where id = v1;
  reset role;

  -- ── Limites ──
  perform pg_temp.entrar(a);
  for n in 3..20 loop
    insert into public.case_plan_visits (case_id, position) values (caso, n);
  end loop;
  ok := false;
  begin
    insert into public.case_plan_visits (case_id, position) values (caso, 21);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('No máximo 20 consultas planejadas por caso', ok and (select count(*) from public.case_plan_visits where case_id = caso) = 20);
  for n in 1..12 loop
    insert into public.case_plan_items (visit_id, step_id, quantity) values (v2, pg_temp.unica('mock-up'), 1);
  end loop;
  -- v2 já tem 0 itens antes do laço; completa 15
  insert into public.case_plan_items (visit_id, step_id, quantity) values (v2, pg_temp.unica('mock-up'), 1), (v2, pg_temp.unica('mock-up'), 1), (v2, pg_temp.unica('mock-up'), 1);
  ok := false;
  begin
    insert into public.case_plan_items (visit_id, step_id, quantity) values (v2, pg_temp.unica('mock-up'), 1);
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('No máximo 15 itens por consulta planejada', ok and (select count(*) from public.case_plan_items where visit_id = v2) = 15);
  delete from public.case_plan_visits where case_id = caso and position >= 3;
  delete from public.case_plan_items where visit_id = v2;
  reset role;

  -- ── Somente leitura: caso concluído, caso removido, turma encerrada ──
  perform pg_temp.entrar(a);
  update public.clinical_cases set status = 'concluido' where id = caso;
  update public.case_plan_visits set note = 'concluido' where id = v1;
  get diagnostics n = row_count;
  ok := false;
  begin
    insert into public.case_plan_visits (case_id) values (caso);
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Caso concluído: planejamento somente leitura', n = 0 and ok
    and (select count(*) from public.case_plan_visits where case_id = caso) = 2);
  update public.clinical_cases set status = 'em_andamento' where id = caso;
  update public.case_plan_visits set note = 'reaberto' where id = v1;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Reabrir o caso volta a permitir edição', n = 1);

  update public.clinical_cases set removed_at = now() where id = caso;
  update public.case_plan_visits set note = 'removido' where id = v1;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Caso removido: somente leitura (o dono ainda lê)', n = 0
    and (select count(*) from public.case_plan_visits where case_id = caso) = 2);
  reset role;
  perform pg_temp.entrar(c);
  insert into resultados (teste, passou) values ('Caso removido: coordenação deixa de ver o planejamento',
    (select count(*) from public.case_plan_visits where case_id = caso) = 0);
  reset role;
  perform pg_temp.entrar(a);
  update public.clinical_cases set removed_at = null where id = caso;
  reset role;

  update public.cohorts set status = 'encerrada' where id = t1;
  perform pg_temp.entrar(a);
  update public.case_plan_visits set note = 'encerrada' where id = v1;
  get diagnostics n = row_count;
  insert into resultados (teste, passou) values ('Turma encerrada: somente leitura', n = 0 and (select count(*) from public.case_plan_visits where case_id = caso) = 2);
  reset role;
  update public.cohorts set status = 'ativa' where id = t1;

  -- ── Exclusão definitiva (admin) apaga o planejamento junto, mesmo com consulta vinculada ──
  perform pg_temp.entrar(a);
  update public.case_plan_visits set realized_on = dia where id = v1;
  update public.clinical_cases set removed_at = now() where id = caso;
  reset role;
  perform pg_temp.entrar(adm);
  perform public.purge_case(caso, 'Pedido do titular');
  reset role;
  insert into resultados (teste, passou) values ('Exclusão definitiva do caso apaga consultas e itens planejados',
    (select count(*) from public.case_plan_visits where case_id = caso) = 0 and (select count(*) from public.case_plan_items where case_id = caso) = 0);

  -- ── Anônimo não lê nada ──
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  ok := false;
  begin
    perform count(*) from public.case_plan_visits;
  exception when insufficient_privilege then ok := true;
  end;
  insert into resultados (teste, passou) values ('Anônimo sem acesso às tabelas do planejamento', ok);
  reset role;
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
