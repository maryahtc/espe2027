-- Bloco A · B2 — Quadro único de pendências e providências da especialização (substitui as abas PENDÊNCIAS,
-- EQUIPAMENTOS, MARKETING, FOTO E VÍDEO e EXPERIENCIA da planilha-base, e os materiais a providenciar por módulo).
--
-- Migração SÓ ADITIVA: 3 tipos novos, 1 tabela nova, funções e políticas próprias, gatilhos na tabela nova e a versão
-- do esquema. Nenhuma tabela, coluna, política, função ou dado existente é alterado.
--
-- Regras (aprovadas em 21/11/2026):
-- - Responsável é uma pessoa do cadastro de equipe (public.faculty), inclusive sem login no portal.
-- - Admin: vê, cria, edita e exclui todas as pendências (gerais e de qualquer turma).
-- - Coordenação: vê, cria e edita só as pendências da turma que coordena (matrícula de coordenação ativa); não vê as
--   gerais (sem turma) e não exclui (cancela).
-- - Aluno e visitante: nenhum acesso.
-- - Pendência ligada a módulo pertence à turma do módulo. Uma pendência não depende dela mesma.
-- - Histórico no change_log existente (quem, quando, o que mudou).

create type public.task_category as enum (
  'academico', 'administrativo', 'professores', 'materiais', 'equipamentos', 'parceiros', 'marketing', 'foto_video',
  'experiencia_aluno'
);
create type public.task_priority as enum ('alta', 'media', 'baixa');
create type public.task_status as enum ('aberta', 'em_andamento', 'aguardando', 'concluida', 'cancelada');

create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts (id) on delete restrict,
  module_id uuid references public.modules (id) on delete set null,
  category public.task_category not null default 'administrativo',
  title text not null check (length(btrim(title)) between 1 and 200),
  details text check (details is null or length(details) <= 4000),
  responsible_id uuid references public.faculty (id) on delete set null,
  due_date date,
  priority public.task_priority not null default 'media',
  status public.task_status not null default 'aberta',
  next_action text check (next_action is null or length(next_action) <= 500),
  depends_on_id uuid references public.admin_tasks (id) on delete set null,
  dependency_note text check (dependency_note is null or length(dependency_note) <= 500),
  quantity_needed numeric(10, 2) check (quantity_needed is null or quantity_needed >= 0),
  quantity_available numeric(10, 2) check (quantity_available is null or quantity_available >= 0),
  partner_name text check (partner_name is null or length(partner_name) <= 200),
  link_url text check (link_url is null or link_url ~* '^https://'),
  completed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (depends_on_id is null or depends_on_id <> id)
);
create index admin_tasks_cohort_idx on public.admin_tasks (cohort_id);
create index admin_tasks_module_idx on public.admin_tasks (module_id);
create index admin_tasks_open_due_idx on public.admin_tasks (due_date) where status in ('aberta', 'em_andamento', 'aguardando');

comment on table public.admin_tasks is
  'Quadro de pendências e providências (Admin/coordenação). Nunca visível a alunos.';

-- ─── Consistência ────────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_tasks_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_cohort uuid;
begin
  if new.module_id is not null then
    select cohort_id into v_module_cohort from public.modules where id = new.module_id;
    if new.cohort_id is null then
      new.cohort_id := v_module_cohort;
    elsif new.cohort_id <> v_module_cohort then
      raise exception 'O módulo não pertence a esta turma.' using errcode = '23514';
    end if;
  end if;
  if new.depends_on_id is not null and new.depends_on_id = new.id then
    raise exception 'Uma pendência não pode depender dela mesma.' using errcode = '23514';
  end if;
  -- Dependência só entre pendências da mesma turma (ou ambas gerais): ninguém aponta para o que não pode ver.
  if new.depends_on_id is not null and not exists (
    select 1 from public.admin_tasks d where d.id = new.depends_on_id and d.cohort_id is not distinct from new.cohort_id
  ) then
    raise exception 'A pendência de que esta depende precisa ser da mesma turma.' using errcode = '23514';
  end if;
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.completed_at := now();
  elsif new.status <> 'concluida' then
    new.completed_at := null;
  end if;
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := (select auth.uid());
  return new;
end
$$;

create trigger admin_tasks_guard before insert or update on public.admin_tasks
  for each row execute function public.admin_tasks_guard();
create trigger admin_tasks_updated_at before update on public.admin_tasks
  for each row execute function public.set_updated_at();
create trigger admin_tasks_log after insert or update or delete on public.admin_tasks
  for each row execute function public.log_change();

-- ─── Permissões ──────────────────────────────────────────────────────────────────────────────────
-- Quem pode ver/editar uma pendência: Admin, ou coordenação ativa da turma dela (gerais: só Admin).
create or replace function public.admin_task_editable(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or (p_cohort_id is not null and public.coordinates(p_cohort_id))
$$;

revoke all on public.admin_tasks from public, anon, authenticated;
grant select, insert, update, delete on public.admin_tasks to authenticated;
revoke all on function public.admin_task_editable(uuid), public.admin_tasks_guard() from public, anon, authenticated;
grant execute on function public.admin_task_editable(uuid) to authenticated;

alter table public.admin_tasks enable row level security;

create policy admin_tasks_select on public.admin_tasks for select to authenticated
  using (public.admin_task_editable(cohort_id));
create policy admin_tasks_insert on public.admin_tasks for insert to authenticated
  with check (public.admin_task_editable(cohort_id));
create policy admin_tasks_update on public.admin_tasks for update to authenticated
  using (public.admin_task_editable(cohort_id))
  with check (public.admin_task_editable(cohort_id));
create policy admin_tasks_delete on public.admin_tasks for delete to authenticated
  using (public.is_admin());

update public.schema_info set version = '20261123120000_pendencias', updated_at = now();
