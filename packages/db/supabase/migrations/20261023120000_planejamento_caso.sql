-- Etapa 8 · Parte 1 — Planejamento do caso. Migração só aditiva: 2 tabelas novas, funções, gatilhos e políticas novas.
-- Nada da Etapa 6/7 muda: performed_procedures, active_performed_procedures, catálogo e regras existentes intactos.
--
-- Conceito (aprovado em 23/10/2026):
-- - Jornada do caso = o que aconteceu (registros reais). Planejamento do caso = o que o aluno pretende fazer.
-- - O planejamento NUNCA é registro, produção, prontuário ou agenda: sem data prevista, horário, diagnóstico ou
--   nota por item. Nenhuma ação do planejamento grava em performed_procedures.
-- - Vínculo: uma consulta planejada só se relaciona com o realizado quando o aluno a vincula a uma consulta real
--   (caso + data) que tenha pelo menos um registro ativo. Vinculada = somente leitura (só desfazer o vínculo).
-- - Mesmo catálogo procedimento → etapa e mesmas regras de dentes/arcada/quantidade (gatilho da Etapa 6 reutilizado).
-- - Caso concluído, removido ou turma encerrada: planejamento somente leitura.
-- - Limites: 20 consultas planejadas por caso, 15 itens por consulta.

-- ─── Tabelas ──────────────────────────────────────────────────────────────────────────────────────
create table public.case_plan_visits (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.clinical_cases (id) on delete cascade,
  -- Copiado do caso pelo gatilho (regras de acesso sem junções).
  owner_id uuid not null,
  position integer not null default 0,
  -- "Observação do planejamento (opcional)": curta, sem identificadores pessoais. Não é prontuário.
  note text check (note is null or (length(note) <= 200 and not public.has_personal_identifier(note))),
  -- Consulta real vinculada (caso + data). Nula enquanto planejada.
  realized_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index case_plan_visits_case_idx on public.case_plan_visits (case_id, position);
-- No máximo uma consulta planejada vinculada a cada consulta real do caso.
create unique index case_plan_visits_realized_key on public.case_plan_visits (case_id, realized_on) where realized_on is not null;

create table public.case_plan_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.case_plan_visits (id) on delete cascade,
  -- Copiados da consulta planejada e da etapa pelo gatilho.
  case_id uuid not null,
  owner_id uuid not null,
  step_id uuid not null references public.procedure_steps (id) on delete restrict,
  procedure_id uuid not null references public.procedures (id) on delete restrict,
  -- Mesmas colunas (e mesmas validações) do registro real.
  teeth smallint[] not null default '{}' check (public.valid_teeth(teeth) and cardinality(teeth) <= 32),
  arch public.dental_arch,
  quantity integer not null default 1 check (quantity between 1 and 99),
  other_description text check (other_description is null or (length(btrim(other_description)) between 3 and 120 and not public.has_personal_identifier(other_description))),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index case_plan_items_visit_idx on public.case_plan_items (visit_id, position);
create index case_plan_items_case_idx on public.case_plan_items (case_id);

-- ─── Quem pode alterar o planejamento ─────────────────────────────────────────────────────────────
-- O dono, com turma e matrícula ativas (case_writable), caso em andamento e não removido.
create or replace function public.case_plan_writable(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.case_writable(p_case_id) and exists (
    select 1 from public.clinical_cases c
    where c.id = p_case_id and c.status = 'em_andamento' and c.removed_at is null
  )
$$;

-- ─── Gatilhos: consultas planejadas ───────────────────────────────────────────────────────────────
create or replace function public.case_plan_visits_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Exclusão em cascata (caso apagado definitivamente) segue; a do aluno exige desfazer o vínculo antes.
    if old.realized_on is not null and exists (select 1 from public.clinical_cases where id = old.case_id) then
      raise exception 'Consulta vinculada: desfaça o vínculo antes de excluir.' using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    select owner_id into new.owner_id from public.clinical_cases where id = new.case_id;
    if not found then
      raise exception 'Caso inexistente.' using errcode = '23503';
    end if;
    if new.realized_on is not null then
      raise exception 'Uma consulta planejada nasce sem vínculo.' using errcode = '23514';
    end if;
    if (select count(*) from public.case_plan_visits where case_id = new.case_id) >= 20 then
      raise exception 'No máximo 20 consultas planejadas por caso.' using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE: caso e dono não mudam.
  new.case_id := old.case_id;
  new.owner_id := old.owner_id;
  if old.realized_on is not null then
    -- Vinculada = somente leitura; a única mudança aceita é desfazer o vínculo.
    if new.realized_on is not null or new.note is distinct from old.note or new.position is distinct from old.position then
      raise exception 'Consulta vinculada: desfaça o vínculo para alterar.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.realized_on is not null and not exists (
    select 1 from public.performed_procedures pp
    where pp.case_id = new.case_id and pp.performed_on = new.realized_on and pp.removed_at is null
  ) then
    raise exception 'Só é possível vincular a uma consulta real com registro ativo nesta data.' using errcode = '23514';
  end if;
  if new.realized_on is not null and (new.note is distinct from old.note or new.position is distinct from old.position) then
    raise exception 'Vincule sem alterar a consulta planejada.' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger case_plan_visits_guard before insert or update or delete on public.case_plan_visits
  for each row execute function public.case_plan_visits_guard();
create trigger case_plan_visits_updated_at before update on public.case_plan_visits
  for each row execute function public.set_updated_at();

-- ─── Gatilhos: itens planejados ───────────────────────────────────────────────────────────────────
create or replace function public.case_plan_items_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visit record;
  v_step record;
begin
  if tg_op = 'DELETE' then
    -- Em cascata (consulta ou caso apagados) segue; com a consulta vinculada, não.
    if exists (select 1 from public.case_plan_visits where id = old.visit_id and realized_on is not null)
       and exists (select 1 from public.clinical_cases where id = old.case_id) then
      raise exception 'Consulta vinculada: desfaça o vínculo para alterar.' using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    new.visit_id := old.visit_id; -- um item não muda de consulta
  end if;
  select case_id, owner_id, realized_on into v_visit from public.case_plan_visits where id = new.visit_id;
  if not found then
    raise exception 'Consulta planejada inexistente.' using errcode = '23503';
  end if;
  if v_visit.realized_on is not null then
    raise exception 'Consulta vinculada: desfaça o vínculo para alterar.' using errcode = '23514';
  end if;
  new.case_id := v_visit.case_id;
  new.owner_id := v_visit.owner_id;

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
  else
    new.other_description := null;
  end if;

  if tg_op = 'INSERT' and (select count(*) from public.case_plan_items where visit_id = new.visit_id) >= 15 then
    raise exception 'No máximo 15 itens por consulta planejada.' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger case_plan_items_guard before insert or update or delete on public.case_plan_items
  for each row execute function public.case_plan_items_prepare();
-- Mesmas regras de dentes/arcada/quantidade do registro real: o gatilho da Etapa 6, reutilizado sem cópia
-- (a função só lê step_id, teeth, arch e quantity, que existem com o mesmo nome aqui).
create trigger case_plan_items_location before insert or update on public.case_plan_items
  for each row execute function public.performed_procedures_location();
create trigger case_plan_items_updated_at before update on public.case_plan_items
  for each row execute function public.set_updated_at();

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
revoke all on public.case_plan_visits, public.case_plan_items from anon, authenticated;
grant select, insert, update, delete on public.case_plan_visits, public.case_plan_items to authenticated;

revoke all on function public.case_plan_writable(uuid), public.case_plan_visits_guard(), public.case_plan_items_prepare()
  from public, anon, authenticated;
grant execute on function public.case_plan_writable(uuid) to authenticated;

-- ─── Regras de acesso (RLS) ───────────────────────────────────────────────────────────────────────
-- Leitura: quem lê o caso (dono; admin; coordenação da turma, sem removidos; acesso extra vigente).
-- Escrita: só o dono, com o caso em andamento, não removido e turma ativa. Coordenação e admin não escrevem.
alter table public.case_plan_visits enable row level security;
alter table public.case_plan_items enable row level security;

create policy case_plan_visits_select on public.case_plan_visits for select to authenticated
  using (public.case_readable(case_id));
create policy case_plan_visits_insert on public.case_plan_visits for insert to authenticated
  with check (public.case_plan_writable(case_id));
create policy case_plan_visits_update on public.case_plan_visits for update to authenticated
  using (public.case_plan_writable(case_id)) with check (public.case_plan_writable(case_id));
create policy case_plan_visits_delete on public.case_plan_visits for delete to authenticated
  using (public.case_plan_writable(case_id));

create policy case_plan_items_select on public.case_plan_items for select to authenticated
  using (public.case_readable(case_id));
create policy case_plan_items_insert on public.case_plan_items for insert to authenticated
  with check (public.case_plan_writable((select v.case_id from public.case_plan_visits v where v.id = visit_id)));
create policy case_plan_items_update on public.case_plan_items for update to authenticated
  using (public.case_plan_writable(case_id)) with check (public.case_plan_writable(case_id));
create policy case_plan_items_delete on public.case_plan_items for delete to authenticated
  using (public.case_plan_writable(case_id));

update public.schema_info set version = '20261023120000_planejamento_caso', updated_at = now();
