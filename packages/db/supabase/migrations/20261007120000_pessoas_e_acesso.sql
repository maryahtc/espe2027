-- Etapa 2 · Parte 1 — pessoas e acesso.
-- Turmas, perfis, matrículas, papéis e termo de uso versionado (decisões N.3), com RLS em todas as tabelas.
-- Login, convites e MFA chegam na Parte 2; aqui fica só o banco e as regras de acesso.

-- ─── Tipos ────────────────────────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'coordenacao', 'aluno');
create type public.cohort_status as enum ('ativa', 'encerrada');
create type public.cohort_role as enum ('aluno', 'coordenacao');
create type public.enrollment_status as enum ('ativa', 'inativa');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ─── Tabelas ──────────────────────────────────────────────────────────────────────────────────────

-- Turmas. Nunca são apagadas: encerrar = status 'encerrada'.
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  starts_on date not null,
  ends_on date not null,
  status public.cohort_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- Perfil = 1:1 com auth.users, criado automaticamente. Papel global; o vínculo por turma fica em enrollments.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  display_name text,
  role public.app_role not null default 'aluno',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- Matrículas. Desligar alguém da turma = status 'inativa' (preserva o histórico).
create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete restrict,
  role_in_cohort public.cohort_role not null default 'aluno',
  status public.enrollment_status not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, cohort_id)
);
create index enrollments_cohort_idx on public.enrollments (cohort_id);

-- Termo de uso versionado. A versão vigente é a de effective_from mais recente que já começou.
-- Depois de vigente, o texto é imutável (só se cria uma versão nova).
create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (length(btrim(version)) > 0),
  body text not null check (length(btrim(body)) > 0),
  is_provisional boolean not null default false,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Aceites: um por usuário e versão. Data/hora definida pelo banco, nunca pelo cliente.
create table public.terms_acceptances (
  user_id uuid not null references public.profiles (id) on delete cascade,
  terms_version_id uuid not null references public.terms_versions (id) on delete restrict,
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version_id)
);

create trigger cohorts_updated_at before update on public.cohorts
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger enrollments_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

-- ─── Funções auxiliares das regras de acesso ──────────────────────────────────────────────────────
-- security definer: leem profiles/enrollments sem passar pela RLS (evita recursão nas políticas).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Matrícula ativa na turma (como aluno ou coordenação).
create or replace function public.is_enrolled(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = (select auth.uid()) and cohort_id = p_cohort_id and status = 'ativa'
  )
$$;

-- Admin, ou coordenação ativa da turma.
create or replace function public.coordinates(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.enrollments
    where user_id = (select auth.uid()) and cohort_id = p_cohort_id
      and role_in_cohort = 'coordenacao' and status = 'ativa'
  )
$$;

-- Próprio perfil, admin, ou coordenação de alguma turma em que a pessoa está matriculada.
create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1
      from public.enrollments alvo
      join public.enrollments eu on eu.cohort_id = alvo.cohort_id
      where alvo.user_id = p_user_id
        and eu.user_id = (select auth.uid())
        and eu.role_in_cohort = 'coordenacao'
        and eu.status = 'ativa'
    )
$$;

create or replace function public.current_terms_version_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.terms_versions
  where effective_from <= now()
  order by effective_from desc
  limit 1
$$;

-- true quando existe versão vigente e o usuário ainda não a aceitou → pedir aceite no próximo acesso.
create or replace function public.needs_terms_acceptance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_terms_version_id() is not null
    and not exists (
      select 1 from public.terms_acceptances
      where user_id = (select auth.uid()) and terms_version_id = public.current_terms_version_id()
    )
$$;

-- ─── Gatilhos de integridade ──────────────────────────────────────────────────────────────────────

-- Toda conta nova ganha um perfil de aluno. O papel nunca vem de metadados enviados pelo usuário.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Papel só muda por admin; o último admin não pode ser rebaixado; id é imutável.
-- security invoker de propósito: current_user identifica quem chamou (authenticated = usuário logado).
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'O id do perfil não pode mudar.' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    if current_user in ('authenticated', 'anon') and not public.is_admin() then
      raise exception 'Apenas admin altera papéis.' using errcode = '42501';
    end if;
    if old.role = 'admin' and not exists (
      select 1 from public.profiles where role = 'admin' and id <> old.id
    ) then
      raise exception 'Não é possível remover o último admin.';
    end if;
  end if;
  return new;
end
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.terms_acceptances_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.accepted_at = now();
  return new;
end
$$;

create trigger terms_acceptances_stamp before insert on public.terms_acceptances
  for each row execute function public.terms_acceptances_stamp();

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
-- anon (visitante sem login) não toca em nada disto. authenticated passa sempre pela RLS.
-- Ninguém apaga linhas pela API: turmas encerram, matrículas inativam, termos ganham nova versão.

revoke all on public.cohorts, public.profiles, public.enrollments, public.terms_versions, public.terms_acceptances
  from anon;
revoke all on public.cohorts, public.profiles, public.enrollments, public.terms_versions, public.terms_acceptances
  from authenticated;
grant select, insert, update on public.cohorts, public.profiles, public.enrollments, public.terms_versions
  to authenticated;
grant select, insert on public.terms_acceptances to authenticated;

revoke all on function
  public.is_admin(), public.is_enrolled(uuid), public.coordinates(uuid), public.can_view_profile(uuid),
  public.current_terms_version_id(), public.needs_terms_acceptance(), public.handle_new_user(),
  public.profiles_guard(), public.terms_acceptances_stamp(), public.set_updated_at()
  from public, anon;
grant execute on function
  public.is_admin(), public.is_enrolled(uuid), public.coordinates(uuid), public.can_view_profile(uuid),
  public.current_terms_version_id(), public.needs_terms_acceptance()
  to authenticated;

-- ─── RLS ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.cohorts enable row level security;
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.terms_versions enable row level security;
alter table public.terms_acceptances enable row level security;

-- Turmas: vê quem está matriculado (ou admin). Só admin cria/edita.
create policy cohorts_select on public.cohorts for select to authenticated
  using (public.is_admin() or public.is_enrolled(id));
create policy cohorts_insert on public.cohorts for insert to authenticated
  with check (public.is_admin());
create policy cohorts_update on public.cohorts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Perfis: próprio, admin, ou coordenação da turma. Cada um edita o próprio (papel protegido pelo gatilho).
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- Matrículas: a própria, ou as da turma que coordena. Só admin cria/edita.
create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.coordinates(cohort_id));
create policy enrollments_insert on public.enrollments for insert to authenticated
  with check (public.is_admin());
create policy enrollments_update on public.enrollments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Termos: todos leem as versões já vigentes; admin lê todas, cria e corrige só versões ainda futuras.
create policy terms_versions_select on public.terms_versions for select to authenticated
  using (effective_from <= now() or public.is_admin());
create policy terms_versions_insert on public.terms_versions for insert to authenticated
  with check (public.is_admin());
create policy terms_versions_update on public.terms_versions for update to authenticated
  using (public.is_admin() and effective_from > now())
  with check (public.is_admin() and effective_from > now());

-- Aceites: cada um vê os seus (admin vê todos); só se aceita, em nome próprio, a versão vigente.
create policy terms_acceptances_select on public.terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy terms_acceptances_insert on public.terms_acceptances for insert to authenticated
  with check (user_id = (select auth.uid()) and terms_version_id = public.current_terms_version_id());

-- ─── Dados iniciais (editáveis pelo admin) ────────────────────────────────────────────────────────
insert into public.cohorts (name, slug, starts_on, ends_on)
values ('Especialização Conexo | Turma 2027', 'turma-2027', '2027-02-01', '2029-07-31')
on conflict (slug) do nothing;

insert into public.terms_versions (version, body, is_provisional, effective_from)
values (
  '0.1-provisorio',
  'TEXTO PROVISÓRIO — ainda não revisado juridicamente (LGPD). Será substituído pela versão oficial antes do '
  'uso com alunos reais.' || chr(10) || chr(10) ||
  'Ao acessar o Portal do Aluno da Especialização Conexo, você concorda em usar a plataforma apenas para fins '
  'acadêmicos, manter sua senha em sigilo e registrar pacientes somente por iniciais ou código, nunca pelo nome '
  'completo. Seus casos clínicos são visíveis apenas para você, para a coordenação da sua turma e para a '
  'administração do curso.',
  true,
  '2026-10-06 00:00:00-03'
)
on conflict (version) do nothing;

update public.schema_info set version = '20261007120000_pessoas_e_acesso', updated_at = now();
