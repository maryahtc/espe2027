-- Etapa 9 · Parte 1 — Workflows clínicos. Migração só aditiva: 1 tipo, 5 tabelas, funções, gatilhos e políticas
-- novos. Nenhuma tabela, função ou política existente é alterada (catálogo, Biblioteca, Casos, Jornada,
-- Planejamento e Minha Produção intactos).
--
-- Conceito (aprovado em 24/10/2026):
-- - Workflow = COMO FAZER: referência operacional de consulta rápida (passo a passo, materiais, pontos de atenção,
--   próximos passos, conteúdos para aprofundar). Não é prontuário, planejamento de paciente, aula, tarefa,
--   checklist acadêmico nem registro de produção. Sem progresso, conclusão ou porcentagem — o checklist de
--   materiais marcado pelo aluno vive só no navegador e NÃO existe no banco.
-- - Um workflow por procedimento do catálogo (no máximo um ativo = rascunho ou publicado). Nome e categoria vêm
--   SEMPRE do catálogo (não há colunas de nome/categoria aqui). "Outro procedimento" não pode ter workflow.
-- - Institucional: vale para todas as turmas.
-- - Aluno (matrícula ativa): lê só workflow publicado cujo procedimento está ativo. Procedimento desativado esconde o
--   workflow dos alunos sem apagá-lo nem despublicá-lo; reativado, volta a aparecer.
-- - Admin e coordenação ativa (perfil coordenação + matrícula de coordenação ativa em turma ativa): criam, editam,
--   ordenam, publicam, despublicam e arquivam — só nestas tabelas novas.
-- - Publicado exige pelo menos 1 etapa e pelo menos 1 passo em cada etapa (conferido no fim da transação).
-- - Próximos passos são só os cadastrados: o banco nunca infere orientação pela ordem das etapas.
-- - Conteúdo da Biblioteca é só referenciado (sem cópia). Conteúdo indisponível some para o aluno sem quebrar nada.
-- - Limites: 15 etapas por workflow; 30 itens de cada tipo por etapa; 6 próximos passos e 6 conteúdos por etapa.

-- ─── Tipo ─────────────────────────────────────────────────────────────────────────────────────────
create type public.workflow_item_kind as enum ('passo', 'material', 'atencao');

-- ─── Tabelas ──────────────────────────────────────────────────────────────────────────────────────
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references public.procedures (id) on delete restrict,
  -- Descrição curta opcional. Nome e categoria vêm do catálogo.
  summary text check (summary is null or length(btrim(summary)) between 1 and 280),
  status public.content_status not null default 'rascunho',
  position integer not null default 0,
  -- Primeira publicação (workflow já publicado não pode ser excluído, só arquivado).
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- No máximo um workflow ativo (rascunho ou publicado) por procedimento.
create unique index workflows_procedure_active_key on public.workflows (procedure_id) where status <> 'arquivado';
create index workflows_position_idx on public.workflows (position);

create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Etapa equivalente do catálogo (opcional, só para navegação contextual a partir do Planejamento).
  procedure_step_id uuid references public.procedure_steps (id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, slug)
);
create index workflow_stages_workflow_idx on public.workflow_stages (workflow_id, position);

create table public.workflow_stage_items (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.workflow_stages (id) on delete cascade,
  -- Copiado da etapa pelo gatilho (regras de acesso sem junções).
  workflow_id uuid not null,
  kind public.workflow_item_kind not null,
  text text not null check (length(btrim(text)) between 1 and 240),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflow_stage_items_stage_idx on public.workflow_stage_items (stage_id, kind, position);
create index workflow_stage_items_workflow_idx on public.workflow_stage_items (workflow_id);

create table public.workflow_stage_next (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.workflow_stages (id) on delete cascade,
  workflow_id uuid not null,
  -- Condição opcional ("Aprovado", "Necessita ajuste laboratorial").
  label text check (label is null or length(btrim(label)) between 1 and 80),
  -- Destino: outra etapa (ou a própria) do MESMO workflow. Etapa excluída leva junto o próximo passo.
  target_stage_id uuid references public.workflow_stages (id) on delete cascade,
  -- Orientação em texto, quando necessária.
  note text check (note is null or length(btrim(note)) between 1 and 200),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_stage_id is not null or note is not null)
);
create index workflow_stage_next_stage_idx on public.workflow_stage_next (stage_id, position);
create index workflow_stage_next_target_idx on public.workflow_stage_next (target_stage_id);
create index workflow_stage_next_workflow_idx on public.workflow_stage_next (workflow_id);

create table public.workflow_stage_contents (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.workflow_stages (id) on delete cascade,
  workflow_id uuid not null,
  -- Referência ao conteúdo existente (sem cópia). Rascunho de conteúdo excluído leva junto o vínculo.
  content_id uuid not null references public.contents (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (stage_id, content_id)
);
create index workflow_stage_contents_content_idx on public.workflow_stage_contents (content_id);
create index workflow_stage_contents_workflow_idx on public.workflow_stage_contents (workflow_id);

-- ─── Quem pode o quê ──────────────────────────────────────────────────────────────────────────────
-- Edita workflows: admin ativo, ou perfil de coordenação ativo com matrícula de coordenação ativa em turma ativa.
create or replace function public.workflow_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    join public.enrollments e on e.user_id = p.id
    join public.cohorts c on c.id = e.cohort_id
    where p.id = (select auth.uid()) and p.role = 'coordenacao' and p.deactivated_at is null
      and e.role_in_cohort = 'coordenacao' and e.status = 'ativa' and c.status = 'ativa'
  )
$$;

-- Lê um workflow: quem edita (tudo, inclusive rascunho, arquivado e procedimento desativado); os demais com
-- matrícula ativa e perfil ativo, só publicado e com o procedimento ativo no catálogo.
create or replace function public.workflow_readable(p_workflow_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.workflow_editor() or (
    exists (
      select 1 from public.workflows w
      join public.procedures pr on pr.id = w.procedure_id
      where w.id = p_workflow_id and w.status = 'publicado' and pr.active
    )
    and exists (
      select 1 from public.enrollments e
      join public.profiles p on p.id = e.user_id
      where e.user_id = (select auth.uid()) and e.status = 'ativa' and p.deactivated_at is null
    )
  )
$$;

-- ─── Gatilhos: workflow ───────────────────────────────────────────────────────────────────────────
create or replace function public.workflows_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proc record;
begin
  if tg_op = 'DELETE' then
    if old.published_at is not null then
      raise exception 'Workflow já publicado não pode ser excluído: arquive.' using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    select id, active into v_proc from public.procedures where id = new.procedure_id;
    if not found then
      raise exception 'Procedimento inexistente.' using errcode = '23503';
    end if;
    if exists (select 1 from public.procedure_steps where procedure_id = new.procedure_id and requires_description) then
      raise exception '"Outro procedimento" não pode ter workflow.' using errcode = '23514';
    end if;
    if not v_proc.active then
      raise exception 'Este procedimento está desativado no catálogo.' using errcode = '23514';
    end if;
    if new.status <> 'rascunho' then
      raise exception 'Um workflow nasce como rascunho.' using errcode = '23514';
    end if;
    new.published_at := null;
    new.archived_at := null;
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
    return new;
  end if;

  -- UPDATE: o procedimento não muda; quem criou e a primeira publicação são do banco.
  new.procedure_id := old.procedure_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := coalesce((select auth.uid()), old.updated_by);
  new.published_at := old.published_at;
  if new.status = 'publicado' and old.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'arquivado' then
    new.archived_at := coalesce(old.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end
$$;
create trigger workflows_guard before insert or update or delete on public.workflows
  for each row execute function public.workflows_guard();
create trigger workflows_updated_at before update on public.workflows
  for each row execute function public.set_updated_at();

-- Publicado precisa de pelo menos 1 etapa e pelo menos 1 passo em cada etapa. Conferido no FIM da transação
-- (gatilho adiado): permite criar a etapa e o primeiro passo juntos (workflow_add_stage) num workflow publicado,
-- e impede excluir a última etapa ou o último passo de uma etapa enquanto publicado.
create or replace function public.workflows_check_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workflow uuid := (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->>
    (case when tg_table_name = 'workflows' then 'id' else 'workflow_id' end);
begin
  if not exists (select 1 from public.workflows where id = v_workflow and status = 'publicado') then
    return null;
  end if;
  if not exists (select 1 from public.workflow_stages where workflow_id = v_workflow) then
    raise exception 'Workflow publicado precisa de pelo menos uma etapa.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.workflow_stages s
    where s.workflow_id = v_workflow
      and not exists (select 1 from public.workflow_stage_items i where i.stage_id = s.id and i.kind = 'passo')
  ) then
    raise exception 'Workflow publicado precisa de pelo menos um passo em cada etapa.' using errcode = '23514';
  end if;
  return null;
end
$$;
create constraint trigger workflows_check_published after insert or update on public.workflows
  deferrable initially deferred for each row execute function public.workflows_check_published();
create constraint trigger workflow_stages_check_published after insert or update or delete on public.workflow_stages
  deferrable initially deferred for each row execute function public.workflows_check_published();
create constraint trigger workflow_stage_items_check_published after insert or update or delete on public.workflow_stage_items
  deferrable initially deferred for each row execute function public.workflows_check_published();

-- ─── Gatilhos: etapas ─────────────────────────────────────────────────────────────────────────────
create or replace function public.workflow_stages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_procedure uuid;
  v_base text;
  v_slug text;
  v_n integer := 1;
begin
  if tg_op = 'UPDATE' then
    new.workflow_id := old.workflow_id; -- uma etapa não muda de workflow
  end if;
  select procedure_id into v_procedure from public.workflows where id = new.workflow_id;
  if not found then
    raise exception 'Workflow inexistente.' using errcode = '23503';
  end if;
  new.name := btrim(new.name);
  if new.procedure_step_id is not null and not exists (
    select 1 from public.procedure_steps where id = new.procedure_step_id and procedure_id = v_procedure
  ) then
    raise exception 'A etapa do catálogo precisa ser do mesmo procedimento do workflow.' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.workflow_stages where workflow_id = new.workflow_id) >= 15 then
    raise exception 'No máximo 15 etapas por workflow.' using errcode = '23514';
  end if;
  -- Endereço da etapa: gerado do nome quando não informado; estável ao renomear.
  if new.slug is null or btrim(new.slug) = '' then
    if tg_op = 'UPDATE' then
      new.slug := old.slug;
    else
      v_base := btrim(regexp_replace(public.search_normalize(new.name), '[^a-z0-9]+', '-', 'g'), '-');
      if v_base = '' then
        v_base := 'etapa';
      end if;
      v_base := left(v_base, 50);
      v_slug := v_base;
      while exists (select 1 from public.workflow_stages where workflow_id = new.workflow_id and slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
      end loop;
      new.slug := v_slug;
    end if;
  end if;
  return new;
end
$$;
create trigger workflow_stages_guard before insert or update on public.workflow_stages
  for each row execute function public.workflow_stages_guard();
create trigger workflow_stages_updated_at before update on public.workflow_stages
  for each row execute function public.set_updated_at();

-- ─── Gatilhos: itens, próximos passos e conteúdos (copiam o workflow da etapa; limites) ───────────
create or replace function public.workflow_stage_children_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_workflow uuid;
begin
  if tg_op = 'UPDATE' then
    new.stage_id := old.stage_id; -- não muda de etapa
  end if;
  select workflow_id into new.workflow_id from public.workflow_stages where id = new.stage_id;
  if not found then
    raise exception 'Etapa inexistente.' using errcode = '23503';
  end if;

  if tg_table_name = 'workflow_stage_items' then
    new.text := btrim(new.text);
    if tg_op = 'UPDATE' then
      if new.kind = old.kind then
        return new;
      end if;
    end if;
    if (select count(*) from public.workflow_stage_items where stage_id = new.stage_id and kind = new.kind) >= 30 then
      raise exception 'No máximo 30 itens de cada tipo por etapa.' using errcode = '23514';
    end if;

  elsif tg_table_name = 'workflow_stage_next' then
    new.label := nullif(btrim(new.label), '');
    new.note := nullif(btrim(new.note), '');
    if new.target_stage_id is not null then
      select workflow_id into v_target_workflow from public.workflow_stages where id = new.target_stage_id;
      if v_target_workflow is distinct from new.workflow_id then
        raise exception 'O próximo passo precisa apontar para uma etapa do mesmo workflow.' using errcode = '23514';
      end if;
    end if;
    if tg_op = 'INSERT' and (select count(*) from public.workflow_stage_next where stage_id = new.stage_id) >= 6 then
      raise exception 'No máximo 6 próximos passos por etapa.' using errcode = '23514';
    end if;

  elsif tg_table_name = 'workflow_stage_contents' then
    if tg_op = 'UPDATE' then
      new.content_id := old.content_id;
    end if;
    if tg_op = 'INSERT' then
      if not exists (select 1 from public.contents where id = new.content_id and status = 'publicado') then
        raise exception 'Só conteúdos publicados da Biblioteca podem ser relacionados.' using errcode = '23514';
      end if;
      if (select count(*) from public.workflow_stage_contents where stage_id = new.stage_id) >= 6 then
        raise exception 'No máximo 6 conteúdos por etapa.' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger workflow_stage_items_guard before insert or update on public.workflow_stage_items
  for each row execute function public.workflow_stage_children_guard();
create trigger workflow_stage_next_guard before insert or update on public.workflow_stage_next
  for each row execute function public.workflow_stage_children_guard();
create trigger workflow_stage_contents_guard before insert or update on public.workflow_stage_contents
  for each row execute function public.workflow_stage_children_guard();
create trigger workflow_stage_items_updated_at before update on public.workflow_stage_items
  for each row execute function public.set_updated_at();
create trigger workflow_stage_next_updated_at before update on public.workflow_stage_next
  for each row execute function public.set_updated_at();

-- ─── "Última atualização" e "por quem": qualquer mudança no conteúdo do workflow toca o workflow ──
create or replace function public.workflows_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workflow uuid := (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'workflow_id';
begin
  -- Em cascata (workflow excluído) a linha já não existe: nada a fazer.
  update public.workflows set updated_at = now() where id = v_workflow;
  return null;
end
$$;
create trigger workflow_stages_touch after insert or update or delete on public.workflow_stages
  for each row execute function public.workflows_touch();
create trigger workflow_stage_items_touch after insert or update or delete on public.workflow_stage_items
  for each row execute function public.workflows_touch();
create trigger workflow_stage_next_touch after insert or update or delete on public.workflow_stage_next
  for each row execute function public.workflows_touch();
create trigger workflow_stage_contents_touch after insert or update or delete on public.workflow_stage_contents
  for each row execute function public.workflows_touch();

-- ─── Histórico interno (quem, quando, "de → para"): função log_change existente, sem tela de versões ─
create trigger workflows_log after insert or update or delete on public.workflows
  for each row execute function public.log_change();
create trigger workflow_stages_log after insert or update or delete on public.workflow_stages
  for each row execute function public.log_change();
create trigger workflow_stage_items_log after insert or update or delete on public.workflow_stage_items
  for each row execute function public.log_change();
create trigger workflow_stage_next_log after insert or update or delete on public.workflow_stage_next
  for each row execute function public.log_change();
create trigger workflow_stage_contents_log after insert or update or delete on public.workflow_stage_contents
  for each row execute function public.log_change();

-- ─── Nova etapa com o primeiro passo, numa só transação (necessário em workflow publicado) ────────
-- security invoker: as regras de acesso valem normalmente para quem chama.
create or replace function public.workflow_add_stage(p_workflow_id uuid, p_name text, p_first_step text, p_procedure_step_id uuid default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_stage uuid;
  v_position integer;
begin
  select coalesce(max(position), 0) + 1 into v_position from public.workflow_stages where workflow_id = p_workflow_id;
  insert into public.workflow_stages (workflow_id, name, slug, procedure_step_id, position)
    values (p_workflow_id, p_name, '', p_procedure_step_id, v_position)
    returning id into v_stage;
  insert into public.workflow_stage_items (stage_id, kind, text, position) values (v_stage, 'passo', p_first_step, 1);
  return v_stage;
end
$$;

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
revoke all on public.workflows, public.workflow_stages, public.workflow_stage_items, public.workflow_stage_next,
  public.workflow_stage_contents from anon, authenticated;
grant select, insert, update, delete on public.workflows, public.workflow_stages, public.workflow_stage_items,
  public.workflow_stage_next, public.workflow_stage_contents to authenticated;

revoke all on function public.workflow_editor(), public.workflow_readable(uuid), public.workflows_guard(),
  public.workflows_check_published(), public.workflow_stages_guard(), public.workflow_stage_children_guard(),
  public.workflows_touch(), public.workflow_add_stage(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.workflow_editor(), public.workflow_readable(uuid),
  public.workflow_add_stage(uuid, text, text, uuid) to authenticated;

-- ─── Regras de acesso (RLS) ───────────────────────────────────────────────────────────────────────
-- Leitura: workflow_readable (aluno: publicado + procedimento ativo). Escrita: só quem edita workflows.
-- Conteúdo relacionado: o aluno só vê o vínculo se puder ler o conteúdo (indisponível some, sem quebrar).
alter table public.workflows enable row level security;
alter table public.workflow_stages enable row level security;
alter table public.workflow_stage_items enable row level security;
alter table public.workflow_stage_next enable row level security;
alter table public.workflow_stage_contents enable row level security;

create policy workflows_select on public.workflows for select to authenticated
  using (public.workflow_readable(id));
create policy workflows_insert on public.workflows for insert to authenticated
  with check (public.workflow_editor());
create policy workflows_update on public.workflows for update to authenticated
  using (public.workflow_editor()) with check (public.workflow_editor());
create policy workflows_delete on public.workflows for delete to authenticated
  using (public.workflow_editor() and published_at is null);

do $$
declare t text;
begin
  foreach t in array array['workflow_stages', 'workflow_stage_items', 'workflow_stage_next'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.workflow_readable(workflow_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.workflow_editor())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.workflow_editor()) with check (public.workflow_editor())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.workflow_editor())', t || '_delete', t);
  end loop;
end
$$;

create policy workflow_stage_contents_select on public.workflow_stage_contents for select to authenticated
  using (public.workflow_readable(workflow_id) and (public.workflow_editor() or public.content_readable(content_id)));
create policy workflow_stage_contents_insert on public.workflow_stage_contents for insert to authenticated
  with check (public.workflow_editor() and public.content_readable(content_id));
create policy workflow_stage_contents_update on public.workflow_stage_contents for update to authenticated
  using (public.workflow_editor()) with check (public.workflow_editor());
create policy workflow_stage_contents_delete on public.workflow_stage_contents for delete to authenticated
  using (public.workflow_editor());

update public.schema_info set version = '20261024120000_workflows_clinicos', updated_at = now();
