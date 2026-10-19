-- Etapa 6 · Parte 1 — Meus casos: estrutura do banco, regras de acesso e segurança.
-- Migração só aditiva: tabelas, tipos, funções, gatilhos, visão e políticas novas. Nada existente muda.
--
-- Conceitos (aprovados em 13/10/2026):
-- - Caso = acompanhamento de um paciente/tratamento (iniciais ou código), com quantos procedimentos forem necessários.
-- - Procedimento (tratamento) × etapa clínica: o aluno registra a ETAPA ("Laminado cerâmico · Cimentação").
-- - Procedimento realizado = unidade da Produção. Experiência clínica = todas as etapas; produção concluída = só as
--   etapas que concluem. Procedimento sem etapa que conclui conta só como experiência.
-- - O Conexo não é prontuário: nada de nome completo, CPF, telefone, nascimento, anamnese, diagnóstico ou exames.
-- - "Excluir" do aluno = exclusão lógica (removed_at), recuperável. Exclusão definitiva só por purge_case (admin).
-- - Foto de capa: coluna já prevista; o armazenamento privado entra na Parte 3.

create type public.count_unit as enum ('dente', 'peca', 'arcada', 'caso');
create type public.procedure_kind as enum ('tratamento', 'geral');
create type public.case_status as enum ('em_andamento', 'concluido');

-- ─── Validações reutilizáveis ─────────────────────────────────────────────────────────────────────

-- Texto com cara de identificador pessoal: CPF, telefone ou sequência longa de dígitos.
create or replace function public.has_personal_identifier(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') ~ '[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}'      -- CPF
      or coalesce(p_text, '') ~ '\(?[0-9]{2}\)?[ .-]?9?[0-9]{4}[ .-]?[0-9]{4}'  -- telefone
      or coalesce(p_text, '') ~ '[0-9]{8,}'                                     -- documento/telefone sem separadores
$$;

-- Identificação do paciente: iniciais ou código, até 12 caracteres; recusa formato de nome ("Maria Silva"),
-- sequência de 6+ letras, CPF e telefone.
create or replace function public.valid_patient_label(p_label text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select length(btrim(coalesce(p_label, ''))) between 1 and 12
     and p_label !~ '[A-Za-zÀ-ÿ]{3,}[[:space:]]+[A-Za-zÀ-ÿ]{3,}'  -- "Maria Silva", "José Lima"
     and p_label !~ '[A-Za-zÀ-ÿ]{6,}'                               -- nome emendado ("MARIASILVA")
     and not public.has_personal_identifier(p_label)
$$;

-- Dentes na notação FDI (permanentes 11–18, 21–28, 31–38, 41–48).
create or replace function public.valid_teeth(p_teeth smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(t / 10 between 1 and 4 and t % 10 between 1 and 8), true)
  from unnest(coalesce(p_teeth, '{}'::smallint[])) t
$$;

-- ─── Catálogo de procedimentos ────────────────────────────────────────────────────────────────────
create table public.procedure_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index procedure_categories_name_key on public.procedure_categories (lower(name)) where archived_at is null;

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.procedure_categories (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- tratamento: pode ter etapa que conclui · geral: diagnóstico/planejamento, só experiência.
  kind public.procedure_kind not null default 'tratamento',
  -- Sinônimos só para busca: levam ao procedimento oficial, nunca criam outro.
  synonyms text[] not null default '{}',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index procedures_name_key on public.procedures (lower(name));
create index procedures_category_idx on public.procedures (category_id, position);

create table public.procedure_steps (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unit public.count_unit not null,
  -- Etapa que conclui o tratamento (no máximo uma por procedimento; nunca em procedimento "geral").
  completes boolean not null default false,
  -- "Outro procedimento": descrição curta obrigatória no registro.
  requires_description boolean not null default false,
  synonyms text[] not null default '{}',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (procedure_id, slug)
);
create unique index procedure_steps_one_completion on public.procedure_steps (procedure_id) where completes;
create index procedure_steps_procedure_idx on public.procedure_steps (procedure_id, position);

-- Temas relacionados (ligam o procedimento à biblioteca). Definidos pelo admin.
create table public.procedure_topics (
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (procedure_id, topic_id)
);
create index procedure_topics_topic_idx on public.procedure_topics (topic_id);

-- Procedimento "geral" não tem etapa que conclui.
create or replace function public.procedure_steps_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'procedure_steps' then
    if new.completes and exists (select 1 from public.procedures where id = new.procedure_id and kind = 'geral') then
      raise exception 'Procedimento geral (diagnóstico/planejamento) não tem etapa que conclui.' using errcode = '23514';
    end if;
  elsif new.kind = 'geral' and exists (select 1 from public.procedure_steps where procedure_id = new.id and completes) then
    raise exception 'Procedimento com etapa que conclui não pode ser "geral".' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger procedure_steps_guard before insert or update on public.procedure_steps
  for each row execute function public.procedure_steps_guard();
create trigger procedures_kind_guard before update of kind on public.procedures
  for each row execute function public.procedure_steps_guard();

-- ─── Casos ────────────────────────────────────────────────────────────────────────────────────────
create table public.clinical_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  patient_label text not null check (public.valid_patient_label(patient_label)),
  title text check (title is null or (length(title) <= 80 and not public.has_personal_identifier(title))),
  status public.case_status not null default 'em_andamento',
  started_on date,
  last_activity_on date,
  concluded_on date,
  -- Supervisor: só informativo (docente); não dá acesso ao caso.
  supervisor_faculty_id uuid references public.faculty (id) on delete set null,
  smile_cloud_url text check (smile_cloud_url is null or (length(smile_cloud_url) <= 500 and smile_cloud_url ~ '^https://')),
  difficulty_text text check (difficulty_text is null or (length(difficulty_text) <= 1000 and not public.has_personal_identifier(difficulty_text))),
  ease_text text check (ease_text is null or (length(ease_text) <= 1000 and not public.has_personal_identifier(ease_text))),
  do_differently_text text check (do_differently_text is null or (length(do_differently_text) <= 1000 and not public.has_personal_identifier(do_differently_text))),
  cover_path text,
  cover_updated_at timestamptz,
  -- Exclusão lógica pelo aluno (recuperável).
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clinical_cases_owner_idx on public.clinical_cases (owner_id, last_activity_on desc);
create index clinical_cases_cohort_idx on public.clinical_cases (cohort_id) where removed_at is null;

create table public.performed_procedures (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  -- Copiados do caso e da etapa pelo gatilho (regras de acesso e Produção sem junções).
  owner_id uuid not null,
  cohort_id uuid not null,
  step_id uuid not null references public.procedure_steps (id) on delete restrict,
  procedure_id uuid not null references public.procedures (id) on delete restrict,
  performed_on date not null,
  quantity integer not null check (quantity between 1 and 99),
  teeth smallint[] not null default '{}' check (public.valid_teeth(teeth) and cardinality(teeth) <= 32),
  -- Módulo automático pela data (module_auto); o aluno pode corrigir.
  module_id uuid references public.modules (id) on delete set null,
  module_auto boolean not null default true,
  note text check (note is null or (length(note) <= 200 and not public.has_personal_identifier(note))),
  other_description text check (other_description is null or (length(btrim(other_description)) between 3 and 120 and not public.has_personal_identifier(other_description))),
  -- Descrição normalizada (sem acento/maiúsculas) para o relatório de "descrições frequentes".
  other_description_norm text,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index performed_procedures_case_idx on public.performed_procedures (case_id, performed_on);
create index performed_procedures_owner_idx on public.performed_procedures (owner_id, performed_on);
create index performed_procedures_cohort_idx on public.performed_procedures (cohort_id, performed_on);
create index performed_procedures_step_idx on public.performed_procedures (step_id);
create index performed_procedures_other_idx on public.performed_procedures (other_description_norm) where other_description_norm is not null;

create table public.case_difficulty_topics (
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete restrict,
  owner_id uuid not null,
  source text not null default 'aluno' check (source in ('aluno', 'sugestao')),
  created_at timestamptz not null default now(),
  primary key (case_id, topic_id)
);
create index case_difficulty_topics_topic_idx on public.case_difficulty_topics (topic_id);

-- Acesso extra a um caso (ex.: supervisor autorizado). Estrutura prevista; tela no MVP 2.
create table public.case_access_grants (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  grantee_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null default auth.uid() references public.profiles (id),
  reason text not null check (length(btrim(reason)) between 5 and 300),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, grantee_id)
);

-- Auditoria: abertura de casos por coordenação/admin e exclusão definitiva. Nunca guarda conteúdo clínico.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  cohort_id uuid,
  owner_id uuid,
  details jsonb not null default '{}'
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);
create index audit_log_cohort_idx on public.audit_log (cohort_id, at desc);

-- ─── Regras (funções auxiliares, security definer) ────────────────────────────────────────────────

-- Pode registrar/editar casos nesta turma: aluno com matrícula ativa numa turma ativa.
create or replace function public.can_register_cases(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e join public.cohorts c on c.id = e.cohort_id
    where e.user_id = (select auth.uid()) and e.cohort_id = p_cohort_id
      and e.role_in_cohort = 'aluno' and e.status = 'ativa' and c.status = 'ativa'
  )
$$;

-- Quem lê o caso: o dono; o admin (inclusive removidos); a coordenação da turma (não removidos);
-- quem tiver acesso extra vigente. O supervisor informado no caso NÃO ganha acesso.
create or replace function public.case_readable(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinical_cases c
    where c.id = p_case_id and (
      c.owner_id = (select auth.uid())
      or public.is_admin()
      or (c.removed_at is null and public.coordinates(c.cohort_id))
      or (c.removed_at is null and exists (
        select 1 from public.case_access_grants g
        where g.case_id = c.id and g.grantee_id = (select auth.uid()) and (g.expires_at is null or g.expires_at > now())
      ))
    )
  )
$$;

-- O dono pode alterar o caso (turma ativa, matrícula ativa como aluno). Turma encerrada = somente leitura.
create or replace function public.case_writable(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinical_cases c
    where c.id = p_case_id and c.owner_id = (select auth.uid()) and public.can_register_cases(c.cohort_id)
  )
$$;

-- Módulo de uma data: o que está acontecendo naquele dia; senão o último que já terminou. Só publicados.
create or replace function public.module_for_date(p_cohort_id uuid, p_date date)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with spans as (
    select m.id, min(d.date) as start_on, max(d.date) as end_on
    from public.modules m join public.module_days d on d.module_id = m.id
    where m.cohort_id = p_cohort_id and m.status = 'publicado'
    group by m.id
  )
  select id from (
    select id, 0 as rank, start_on from spans where p_date between start_on and end_on
    union all
    select id, 1, start_on from spans where end_on < p_date
  ) x
  order by rank, start_on desc
  limit 1
$$;

-- Temas sugeridos para a dificuldade: nomes e sinônimos de temas que aparecem no texto (sem acento). Sem IA.
create or replace function public.suggest_topics(p_text text, p_limit integer default 3)
returns table (topic_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name
  from public.topics t
  where t.archived_at is null and t.merged_into is null
    and exists (
      select 1 from unnest(array_append(t.synonyms, t.name)) term
      where length(term) >= 3
        and position(public.search_normalize(term) in public.search_normalize(p_text)) > 0
    )
  order by t.name
  limit greatest(1, least(coalesce(p_limit, 3), 10))
$$;

-- ─── Gatilhos dos casos ───────────────────────────────────────────────────────────────────────────

-- Caso: dono e turma não mudam depois de criados; conclusão carimba a data; reabrir limpa.
create or replace function public.clinical_cases_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
    new.cohort_id := old.cohort_id;
  end if;
  new.patient_label := upper(btrim(new.patient_label));
  if new.status = 'concluido' and (tg_op = 'INSERT' or old.status <> 'concluido') then
    new.concluded_on := coalesce(new.concluded_on, public.sp_today());
  elsif new.status = 'em_andamento' then
    new.concluded_on := null;
  end if;
  return new;
end
$$;
create trigger clinical_cases_guard before insert or update on public.clinical_cases
  for each row execute function public.clinical_cases_guard();
create trigger clinical_cases_updated_at before update on public.clinical_cases
  for each row execute function public.set_updated_at();

-- Registro: copia dono/turma do caso e procedimento da etapa; exige descrição no "Outro"; módulo pela data;
-- não aceita data futura nem etapa desativada em registro novo.
create or replace function public.performed_procedures_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case record;
  v_step record;
begin
  select owner_id, cohort_id into v_case from public.clinical_cases where id = new.case_id;
  if not found then
    raise exception 'Caso inexistente.' using errcode = '23503';
  end if;
  new.owner_id := v_case.owner_id;
  new.cohort_id := v_case.cohort_id;

  select procedure_id, requires_description, active into v_step from public.procedure_steps where id = new.step_id;
  if not found then
    raise exception 'Etapa inexistente.' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' and not v_step.active then
    raise exception 'Esta etapa está desativada no catálogo.' using errcode = '23514';
  end if;
  new.procedure_id := v_step.procedure_id;

  if v_step.requires_description then
    if length(btrim(coalesce(new.other_description, ''))) < 3 then
      raise exception 'Descreva o procedimento.' using errcode = '23514';
    end if;
    new.other_description := btrim(new.other_description);
    new.other_description_norm := public.search_normalize(new.other_description);
  else
    new.other_description := null;
    new.other_description_norm := null;
  end if;

  if new.performed_on > public.sp_today() then
    raise exception 'A data não pode ser no futuro.' using errcode = '23514';
  end if;

  if new.module_auto and (tg_op = 'INSERT' or new.performed_on is distinct from old.performed_on or not old.module_auto) then
    new.module_id := public.module_for_date(new.cohort_id, new.performed_on);
  elsif new.module_id is not null and not exists (
    select 1 from public.modules where id = new.module_id and cohort_id = new.cohort_id
  ) then
    raise exception 'O módulo precisa ser da turma do caso.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.case_id := old.case_id; -- um registro não muda de caso
  end if;
  return new;
end
$$;
create trigger performed_procedures_prepare before insert or update on public.performed_procedures
  for each row execute function public.performed_procedures_prepare();
create trigger performed_procedures_updated_at before update on public.performed_procedures
  for each row execute function public.set_updated_at();

-- Mantém início e última atividade do caso a partir dos registros ativos.
create or replace function public.clinical_cases_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case uuid := coalesce(new.case_id, old.case_id);
begin
  update public.clinical_cases c
     set started_on = s.first_on, last_activity_on = s.last_on
    from (
      select min(performed_on) as first_on, max(performed_on) as last_on
      from public.performed_procedures where case_id = v_case and removed_at is null
    ) s
   where c.id = v_case
     and (c.started_on is distinct from s.first_on or c.last_activity_on is distinct from s.last_on);
  return null;
end
$$;
create trigger performed_procedures_touch after insert or update or delete on public.performed_procedures
  for each row execute function public.clinical_cases_touch();

-- Temas de dificuldade: no máximo 3 por caso; dono copiado do caso; tema ativo.
create or replace function public.case_difficulty_topics_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select owner_id into new.owner_id from public.clinical_cases where id = new.case_id;
  if (select count(*) from public.case_difficulty_topics where case_id = new.case_id) >= 3 then
    raise exception 'No máximo 3 temas por caso.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.topics where id = new.topic_id and archived_at is null) then
    raise exception 'Tema arquivado.' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger case_difficulty_topics_guard before insert on public.case_difficulty_topics
  for each row execute function public.case_difficulty_topics_guard();

-- Catálogo: updated_at e histórico "de → para" (change_log), como o resto do painel.
create trigger procedure_categories_updated_at before update on public.procedure_categories
  for each row execute function public.set_updated_at();
create trigger procedures_updated_at before update on public.procedures
  for each row execute function public.set_updated_at();
create trigger procedure_steps_updated_at before update on public.procedure_steps
  for each row execute function public.set_updated_at();
create trigger procedure_categories_log after insert or update or delete on public.procedure_categories
  for each row execute function public.log_change();
create trigger procedures_log after insert or update or delete on public.procedures
  for each row execute function public.log_change();
create trigger procedure_steps_log after insert or update or delete on public.procedure_steps
  for each row execute function public.log_change();

-- ─── Ações protegidas ─────────────────────────────────────────────────────────────────────────────

-- Abrir um caso de outra pessoa (coordenação/admin) fica registrado. Devolve se a pessoa pode ler o caso.
create or replace function public.log_case_view(p_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case record;
begin
  if not public.case_readable(p_case_id) then
    return false;
  end if;
  select owner_id, cohort_id into v_case from public.clinical_cases where id = p_case_id;
  if v_case.owner_id <> (select auth.uid()) then
    insert into public.audit_log (actor, action, entity, entity_id, cohort_id, owner_id)
    values ((select auth.uid()), 'caso.abrir', 'clinical_cases', p_case_id, v_case.cohort_id, v_case.owner_id);
  end if;
  return true;
end
$$;

-- Exclusão definitiva: só admin, só caso já removido pelo aluno, com motivo. Devolve o caminho da foto de capa
-- (o servidor apaga o arquivo). A auditoria guarda quem, quando, motivo e contagens — sem conteúdo clínico.
create or replace function public.purge_case(p_case_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case record;
  v_records integer;
  v_topics integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe o motivo da exclusão definitiva.' using errcode = '23514';
  end if;
  select id, owner_id, cohort_id, removed_at, cover_path into v_case from public.clinical_cases where id = p_case_id;
  if not found then
    raise exception 'Caso inexistente.' using errcode = '23503';
  end if;
  if v_case.removed_at is null then
    raise exception 'Só um caso já excluído pelo aluno pode ser excluído definitivamente.' using errcode = '23514';
  end if;
  select count(*) into v_records from public.performed_procedures where case_id = p_case_id;
  select count(*) into v_topics from public.case_difficulty_topics where case_id = p_case_id;
  delete from public.clinical_cases where id = p_case_id;
  insert into public.audit_log (actor, action, entity, entity_id, cohort_id, owner_id, details)
  values ((select auth.uid()), 'caso.excluir_definitivo', 'clinical_cases', p_case_id, v_case.cohort_id, v_case.owner_id,
          jsonb_build_object('motivo', btrim(p_reason), 'registros', v_records, 'temas', v_topics,
                             'tinha_foto', v_case.cover_path is not null));
  return v_case.cover_path;
end
$$;

-- ─── Base da Produção (Etapa 9) ───────────────────────────────────────────────────────────────────
-- Registros que contam: não removidos, de casos não removidos. Experiência = todas as linhas;
-- produção concluída = linhas com completes. Calculado na hora (nada guardado em totais).
create view public.active_performed_procedures
with (security_invoker = true) as
select pp.id, pp.case_id, pp.owner_id, pp.cohort_id, pp.step_id, pp.procedure_id, p.category_id, p.kind,
       s.unit, s.completes, pp.performed_on, pp.quantity, pp.teeth, pp.module_id
from public.performed_procedures pp
join public.clinical_cases c on c.id = pp.case_id
join public.procedure_steps s on s.id = pp.step_id
join public.procedures p on p.id = pp.procedure_id
where pp.removed_at is null and c.removed_at is null;

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
revoke all on public.procedure_categories, public.procedures, public.procedure_steps, public.procedure_topics,
  public.clinical_cases, public.performed_procedures, public.case_difficulty_topics, public.case_access_grants,
  public.audit_log, public.active_performed_procedures
  from anon, authenticated;
grant select, insert, update, delete on public.procedure_categories, public.procedures, public.procedure_steps,
  public.procedure_topics to authenticated;
grant select, insert, update on public.clinical_cases, public.performed_procedures to authenticated;
grant select, insert, delete on public.case_difficulty_topics to authenticated;
grant select, insert, update, delete on public.case_access_grants to authenticated;
grant select on public.audit_log, public.active_performed_procedures to authenticated;

revoke all on function public.has_personal_identifier(text), public.valid_patient_label(text),
  public.valid_teeth(smallint[]), public.can_register_cases(uuid), public.case_readable(uuid),
  public.case_writable(uuid), public.module_for_date(uuid, date), public.suggest_topics(text, integer),
  public.log_case_view(uuid), public.purge_case(uuid, text), public.procedure_steps_guard(),
  public.clinical_cases_guard(), public.performed_procedures_prepare(), public.clinical_cases_touch(),
  public.case_difficulty_topics_guard()
  from public, anon;
grant execute on function public.has_personal_identifier(text), public.valid_patient_label(text),
  public.valid_teeth(smallint[]), public.can_register_cases(uuid), public.case_readable(uuid),
  public.case_writable(uuid), public.module_for_date(uuid, date), public.suggest_topics(text, integer),
  public.log_case_view(uuid), public.purge_case(uuid, text)
  to authenticated;

-- ─── RLS ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.procedure_categories enable row level security;
alter table public.procedures enable row level security;
alter table public.procedure_steps enable row level security;
alter table public.procedure_topics enable row level security;
alter table public.clinical_cases enable row level security;
alter table public.performed_procedures enable row level security;
alter table public.case_difficulty_topics enable row level security;
alter table public.case_access_grants enable row level security;
alter table public.audit_log enable row level security;

-- Catálogo: todos que entram no portal leem; só admin altera.
create policy procedure_categories_select on public.procedure_categories for select to authenticated using (true);
create policy procedure_categories_write on public.procedure_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy procedures_select on public.procedures for select to authenticated using (true);
create policy procedures_write on public.procedures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy procedure_steps_select on public.procedure_steps for select to authenticated using (true);
create policy procedure_steps_write on public.procedure_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy procedure_topics_select on public.procedure_topics for select to authenticated using (true);
create policy procedure_topics_write on public.procedure_topics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Casos: lê quem case_readable permite; só o dono cria e altera, em turma ativa. Ninguém apaga direto.
-- O dono é conferido direto (a função não enxerga a linha recém-criada no mesmo comando, ex.: insert … returning).
create policy clinical_cases_select on public.clinical_cases for select to authenticated
  using (owner_id = (select auth.uid()) or public.case_readable(id));
create policy clinical_cases_insert on public.clinical_cases for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.can_register_cases(cohort_id));
create policy clinical_cases_update on public.clinical_cases for update to authenticated
  using (owner_id = (select auth.uid()) and public.can_register_cases(cohort_id))
  with check (owner_id = (select auth.uid()) and public.can_register_cases(cohort_id));

-- Registros: mesmas regras do caso; a coordenação não vê registros removidos.
create policy performed_procedures_select on public.performed_procedures for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_admin()
    or (removed_at is null and public.case_readable(case_id))
  );
create policy performed_procedures_insert on public.performed_procedures for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.case_writable(case_id));
create policy performed_procedures_update on public.performed_procedures for update to authenticated
  using (owner_id = (select auth.uid()) and public.case_writable(case_id))
  with check (owner_id = (select auth.uid()) and public.case_writable(case_id));

create policy case_difficulty_topics_select on public.case_difficulty_topics for select to authenticated
  using (owner_id = (select auth.uid()) or public.case_readable(case_id));
create policy case_difficulty_topics_insert on public.case_difficulty_topics for insert to authenticated
  with check (public.case_writable(case_id));
create policy case_difficulty_topics_delete on public.case_difficulty_topics for delete to authenticated
  using (public.case_writable(case_id));

-- Acesso extra: só admin concede e vê (tela no MVP 2).
create policy case_access_grants_admin on public.case_access_grants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Auditoria: admin vê tudo; coordenação vê o da própria turma. Ninguém grava direto (só as funções).
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)));

update public.schema_info set version = '20261019120000_casos', updated_at = now();
