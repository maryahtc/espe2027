-- Etapa 4 · Parte 1 — Temas e Biblioteca.
-- Migração SOMENTE ADITIVA (regra de produção de 07/10/2026): tabelas, funções, políticas e um bucket novos, e uma
-- coluna nova (nula) no histórico. Nenhum dado existente é alterado ou apagado.
--
-- Áreas (categories) organizam a navegação; Temas (topics) são a taxonomia central que liga biblioteca, casos,
-- recomendações e workflows. A biblioteca é compartilhada entre turmas: conteúdo sem turma definida vale para
-- todas; com turmas definidas, só para elas.
--
-- Quem vê o quê:
-- - aluno: conteúdo publicado, liberado (data) e disponível para uma turma em que está matriculado;
-- - coordenação: o mesmo (inclusive antes da data de liberação), só leitura; vê o progresso dos alunos da turma;
-- - admin: tudo; é o único que grava.

-- ─── Busca: texto sem acento (unaccent) ─────────────────────────────────────────────────────────────
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- Envoltório IMUTÁVEL do unaccent (necessário para índices e vetores de busca), no esquema onde ele estiver.
-- security definer: quem busca não precisa de acesso ao esquema da extensão.
do $$
declare v_schema text;
begin
  select n.nspname into v_schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'unaccent';
  execute format($f$
    create or replace function public.search_normalize(p_text text)
    returns text
    language sql
    immutable
    parallel safe
    security definer
    set search_path = ''
    as $b$ select lower(%1$I.unaccent(%2$L::regdictionary, coalesce(p_text, ''))) $b$
  $f$, v_schema, v_schema || '.unaccent');
end
$$;

-- Termos digitados → consulta com prefixo ("cimen" já encontra "cimentação"), em português, sem acento.
create or replace function public.library_tsquery(p_query text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case when x.w is null then null else to_tsquery('portuguese', x.w) end
  from (
    select string_agg(quote_literal(t) || ':*', ' & ') as w
    from unnest(regexp_split_to_array(public.search_normalize(left(p_query, 200)), '[^a-z0-9]+')) t
    where length(t) >= 2
  ) x
$$;

-- ─── Tipos ──────────────────────────────────────────────────────────────────────────────────────────
create type public.content_kind as enum ('video', 'artigo', 'capitulo', 'livro', 'pdf', 'slides', 'link');
create type public.progress_status as enum ('iniciado', 'concluido');

-- ─── Áreas e temas ─────────────────────────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_key on public.categories (lower(name)) where archived_at is null;

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  synonyms text[] not null default '{}',
  archived_at timestamptz,
  merged_into uuid references public.topics (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into is null or merged_into <> id)
);
create unique index topics_name_key on public.topics (lower(name)) where archived_at is null;
create index topics_category_idx on public.topics (category_id);

-- Origem / observação do tema: só admin e coordenação (nunca aparece para o aluno).
create table public.topic_notes (
  topic_id uuid primary key references public.topics (id) on delete cascade,
  origin text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── Conteúdos ─────────────────────────────────────────────────────────────────────────────────────
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  kind public.content_kind not null,
  title text not null check (length(btrim(title)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  category_id uuid not null references public.categories (id) on delete restrict,
  citation text,
  url text check (url is null or url ~* '^https?://'),
  file_path text,
  file_name text,
  -- Vídeo (Parte 2 — Bunny Stream). Nesta parte os campos existem, mas ainda não há envio.
  video_provider text check (video_provider is null or video_provider in ('bunny')),
  video_id text,
  video_status text check (video_status is null or video_status in ('enviando', 'processando', 'pronto', 'erro')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  thumbnail_url text check (thumbnail_url is null or thumbnail_url ~* '^https://'),
  available_from timestamptz,
  status public.content_status not null default 'rascunho',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contents_category_idx on public.contents (category_id);
create index contents_status_idx on public.contents (status, published_at desc);

create table public.content_topics (
  content_id uuid not null references public.contents (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete restrict,
  primary key (content_id, topic_id)
);
create index content_topics_topic_idx on public.content_topics (topic_id);

create table public.content_faculty (
  content_id uuid not null references public.contents (id) on delete cascade,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  position integer not null default 0,
  primary key (content_id, faculty_id)
);
create index content_faculty_faculty_idx on public.content_faculty (faculty_id);

create table public.content_attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  file_path text,
  file_name text,
  url text check (url is null or url ~* '^https?://'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((file_path is not null) <> (url is not null))
);
create index content_attachments_content_idx on public.content_attachments (content_id, position);

-- Sem linhas = disponível para todas as turmas.
create table public.content_cohorts (
  content_id uuid not null references public.contents (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  primary key (content_id, cohort_id)
);

create table public.module_contents (
  module_id uuid not null references public.modules (id) on delete cascade,
  content_id uuid not null references public.contents (id) on delete cascade,
  phase public.module_phase not null default 'antes',
  requirement public.requirement_level not null default 'recomendado',
  position integer not null default 0,
  note text,
  primary key (module_id, content_id)
);
create index module_contents_content_idx on public.module_contents (content_id);

create table public.content_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content_id uuid not null references public.contents (id) on delete cascade,
  status public.progress_status not null default 'iniciado',
  position_seconds integer not null default 0 check (position_seconds >= 0),
  percent smallint not null default 0 check (percent between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index content_progress_content_idx on public.content_progress (content_id);

-- Índice de busca (tabela à parte: atualizar a busca não "altera" o conteúdo nem polui o histórico).
create table public.content_search (
  content_id uuid primary key references public.contents (id) on delete cascade,
  vector tsvector not null
);
create index content_search_vector_idx on public.content_search using gin (vector);

-- ─── Funções de permissão ───────────────────────────────────────────────────────────────────────────
-- Admin, ou coordenação de alguma turma (para leituras administrativas sem dados de turma específica).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.user_id = (select auth.uid()) and e.role_in_cohort = 'coordenacao' and e.status = 'ativa'
      and p.deactivated_at is null
  )
$$;

-- A pessoa tem acesso pelas turmas do conteúdo (sem turmas = qualquer matrícula ativa).
-- p_coord_only: só conta coordenação (que vê antes da data de liberação).
create or replace function public.content_cohort_access(p_content_id uuid, p_coord_only boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.content_cohorts cc where cc.content_id = p_content_id) then exists (
      select 1 from public.content_cohorts cc
      where cc.content_id = p_content_id
        and (public.coordinates(cc.cohort_id) or (not p_coord_only and public.is_enrolled(cc.cohort_id)))
    )
    else exists (
      select 1 from public.enrollments e
      join public.profiles p on p.id = e.user_id
      where e.user_id = (select auth.uid()) and e.status = 'ativa' and p.deactivated_at is null
        and (not p_coord_only or e.role_in_cohort = 'coordenacao')
    )
  end
$$;

create or replace function public.content_readable(p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.contents c
    where c.id = p_content_id and c.status = 'publicado'
      and (
        public.content_cohort_access(c.id, true)
        or ((c.available_from is null or c.available_from <= now()) and public.content_cohort_access(c.id, false))
      )
  )
$$;

-- Progresso de um aluno: ele mesmo, admin, ou coordenação de uma turma em que ele é aluno.
create or replace function public.progress_visible(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) or public.is_admin() or exists (
    select 1 from public.enrollments e
    where e.user_id = p_user_id and e.role_in_cohort = 'aluno' and public.coordinates(e.cohort_id)
  )
$$;

create or replace function public.library_file_readable(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.contents c where c.file_path = p_path and public.content_readable(c.id))
      or exists (select 1 from public.content_attachments a where a.file_path = p_path and public.content_readable(a.content_id))
$$;

-- ─── Busca ──────────────────────────────────────────────────────────────────────────────────────────
-- Pesos: título (A) · temas e sinônimos (B) · professores e área (C) · descrição e referência (D).
create or replace function public.refresh_content_search(p_content_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.content_search (content_id, vector)
  select c.id,
    setweight(to_tsvector('portuguese', public.search_normalize(c.title)), 'A')
    || setweight(to_tsvector('portuguese', public.search_normalize(coalesce((
         select string_agg(t.name || ' ' || array_to_string(t.synonyms, ' '), ' ')
         from public.content_topics ct join public.topics t on t.id = ct.topic_id
         where ct.content_id = c.id), ''))), 'B')
    || setweight(to_tsvector('portuguese', public.search_normalize(concat_ws(' ', cat.name, (
         select string_agg(concat_ws(' ', f.honorific, f.display_name, f.full_name), ' ')
         from public.content_faculty cf join public.faculty f on f.id = cf.faculty_id
         where cf.content_id = c.id)))), 'C')
    || setweight(to_tsvector('portuguese', public.search_normalize(concat_ws(' ', c.description, c.citation))), 'D')
  from public.contents c
  join public.categories cat on cat.id = c.category_id
  where c.id = p_content_id
  on conflict (content_id) do update set vector = excluded.vector
$$;

create or replace function public.content_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if tg_table_name = 'contents' then
    perform public.refresh_content_search(new.id);
  elsif tg_table_name in ('content_topics', 'content_faculty') then
    for v_id in select distinct x from unnest(array[(to_jsonb(new) ->> 'content_id')::uuid, (to_jsonb(old) ->> 'content_id')::uuid]) x where x is not null loop
      if exists (select 1 from public.contents where id = v_id) then perform public.refresh_content_search(v_id); end if;
    end loop;
  elsif tg_table_name = 'topics' then
    for v_id in select content_id from public.content_topics where topic_id = new.id loop perform public.refresh_content_search(v_id); end loop;
  elsif tg_table_name = 'faculty' then
    for v_id in select content_id from public.content_faculty where faculty_id = new.id loop perform public.refresh_content_search(v_id); end loop;
  elsif tg_table_name = 'categories' then
    for v_id in select id from public.contents where category_id = new.id loop perform public.refresh_content_search(v_id); end loop;
  end if;
  return null;
end
$$;

create trigger contents_search after insert or update on public.contents
  for each row execute function public.content_search_trigger();
create trigger content_topics_search after insert or delete on public.content_topics
  for each row execute function public.content_search_trigger();
create trigger content_faculty_search after insert or delete on public.content_faculty
  for each row execute function public.content_search_trigger();
create trigger topics_search after update of name, synonyms on public.topics
  for each row execute function public.content_search_trigger();
create trigger faculty_search after update of display_name, full_name, honorific on public.faculty
  for each row execute function public.content_search_trigger();
create trigger categories_search after update of name on public.categories
  for each row execute function public.content_search_trigger();

-- Busca do aluno (respeita o que a pessoa pode ver). Devolve ids ordenados por relevância.
create or replace function public.search_library(p_query text)
returns table (content_id uuid, rank real)
language sql
stable
set search_path = ''
as $$
  select s.content_id, ts_rank(s.vector, x.q) as rank
  from public.content_search s, (select public.library_tsquery(p_query) as q) x
  where x.q is not null and s.vector @@ x.q and public.content_readable(s.content_id)
  order by rank desc
  limit 200
$$;

-- ─── Gatilhos de integridade ────────────────────────────────────────────────────────────────────────
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger topics_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger topic_notes_updated_at before update on public.topic_notes for each row execute function public.set_updated_at();
create trigger contents_updated_at before update on public.contents for each row execute function public.set_updated_at();
create trigger content_progress_updated_at before update on public.content_progress for each row execute function public.set_updated_at();
-- Datas de publicação e arquivamento mantidas pelo banco (mesma regra dos módulos).
create trigger contents_lifecycle before insert or update on public.contents
  for each row execute function public.modules_lifecycle();

-- Conteúdo já publicado nunca é apagado (arquiva-se); rascunho nunca publicado pode ser excluído.
create or replace function public.contents_guard_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null then
    raise exception 'Conteúdo já publicado não pode ser excluído: arquive.' using errcode = 'P0001';
  end if;
  return old;
end
$$;
create trigger contents_guard_delete before delete on public.contents
  for each row execute function public.contents_guard_delete();

-- Progresso: data de conclusão mantida pelo banco; ninguém mexe no progresso de outra pessoa.
create or replace function public.content_progress_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;
  if new.status = 'concluido' then
    new.completed_at = coalesce(case when tg_op = 'UPDATE' then old.completed_at end, now());
    new.percent = 100;
  else
    new.completed_at = null;
  end if;
  return new;
end
$$;
create trigger content_progress_stamp before insert or update on public.content_progress
  for each row execute function public.content_progress_stamp();

-- ─── Juntar temas (o tema de origem é arquivado; vínculos e sinônimos passam para o destino) ────────
create or replace function public.merge_topics(p_from uuid, p_into uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare v_moved integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin junta temas.' using errcode = '42501';
  end if;
  if p_from = p_into then
    raise exception 'Escolha dois temas diferentes.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.topics where id = p_into and archived_at is null)
     or not exists (select 1 from public.topics where id = p_from and archived_at is null) then
    raise exception 'Os dois temas precisam estar ativos.' using errcode = 'P0001';
  end if;
  insert into public.content_topics (content_id, topic_id)
  select content_id, p_into from public.content_topics where topic_id = p_from
  on conflict do nothing;
  get diagnostics v_moved = row_count;
  delete from public.content_topics where topic_id = p_from;
  update public.topics t
     set synonyms = array(
       select distinct s from unnest(t.synonyms || f.synonyms || array[f.name]) s
       where lower(s) <> lower(t.name)
       order by s)
    from public.topics f
   where t.id = p_into and f.id = p_from;
  update public.topics set archived_at = now(), merged_into = p_into where id = p_from;
  return v_moved;
end
$$;

-- ─── Histórico ("de → para", com autor) ─────────────────────────────────────────────────────────────
alter table public.change_log add column if not exists content_id uuid;
create index if not exists change_log_content_idx on public.change_log (content_id, at desc);

create or replace function public.log_library_change()
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
  v_module uuid := (v_row ->> 'module_id')::uuid;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('de', v_old -> k, 'para', v_new -> k))
      into v_changes
      from jsonb_object_keys(v_new) k
     where v_new -> k is distinct from v_old -> k
       and k not in ('updated_at', 'published_at', 'archived_at');
    if v_changes is null then
      return null;
    end if;
  else
    v_changes := v_row;
  end if;

  insert into public.change_log (actor, table_name, row_id, module_id, cohort_id, content_id, action, changes)
  values (
    (select auth.uid()),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'topic_id', concat_ws(':', v_row ->> 'module_id', v_row ->> 'content_id', v_row ->> 'topic_id', v_row ->> 'faculty_id', v_row ->> 'cohort_id')),
    v_module,
    case when v_module is not null then (select cohort_id from public.modules where id = v_module) end,
    case when tg_table_name = 'contents' then (v_row ->> 'id')::uuid else (v_row ->> 'content_id')::uuid end,
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
    'categories', 'topics', 'topic_notes', 'contents', 'content_topics', 'content_faculty', 'content_attachments',
    'content_cohorts', 'module_contents'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_library_change()',
      t || '_log', t
    );
  end loop;
end
$$;

-- ─── Privilégios ────────────────────────────────────────────────────────────────────────────────────
revoke all on public.categories, public.topics, public.topic_notes, public.contents, public.content_topics,
  public.content_faculty, public.content_attachments, public.content_cohorts, public.module_contents,
  public.content_progress, public.content_search
  from anon, authenticated;

grant select, insert, update on public.categories, public.topics, public.topic_notes to authenticated;
grant select, insert, update, delete on public.contents, public.content_topics, public.content_faculty,
  public.content_attachments, public.content_cohorts, public.module_contents to authenticated;
grant select, insert, update on public.content_progress to authenticated;
grant select on public.content_search to authenticated;

revoke all on function public.content_cohort_access(uuid, boolean), public.content_readable(uuid),
  public.progress_visible(uuid), public.library_file_readable(text), public.refresh_content_search(uuid),
  public.content_search_trigger(), public.search_library(text), public.merge_topics(uuid, uuid),
  public.log_library_change(), public.contents_guard_delete(), public.content_progress_stamp(), public.is_staff()
  from public, anon;
grant execute on function public.content_cohort_access(uuid, boolean), public.content_readable(uuid),
  public.progress_visible(uuid), public.library_file_readable(text), public.search_library(text),
  public.merge_topics(uuid, uuid), public.is_staff()
  to authenticated;

-- ─── Regras de acesso (RLS) ─────────────────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.topics enable row level security;
alter table public.topic_notes enable row level security;
alter table public.contents enable row level security;
alter table public.content_topics enable row level security;
alter table public.content_faculty enable row level security;
alter table public.content_attachments enable row level security;
alter table public.content_cohorts enable row level security;
alter table public.module_contents enable row level security;
alter table public.content_progress enable row level security;
alter table public.content_search enable row level security;

-- Taxonomia: qualquer pessoa logada lê; só admin grava.
create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy topics_select on public.topics for select to authenticated using (true);
create policy topics_insert on public.topics for insert to authenticated with check (public.is_admin());
create policy topics_update on public.topics for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy topic_notes_select on public.topic_notes for select to authenticated using (public.is_staff());
create policy topic_notes_insert on public.topic_notes for insert to authenticated with check (public.is_admin());
create policy topic_notes_update on public.topic_notes for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Conteúdos e o que pertence a eles: leitura conforme content_readable; escrita só admin.
create policy contents_select on public.contents for select to authenticated using (public.content_readable(id));
create policy contents_insert on public.contents for insert to authenticated with check (public.is_admin());
create policy contents_update on public.contents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy contents_delete on public.contents for delete to authenticated using (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['content_topics', 'content_faculty', 'content_attachments', 'content_cohorts'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.content_readable(content_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_delete', t);
  end loop;
end
$$;

create policy module_contents_select on public.module_contents for select to authenticated
  using (public.module_readable(module_id) and public.content_readable(content_id));
create policy module_contents_insert on public.module_contents for insert to authenticated with check (public.is_admin());
create policy module_contents_update on public.module_contents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy module_contents_delete on public.module_contents for delete to authenticated using (public.is_admin());

-- Progresso: cada aluno grava só o próprio, só de conteúdo que pode ver; admin e coordenação da turma leem.
create policy content_progress_select on public.content_progress for select to authenticated
  using (public.progress_visible(user_id));
create policy content_progress_insert on public.content_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and public.content_readable(content_id));
create policy content_progress_update on public.content_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.content_readable(content_id));

create policy content_search_select on public.content_search for select to authenticated
  using (public.content_readable(content_id));

-- ─── Arquivos da biblioteca (bucket privado; leitura por link temporário) ───────────────────────────
-- Só existe no Supabase (o Postgres do CI não tem o esquema storage).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('library-files', 'library-files', false, 52428800)
    on conflict (id) do nothing;
    execute $p$create policy library_files_select on storage.objects for select to authenticated
      using (bucket_id = 'library-files' and public.library_file_readable(name))$p$;
    execute $p$create policy library_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'library-files' and public.is_admin())$p$;
    execute $p$create policy library_files_update on storage.objects for update to authenticated
      using (bucket_id = 'library-files' and public.is_admin())$p$;
    execute $p$create policy library_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'library-files' and public.is_admin())$p$;
  end if;
end
$$;

update public.schema_info set version = '20261010120000_biblioteca', updated_at = now();
