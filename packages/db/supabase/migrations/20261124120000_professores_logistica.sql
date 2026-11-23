-- Bloco A · B1 — Professores: contato, confirmação de participação e logística (passagem e hospedagem) por módulo.
-- Substitui as colunas de logística da aba PROFESSORES da planilha-base (sem cachê: fica para a Gestão Financeira).
--
-- Migração SÓ ADITIVA: 3 tipos novos, 2 tabelas novas, função, gatilhos e políticas próprias e a versão do esquema.
-- Nenhuma tabela, coluna, política ou dado existente é alterado: a programação acadêmica (atividades, equipe dos
-- módulos, docentes) continua exatamente como está; esta migração só lê `faculty`, `modules`, `module_staff` e
-- `session_faculty` para as permissões.
--
-- Regras (aprovadas em 21–23/11/2026):
-- - Admin vê e edita contatos e logística.
-- - Coordenação ativa CONSULTA (só leitura) contatos e logística dos professores ligados à turma que coordena.
-- - Aluno e visitante: nenhum acesso. Ninguém exclui (situação "cancelado/cancelada"); histórico no change_log.
-- - Situações independentes: participação; passagem; hospedagem. Cada providência tem localizador/número de reserva,
--   link do comprovante, responsável (equipe acadêmica OU operacional), "aguardando quem" e observações.

create type public.participation_status as enum ('a_convidar', 'convidado', 'confirmado', 'recusado', 'cancelado');
create type public.travel_status as enum ('nao_precisa', 'a_providenciar', 'aguardando_confirmacao', 'comprada', 'cancelada');
create type public.lodging_status as enum ('nao_precisa', 'a_reservar', 'aguardando_confirmacao', 'reservada', 'cancelada');

-- ─── Contato dos professores (separado de faculty, que é legível por qualquer pessoa logada) ──────
create table public.faculty_contacts (
  faculty_id uuid primary key references public.faculty (id) on delete cascade,
  email text check (email is null or (length(email) <= 200 and email like '%_@_%')),
  phone text check (phone is null or length(phone) <= 40),
  city text check (city is null or length(city) <= 120),
  notes text check (notes is null or length(notes) <= 1000),
  updated_at timestamptz not null default now()
);

-- ─── Participação e logística por módulo ─────────────────────────────────────────────────────────
create table public.module_faculty_logistics (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  participation public.participation_status not null default 'a_convidar',
  invited_on date,
  answered_on date,
  -- Passagem
  travel public.travel_status not null default 'a_providenciar',
  travel_arrival timestamp,
  travel_departure timestamp,
  travel_locator text check (travel_locator is null or length(travel_locator) <= 100),
  travel_receipt_url text check (travel_receipt_url is null or travel_receipt_url ~* '^https://'),
  travel_responsible_id uuid references public.faculty (id) on delete set null,
  travel_responsible_ops_id uuid references public.ops_people (id) on delete set null,
  travel_waiting_on text check (travel_waiting_on is null or length(travel_waiting_on) <= 200),
  travel_notes text check (travel_notes is null or length(travel_notes) <= 1000),
  -- Hospedagem
  lodging public.lodging_status not null default 'a_reservar',
  lodging_name text check (lodging_name is null or length(lodging_name) <= 200),
  check_in date,
  check_out date,
  lodging_locator text check (lodging_locator is null or length(lodging_locator) <= 100),
  lodging_receipt_url text check (lodging_receipt_url is null or lodging_receipt_url ~* '^https://'),
  lodging_responsible_id uuid references public.faculty (id) on delete set null,
  lodging_responsible_ops_id uuid references public.ops_people (id) on delete set null,
  lodging_waiting_on text check (lodging_waiting_on is null or length(lodging_waiting_on) <= 200),
  lodging_notes text check (lodging_notes is null or length(lodging_notes) <= 1000),
  notes text check (notes is null or length(notes) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, faculty_id),
  check (num_nonnulls(travel_responsible_id, travel_responsible_ops_id) <= 1),
  check (num_nonnulls(lodging_responsible_id, lodging_responsible_ops_id) <= 1),
  check (travel_departure is null or travel_arrival is null or travel_departure >= travel_arrival),
  check (check_out is null or check_in is null or check_out >= check_in)
);
create index module_faculty_logistics_faculty_idx on public.module_faculty_logistics (faculty_id);

comment on table public.module_faculty_logistics is
  'Participação, passagem e hospedagem de cada professor em cada módulo (Admin edita; coordenação consulta).';

create or replace function public.module_faculty_logistics_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.module_id := old.module_id;
    new.faculty_id := old.faculty_id;
  end if;
  new.updated_by := (select auth.uid());
  return new;
end
$$;

create trigger module_faculty_logistics_guard before insert or update on public.module_faculty_logistics
  for each row execute function public.module_faculty_logistics_guard();
create trigger module_faculty_logistics_updated_at before update on public.module_faculty_logistics
  for each row execute function public.set_updated_at();
create trigger faculty_contacts_updated_at before update on public.faculty_contacts
  for each row execute function public.set_updated_at();
-- Histórico: logística tem módulo (a coordenação da turma lê); contatos não têm turma (só o Admin lê).
create trigger module_faculty_logistics_log after insert or update or delete on public.module_faculty_logistics
  for each row execute function public.log_change();
create trigger faculty_contacts_log after insert or update or delete on public.faculty_contacts
  for each row execute function public.log_change();

-- ─── Permissões ──────────────────────────────────────────────────────────────────────────────────
-- Coordenação lê o contato de quem está ligado à turma que coordena (equipe, atividade ou logística de um módulo dela).
create or replace function public.faculty_contact_readable(p_faculty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.modules m
    where public.coordinates(m.cohort_id) and (
      exists (select 1 from public.module_staff s where s.module_id = m.id and s.faculty_id = p_faculty_id)
      or exists (select 1 from public.session_faculty sf where sf.module_id = m.id and sf.faculty_id = p_faculty_id)
      or exists (select 1 from public.module_faculty_logistics l where l.module_id = m.id and l.faculty_id = p_faculty_id)
    )
  )
$$;

create or replace function public.module_logistics_readable(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (select 1 from public.modules m where m.id = p_module_id and public.coordinates(m.cohort_id))
$$;

revoke all on public.faculty_contacts, public.module_faculty_logistics from public, anon, authenticated;
grant select, insert, update on public.faculty_contacts, public.module_faculty_logistics to authenticated;
revoke all on function public.faculty_contact_readable(uuid), public.module_logistics_readable(uuid),
  public.module_faculty_logistics_guard() from public, anon, authenticated;
grant execute on function public.faculty_contact_readable(uuid), public.module_logistics_readable(uuid) to authenticated;

alter table public.faculty_contacts enable row level security;
alter table public.module_faculty_logistics enable row level security;

create policy faculty_contacts_select on public.faculty_contacts for select to authenticated
  using (public.faculty_contact_readable(faculty_id));
create policy faculty_contacts_insert on public.faculty_contacts for insert to authenticated with check (public.is_admin());
create policy faculty_contacts_update on public.faculty_contacts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy module_faculty_logistics_select on public.module_faculty_logistics for select to authenticated
  using (public.module_logistics_readable(module_id));
create policy module_faculty_logistics_insert on public.module_faculty_logistics for insert to authenticated
  with check (public.is_admin());
create policy module_faculty_logistics_update on public.module_faculty_logistics for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

update public.schema_info set version = '20261124120000_professores_logistica', updated_at = now();
