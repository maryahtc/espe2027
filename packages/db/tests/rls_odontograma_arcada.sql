-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Testes — odontograma (posições FDI) e arcada: localização das etapas e coerência dos registros.

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

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid'),
  ('00000000-0000-4000-a000-0000000000d0', 'd@teste.invalid');
alter table public.profiles disable trigger profiles_guard;
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000d0';
alter table public.profiles enable trigger profiles_guard;
insert into public.cohorts (id, name, slug, starts_on, ends_on) values
  ('00000000-0000-4000-b000-0000000000f1', 'Turma Odontograma', 'teste-odonto', '2026-01-01', '2028-07-31');
insert into public.enrollments (user_id, cohort_id, role_in_cohort) values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-b000-0000000000f1', 'aluno');

do $$
declare
  ok boolean;
  a constant uuid := '00000000-0000-4000-a000-00000000000a';
  adm constant uuid := '00000000-0000-4000-a000-0000000000d0';
  caso uuid;
  r uuid;
  q integer;
  e text;
begin
  -- Catálogo: localização pela unidade; nas etapas por peça, placa oclusal → arcada e as demais → dentes.
  insert into resultados (teste, passou) values ('Unidade dente → dentes; arcada → arcada; caso → nenhuma',
    not exists (select 1 from public.procedure_steps where (unit = 'dente' and location <> 'dentes')
      or (unit = 'arcada' and location <> 'arcada') or (unit = 'caso' and location <> 'nenhuma')));
  insert into resultados (teste, passou) values ('Etapas por peça: 11 com dentes e só a placa oclusal com arcada',
    (select count(*) from public.procedure_steps where unit = 'peca' and location = 'dentes') = 11
    and (select count(*) from public.procedure_steps where unit = 'peca' and location = 'arcada') = 1
    and (select location from public.procedure_steps where id = pg_temp.etapa('placa-oclusal', 'instalacao')) = 'arcada'
    and (select location from public.procedure_steps where id = pg_temp.etapa('protese-parcial-fixa-dentossuportada', 'cimentacao')) = 'dentes');
  insert into resultados (teste, passou) values ('Catálogo aprovado intacto (12 categorias, 41 procedimentos, 56 etapas)',
    (select count(*) from public.procedure_categories) = 12 and (select count(*) from public.procedures) = 41
    and (select count(*) from public.procedure_steps) = 56);

  -- Admin: só etapas por peça têm localização escolhida; nas demais ela segue a unidade.
  perform pg_temp.entrar(adm);
  update public.procedure_steps set location = 'arcada' where id = pg_temp.etapa('laminado-ceramico', 'preparo');
  update public.procedure_steps set location = 'nenhuma' where id = pg_temp.etapa('escaneamento-intraoral', 'escaneamento-intraoral');
  reset role;
  insert into resultados (teste, passou) values ('Etapa por dente/arcada não muda de localização (segue a unidade)',
    (select location from public.procedure_steps where id = pg_temp.etapa('laminado-ceramico', 'preparo')) = 'dentes'
    and (select location from public.procedure_steps where id = pg_temp.etapa('escaneamento-intraoral', 'escaneamento-intraoral')) = 'arcada');
  perform pg_temp.entrar(adm);
  update public.procedure_steps set location = 'arcada' where id = pg_temp.etapa('coroa-total', 'provisorio');
  reset role;
  insert into resultados (teste, passou) values ('Etapa por peça: o Admin escolhe a localização',
    (select location from public.procedure_steps where id = pg_temp.etapa('coroa-total', 'provisorio')) = 'arcada');
  perform pg_temp.entrar(adm);
  update public.procedure_steps set location = 'dentes' where id = pg_temp.etapa('coroa-total', 'provisorio');
  reset role;

  -- Registros
  perform pg_temp.entrar(a);
  insert into public.clinical_cases (cohort_id, patient_label) values ('00000000-0000-4000-b000-0000000000f1', 'O.D.') returning id into caso;

  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
    values (caso, pg_temp.etapa('laminado-ceramico', 'preparo'), current_date - 1, 7, '{12,11,21,22}') returning id, quantity into r, q;
  insert into resultados (teste, passou) values ('Com posições FDI, a quantidade é o número de posições (7 → 4)', q = 4);

  insert into public.performed_procedures (case_id, step_id, performed_on, quantity)
    values (caso, pg_temp.etapa('laminado-ceramico', 'preparo'), current_date - 1, 3) returning quantity into q;
  insert into resultados (teste, passou) values ('Sem posições marcadas, a quantidade continua livre', q = 3);

  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
    values (caso, pg_temp.etapa('protese-parcial-fixa-dentossuportada', 'cimentacao'), current_date - 1, 1, '{14,15,16}') returning quantity into q;
  insert into resultados (teste, passou) values ('Prótese parcial fixa: posições FDI dos elementos (inclui pôntico) → 3 peças', q = 3);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth, arch)
      values (caso, pg_temp.etapa('laminado-ceramico', 'preparo'), current_date - 1, 1, '{11}', 'superior');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Etapa de dentes recusa arcada', ok);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity)
      values (caso, pg_temp.etapa('escaneamento-intraoral', 'escaneamento-intraoral'), current_date - 1, 1);
  exception when check_violation then ok := true; e := sqlerrm;
  end;
  insert into resultados (teste, passou) values ('Etapa por arcada exige superior, inferior ou ambas', ok and e like 'Informe a arcada%');

  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, arch)
    values (caso, pg_temp.etapa('escaneamento-intraoral', 'escaneamento-intraoral'), current_date - 1, 1, 'ambas') returning quantity into q;
  insert into resultados (teste, passou) values ('Arcada "ambas" → quantidade 2', q = 2);
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, arch)
    values (caso, pg_temp.etapa('placa-oclusal', 'instalacao'), current_date - 1, 2, 'superior') returning quantity into q;
  insert into resultados (teste, passou) values ('Placa oclusal (peça por arcada): superior → 1 peça', q = 1);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth, arch)
      values (caso, pg_temp.etapa('moldagem-convencional', 'moldagem-convencional'), current_date - 1, 1, '{16}', 'superior');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Etapa por arcada recusa posições FDI (não descarta em silêncio)', ok);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
      values (caso, pg_temp.etapa('mock-up', 'mock-up'), current_date - 1, 1, '{11}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Etapa sem localização recusa posições FDI', ok);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, arch)
      values (caso, pg_temp.etapa('mock-up', 'mock-up'), current_date - 1, 1, 'inferior');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Etapa sem localização recusa arcada', ok);

  ok := false;
  begin
    insert into public.performed_procedures (case_id, step_id, performed_on, quantity, teeth)
      values (caso, pg_temp.etapa('laminado-ceramico', 'preparo'), current_date - 1, 1, '{51}');
  exception when check_violation then ok := true;
  end;
  insert into resultados (teste, passou) values ('Só FDI permanente 11–48 (decíduos fora)', ok);

  -- Editar posições: a quantidade acompanha.
  update public.performed_procedures set teeth = '{11,21}' where id = r;
  insert into resultados (teste, passou) values ('Editar posições ajusta a quantidade', (select quantity from public.performed_procedures where id = r) = 2);
  reset role;

  -- Se o Admin mudar a localização de uma etapa, os registros antigos continuam removíveis/restauráveis.
  perform pg_temp.entrar(adm);
  update public.procedure_steps set location = 'arcada' where id = pg_temp.etapa('coroa-total', 'cimentacao');
  reset role;
  perform pg_temp.entrar(a);
  insert into public.performed_procedures (case_id, step_id, performed_on, quantity, arch)
    values (caso, pg_temp.etapa('coroa-total', 'cimentacao'), current_date - 1, 1, 'inferior') returning id into r;
  update public.performed_procedures set removed_at = now() where id = r;
  update public.performed_procedures set removed_at = null where id = r;
  insert into resultados (teste, passou) values ('Remover e restaurar registro não esbarra na regra de localização',
    (select removed_at is null from public.performed_procedures where id = r));
  reset role;

  perform pg_temp.entrar(a);
  insert into resultados (teste, passou) values ('Base da Produção expõe arcada e localização',
    (select count(*) from public.active_performed_procedures where case_id = caso and arch = 'ambas' and location = 'arcada') = 1
    and (select sum(quantity) from public.active_performed_procedures where case_id = caso and location = 'dentes') = 8);
  reset role;
end
$$;

select ordem, teste, passou from resultados order by ordem;

rollback;
