-- Etapa 2 · Parte 3 — turmas, cronograma e módulos.
-- Tudo é vinculado à turma (cohort_id) e editável pelo admin; nada é fixo no código.
-- Regras de leitura:
--   aluno        → só módulos PUBLICADOS da turma em que está matriculado (e o que pertence a eles);
--                  nunca observações internas nem equipe marcada como interna;
--   coordenação  → tudo da turma que coordena, inclusive rascunhos e observações; só leitura;
--   admin        → tudo, e é o único que grava.
-- Nada é apagado pela interface: módulos são arquivados (só rascunho nunca publicado pode ser excluído).
-- Toda alteração fica registrada em change_log (quem, quando, o que mudou).

-- ─── Tipos ────────────────────────────────────────────────────────────────────────────────────────
create type public.content_status as enum ('rascunho', 'publicado', 'arquivado');
create type public.faculty_kind as enum ('docente', 'equipe_clinica', 'convidado', 'coordenacao', 'apoio');
create type public.day_period as enum ('manha', 'tarde', 'noite', 'dia_todo');
create type public.activity_type as enum (
  'teorica', 'pratica', 'hands_on', 'clinica', 'demonstracao', 'discussao_caso', 'online', 'outro'
);
create type public.staff_role as enum ('principal', 'docente', 'equipe_clinica', 'coordenacao', 'apoio');
create type public.resource_kind as enum ('link', 'arquivo', 'texto');
create type public.module_phase as enum ('antes', 'durante', 'depois');
create type public.requirement_level as enum ('obrigatorio', 'recomendado', 'complementar');
create type public.event_kind as enum ('online', 'clinica', 'prazo', 'outro');

-- ─── Turmas: campos novos ─────────────────────────────────────────────────────────────────────────
alter table public.cohorts
  add column description text,
  add column closed_at timestamptz;

-- ─── Docentes e equipe (compartilhados entre turmas; sem login no MVP) ────────────────────────────
create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) > 0),
  display_name text not null check (length(btrim(display_name)) > 0),
  honorific text,
  kind public.faculty_kind not null default 'docente',
  specialty text,
  short_bio text,
  active boolean not null default true,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Módulos ──────────────────────────────────────────────────────────────────────────────────────
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  position integer not null,
  number integer check (number is null or number > 0),
  title text not null check (length(btrim(title)) > 0),
  theme text,
  description text,
  location text,
  workload_hours numeric(5, 1) check (workload_hours is null or workload_hours >= 0),
  preparation text,
  materials_notes text,
  status public.content_status not null default 'rascunho',
  published_at timestamptz,
  archived_at timestamptz,
  dates_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index modules_cohort_idx on public.modules (cohort_id, position);

-- Observações só para admin e coordenação (tabela separada: o aluno lê a linha do módulo, nunca esta).
create table public.module_internal_notes (
  module_id uuid primary key references public.modules (id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- Dias do módulo: quantos forem, consecutivos ou não. As datas do módulo derivam daqui.
create table public.module_days (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  date date not null,
  label text,
  note text,
  created_at timestamptz not null default now(),
  unique (module_id, date),
  unique (id, module_id)
);
create index module_days_date_idx on public.module_days (date);

-- Programação: atividades por dia e turno; horário exato opcional.
create table public.module_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null,
  day_id uuid not null,
  period public.day_period not null,
  starts_at time,
  ends_at time,
  title text not null check (length(btrim(title)) > 0),
  description text,
  activity_type public.activity_type not null default 'teorica',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (day_id, module_id) references public.module_days (id, module_id) on delete cascade,
  unique (id, module_id),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index module_sessions_day_idx on public.module_sessions (day_id, position);

-- Quem conduz cada atividade (vários por atividade; "a confirmar" quando ainda incerto).
create table public.session_faculty (
  session_id uuid not null,
  module_id uuid not null,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  role text not null default 'responsavel' check (role in ('responsavel', 'apoio')),
  tentative boolean not null default false,
  primary key (session_id, faculty_id),
  foreign key (session_id, module_id) references public.module_sessions (id, module_id) on delete cascade
);

-- Equipe do módulo (professor principal, equipe clínica, coordenação, apoio).
create table public.module_staff (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  role public.staff_role not null default 'equipe_clinica',
  visible_to_students boolean not null default true,
  tentative boolean not null default false,
  position integer not null default 0,
  unique (module_id, faculty_id)
);

-- Materiais necessários (lista que o aluno marca), opcionalmente de um dia específico.
create table public.module_materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  day_id uuid references public.module_days (id) on delete set null,
  group_label text not null default 'Geral',
  item text not null check (length(btrim(item)) > 0),
  note text,
  required boolean not null default true,
  position integer not null default 0
);

create table public.material_checks (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  material_id uuid not null references public.module_materials (id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

-- Entregas/tarefas do aluno.
create table public.module_deliverables (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  due_date date,
  phase public.module_phase not null default 'durante',
  position integer not null default 0
);

-- Aulas, links, arquivos e textos do módulo (antes / durante / depois), com liberação por data.
create table public.module_resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  session_id uuid references public.module_sessions (id) on delete set null,
  kind public.resource_kind not null,
  title text not null check (length(btrim(title)) > 0),
  description text,
  url text check (url is null or url ~* '^https?://'),
  file_path text,
  body text,
  phase public.module_phase not null default 'antes',
  requirement public.requirement_level not null default 'recomendado',
  available_from timestamptz,
  status public.content_status not null default 'rascunho',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'link' and url is not null)
    or (kind = 'arquivo' and file_path is not null)
    or (kind = 'texto' and body is not null)
  )
);

-- Outros eventos do calendário da turma (aula online, clínica extra, prazo…).
create table public.cohort_events (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  date date not null,
  starts_at time,
  title text not null check (length(btrim(title)) > 0),
  description text,
  kind public.event_kind not null default 'outro',
  status public.content_status not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cohort_events_idx on public.cohort_events (cohort_id, date);

-- Histórico: quem alterou, quando e o que mudou (diferença campo a campo nas alterações).
create table public.change_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text not null,
  module_id uuid,
  cohort_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  changes jsonb not null
);
create index change_log_module_idx on public.change_log (module_id, at desc);
create index change_log_cohort_idx on public.change_log (cohort_id, at desc);

create trigger faculty_updated_at before update on public.faculty
  for each row execute function public.set_updated_at();
create trigger modules_updated_at before update on public.modules
  for each row execute function public.set_updated_at();
create trigger module_sessions_updated_at before update on public.module_sessions
  for each row execute function public.set_updated_at();
create trigger module_resources_updated_at before update on public.module_resources
  for each row execute function public.set_updated_at();
create trigger cohort_events_updated_at before update on public.cohort_events
  for each row execute function public.set_updated_at();
create trigger module_internal_notes_updated_at before update on public.module_internal_notes
  for each row execute function public.set_updated_at();

-- ─── Regras de leitura (funções auxiliares, security definer) ─────────────────────────────────────

-- Admin ou coordenação da turma do módulo: leitura completa (rascunhos e dados internos).
create or replace function public.module_full_access(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.modules m where m.id = p_module_id and public.coordinates(m.cohort_id)
  )
$$;

-- Leitura do módulo: acesso completo, ou módulo publicado da turma em que a pessoa está matriculada.
create or replace function public.module_readable(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.modules m
    where m.id = p_module_id
      and (public.coordinates(m.cohort_id) or (m.status = 'publicado' and public.is_enrolled(m.cohort_id)))
  )
$$;

-- Recurso visível ao aluno: módulo legível + recurso publicado + já liberado pela data.
create or replace function public.resource_readable(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.module_resources r
    where r.id = p_resource_id
      and (
        public.module_full_access(r.module_id)
        or (
          public.module_readable(r.module_id)
          and r.status = 'publicado'
          and (r.available_from is null or r.available_from <= now())
        )
      )
  )
$$;

-- Arquivo do armazenamento: legível se algum recurso legível aponta para ele.
create or replace function public.module_file_readable(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.module_resources r where r.file_path = p_path and public.resource_readable(r.id)
  )
$$;

-- ─── Gatilhos de integridade ──────────────────────────────────────────────────────────────────────

-- Datas de publicação e arquivamento mantidas pelo banco.
create or replace function public.modules_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.status = 'arquivado' and (tg_op = 'INSERT' or old.status <> 'arquivado') then
    new.archived_at = now();
  elsif new.status <> 'arquivado' then
    new.archived_at = null;
  end if;
  return new;
end
$$;
create trigger modules_lifecycle before insert or update on public.modules
  for each row execute function public.modules_lifecycle();

-- Mudança de data em módulo publicado → selo "Data alterada" para o aluno.
create or replace function public.module_days_mark_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module uuid := coalesce(new.module_id, old.module_id);
begin
  if tg_op = 'UPDATE' and new.date is not distinct from old.date then
    return null;
  end if;
  update public.modules set dates_changed_at = now() where id = v_module and status = 'publicado';
  return null;
end
$$;
create trigger module_days_mark_change after insert or update or delete on public.module_days
  for each row execute function public.module_days_mark_change();

-- Turma encerrada guarda quando foi encerrada.
create or replace function public.cohorts_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'encerrada' and old.status <> 'encerrada' then
    new.closed_at = now();
  elsif new.status <> 'encerrada' then
    new.closed_at = null;
  end if;
  return new;
end
$$;
create trigger cohorts_lifecycle before update on public.cohorts
  for each row execute function public.cohorts_lifecycle();

-- Histórico genérico. Em alterações, guarda só os campos que mudaram ({campo: {de, para}}).
create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_module uuid;
  v_cohort uuid;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('de', v_old -> k, 'para', v_new -> k))
      into v_changes
      from jsonb_object_keys(v_new) k
     where v_new -> k is distinct from v_old -> k
       and k not in ('updated_at', 'dates_changed_at', 'published_at', 'archived_at', 'closed_at');
    if v_changes is null then
      return null;
    end if;
  else
    v_changes := v_row;
  end if;

  v_module := case when tg_table_name = 'modules' then (v_row ->> 'id')::uuid else (v_row ->> 'module_id')::uuid end;
  v_cohort := case
    when tg_table_name = 'cohorts' then (v_row ->> 'id')::uuid
    when v_row ? 'cohort_id' then (v_row ->> 'cohort_id')::uuid
    else (select cohort_id from public.modules where id = v_module)
  end;

  insert into public.change_log (actor, table_name, row_id, module_id, cohort_id, action, changes)
  values (
    (select auth.uid()),
    tg_table_name,
    coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'module_id', v_row ->> 'session_id', v_row ->> 'faculty_id')),
    v_module,
    v_cohort,
    lower(tg_op),
    v_changes
  );
  return null;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'cohorts', 'faculty', 'modules', 'module_internal_notes', 'module_days', 'module_sessions', 'session_faculty',
    'module_staff', 'module_materials', 'module_deliverables', 'module_resources', 'cohort_events'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()',
      t || '_log', t
    );
  end loop;
end
$$;

-- ─── Copiar a estrutura de uma turma para outra (como rascunho, datas deslocadas) ─────────────────
create or replace function public.copy_cohort_structure(p_source uuid, p_target uuid, p_shift_days integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_mod record;
  v_day record;
  v_ses record;
  v_new_module uuid;
  v_new_day uuid;
  v_new_session uuid;
  v_days jsonb;
  v_sessions jsonb;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.' using errcode = '42501';
  end if;
  if p_source = p_target then
    raise exception 'Escolha turmas diferentes.';
  end if;

  for v_mod in
    select * from public.modules where cohort_id = p_source and status <> 'arquivado' order by position
  loop
    insert into public.modules (cohort_id, position, number, title, theme, description, location, workload_hours,
                                preparation, materials_notes, status)
    values (p_target, v_mod.position, v_mod.number, v_mod.title, v_mod.theme, v_mod.description, v_mod.location,
            v_mod.workload_hours, v_mod.preparation, v_mod.materials_notes, 'rascunho')
    returning id into v_new_module;

    insert into public.module_internal_notes (module_id, notes)
    select v_new_module, notes from public.module_internal_notes where module_id = v_mod.id;

    v_days := '{}'::jsonb;
    v_sessions := '{}'::jsonb;
    for v_day in select * from public.module_days where module_id = v_mod.id order by date loop
      insert into public.module_days (module_id, date, label, note)
      values (v_new_module, v_day.date + p_shift_days, v_day.label, v_day.note)
      returning id into v_new_day;
      v_days := v_days || jsonb_build_object(v_day.id::text, v_new_day);

      for v_ses in select * from public.module_sessions where day_id = v_day.id loop
        insert into public.module_sessions (module_id, day_id, period, starts_at, ends_at, title, description,
                                            activity_type, position)
        values (v_new_module, v_new_day, v_ses.period, v_ses.starts_at, v_ses.ends_at, v_ses.title,
                v_ses.description, v_ses.activity_type, v_ses.position)
        returning id into v_new_session;
        v_sessions := v_sessions || jsonb_build_object(v_ses.id::text, v_new_session);

        insert into public.session_faculty (session_id, module_id, faculty_id, role, tentative)
        select v_new_session, v_new_module, faculty_id, role, tentative
        from public.session_faculty where session_id = v_ses.id;
      end loop;
    end loop;

    insert into public.module_staff (module_id, faculty_id, role, visible_to_students, tentative, position)
    select v_new_module, faculty_id, role, visible_to_students, tentative, position
    from public.module_staff where module_id = v_mod.id;

    insert into public.module_materials (module_id, day_id, group_label, item, note, required, position)
    select v_new_module, (v_days ->> day_id::text)::uuid, group_label, item, note, required, position
    from public.module_materials where module_id = v_mod.id;

    insert into public.module_deliverables (module_id, title, description, due_date, phase, position)
    select v_new_module, title, description, due_date + p_shift_days, phase, position
    from public.module_deliverables where module_id = v_mod.id;

    insert into public.module_resources (module_id, session_id, kind, title, description, url, file_path, body,
                                         phase, requirement, available_from, status, position)
    select v_new_module, (v_sessions ->> session_id::text)::uuid, kind, title, description, url, file_path, body,
           phase, requirement, available_from + make_interval(days => p_shift_days), 'rascunho', position
    from public.module_resources where module_id = v_mod.id and status <> 'arquivado';

    v_count := v_count + 1;
  end loop;
  return v_count;
end
$$;

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
revoke all on public.faculty, public.modules, public.module_internal_notes, public.module_days,
  public.module_sessions, public.session_faculty, public.module_staff, public.module_materials,
  public.material_checks, public.module_deliverables, public.module_resources, public.cohort_events,
  public.change_log
  from anon, authenticated;

grant select, insert, update on public.faculty to authenticated;
grant select, insert, update, delete on public.modules, public.module_days, public.module_sessions,
  public.session_faculty, public.module_staff, public.module_materials, public.module_deliverables,
  public.module_resources, public.cohort_events
  to authenticated;
grant select, insert, update on public.module_internal_notes to authenticated;
grant select, insert, delete on public.material_checks to authenticated;
grant select on public.change_log to authenticated;

revoke all on function public.module_full_access(uuid), public.module_readable(uuid), public.resource_readable(uuid),
  public.module_file_readable(text), public.modules_lifecycle(), public.module_days_mark_change(),
  public.cohorts_lifecycle(), public.log_change(), public.copy_cohort_structure(uuid, uuid, integer)
  from public, anon;
grant execute on function public.module_full_access(uuid), public.module_readable(uuid),
  public.resource_readable(uuid), public.module_file_readable(text), public.copy_cohort_structure(uuid, uuid, integer)
  to authenticated;

-- ─── RLS ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.faculty enable row level security;
alter table public.modules enable row level security;
alter table public.module_internal_notes enable row level security;
alter table public.module_days enable row level security;
alter table public.module_sessions enable row level security;
alter table public.session_faculty enable row level security;
alter table public.module_staff enable row level security;
alter table public.module_materials enable row level security;
alter table public.material_checks enable row level security;
alter table public.module_deliverables enable row level security;
alter table public.module_resources enable row level security;
alter table public.cohort_events enable row level security;
alter table public.change_log enable row level security;

-- Docentes: nomes e minibio são públicos para quem está logado; só admin cadastra.
create policy faculty_select on public.faculty for select to authenticated using (true);
create policy faculty_insert on public.faculty for insert to authenticated with check (public.is_admin());
create policy faculty_update on public.faculty for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Módulos.
create policy modules_select on public.modules for select to authenticated
  using (public.coordinates(cohort_id) or (status = 'publicado' and public.is_enrolled(cohort_id)));
create policy modules_insert on public.modules for insert to authenticated with check (public.is_admin());
create policy modules_update on public.modules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Excluir só o que nunca foi publicado (criado por engano); o resto é arquivado.
create policy modules_delete on public.modules for delete to authenticated
  using (public.is_admin() and published_at is null);

create policy internal_notes_select on public.module_internal_notes for select to authenticated
  using (public.module_full_access(module_id));
create policy internal_notes_insert on public.module_internal_notes for insert to authenticated
  with check (public.is_admin());
create policy internal_notes_update on public.module_internal_notes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Partes do módulo: leitura acompanha o módulo; só admin grava.
do $$
declare t text;
begin
  foreach t in array array['module_days', 'module_sessions', 'session_faculty', 'module_materials', 'module_deliverables'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.module_readable(module_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_delete', t);
  end loop;
end
$$;

-- Equipe: aluno vê só quem está marcado como visível.
create policy module_staff_select on public.module_staff for select to authenticated
  using (public.module_full_access(module_id) or (visible_to_students and public.module_readable(module_id)));
create policy module_staff_insert on public.module_staff for insert to authenticated with check (public.is_admin());
create policy module_staff_update on public.module_staff for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy module_staff_delete on public.module_staff for delete to authenticated using (public.is_admin());

-- Recursos: aluno vê só publicados e já liberados.
create policy module_resources_select on public.module_resources for select to authenticated
  using (public.resource_readable(id));
create policy module_resources_insert on public.module_resources for insert to authenticated
  with check (public.is_admin());
create policy module_resources_update on public.module_resources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy module_resources_delete on public.module_resources for delete to authenticated
  using (public.is_admin());

-- Lista de materiais marcada pelo aluno: só a própria, só de módulo que ele pode ler.
create policy material_checks_select on public.material_checks for select to authenticated
  using (user_id = (select auth.uid()));
create policy material_checks_insert on public.material_checks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.module_materials mm where mm.id = material_id and public.module_readable(mm.module_id))
  );
create policy material_checks_delete on public.material_checks for delete to authenticated
  using (user_id = (select auth.uid()));

-- Eventos da turma.
create policy cohort_events_select on public.cohort_events for select to authenticated
  using (public.coordinates(cohort_id) or (status = 'publicado' and public.is_enrolled(cohort_id)));
create policy cohort_events_insert on public.cohort_events for insert to authenticated with check (public.is_admin());
create policy cohort_events_update on public.cohort_events for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy cohort_events_delete on public.cohort_events for delete to authenticated using (public.is_admin());

-- Histórico: admin vê tudo; coordenação vê o da própria turma. Ninguém grava direto (só o gatilho).
create policy change_log_select on public.change_log for select to authenticated
  using (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)));

-- ─── Arquivos dos módulos (bucket privado; leitura por link temporário) ───────────────────────────
-- Só existe no Supabase (o Postgres do CI não tem o esquema storage).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('module-files', 'module-files', false, 52428800)
    on conflict (id) do nothing;
    execute $p$create policy module_files_select on storage.objects for select to authenticated
      using (bucket_id = 'module-files' and public.module_file_readable(name))$p$;
    execute $p$create policy module_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'module-files' and public.is_admin())$p$;
    execute $p$create policy module_files_update on storage.objects for update to authenticated
      using (bucket_id = 'module-files' and public.is_admin())$p$;
    execute $p$create policy module_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'module-files' and public.is_admin())$p$;
  end if;
end
$$;

-- ─── Painel de pessoas: inclui o id da turma (para editar a matrícula pelo painel) ────────────────
drop function public.admin_people();
create function public.admin_people()
returns table (
  id uuid,
  email text,
  full_name text,
  display_name text,
  role public.app_role,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  cohort_id uuid,
  cohort_name text,
  role_in_cohort public.cohort_role,
  enrollment_status public.enrollment_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.display_name, p.role, u.invited_at, u.last_sign_in_at,
           c.id, c.name, e.role_in_cohort, e.status, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join lateral (
      select * from public.enrollments e0 where e0.user_id = p.id
      order by (e0.status = 'ativa') desc, e0.created_at desc limit 1
    ) e on true
    left join public.cohorts c on c.id = e.cohort_id
    order by p.created_at desc;
end
$$;
revoke all on function public.admin_people() from public, anon, authenticated;
grant execute on function public.admin_people() to authenticated;

update public.schema_info set version = '20261008120000_turmas_modulos', updated_at = now();
