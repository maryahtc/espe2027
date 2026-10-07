-- Etapa 2 · Parte 2 — login, convites e 2FA.
-- 1. 2FA também no banco: poderes de admin e de coordenação só valem numa sessão verificada com 2FA (aal2).
--    Sem 2FA, admin e coordenação enxergam apenas o que um usuário comum enxerga (o próprio perfil).
-- 2. Lista de pessoas para o painel (só admin) e redefinição de 2FA de outra pessoa (só admin).
-- 3. Criação do primeiro admin, executável apenas pelo dono do banco e só enquanto não houver admin.

-- ─── 2FA nas regras de acesso ─────────────────────────────────────────────────────────────────────
-- aal2 = sessão confirmada com o código do aplicativo autenticador.
create or replace function public.has_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_mfa() and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  )
$$;

create or replace function public.coordinates(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or (public.has_mfa() and exists (
    select 1 from public.enrollments
    where user_id = (select auth.uid()) and cohort_id = p_cohort_id
      and role_in_cohort = 'coordenacao' and status = 'ativa'
  ))
$$;

create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid())
    or public.is_admin()
    or (public.has_mfa() and exists (
      select 1
      from public.enrollments alvo
      join public.enrollments eu on eu.cohort_id = alvo.cohort_id
      where alvo.user_id = p_user_id
        and eu.user_id = (select auth.uid())
        and eu.role_in_cohort = 'coordenacao'
        and eu.status = 'ativa'
    ))
$$;

-- O próprio usuário tem 2FA confirmado? Decide entre "ativar" e "digitar o código" na entrada.
create or replace function public.my_mfa_enrolled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'
  )
$$;

-- ─── Painel de pessoas (só admin com 2FA) ─────────────────────────────────────────────────────────
create or replace function public.admin_people()
returns table (
  id uuid,
  email text,
  full_name text,
  display_name text,
  role public.app_role,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  has_mfa boolean,
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
    raise exception 'Apenas admin com 2FA.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.display_name, p.role, u.invited_at, u.last_sign_in_at,
           exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'),
           c.name, e.role_in_cohort, e.status, p.created_at
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

-- Celular perdido: o admin apaga os fatores de 2FA de outra pessoa, que configura de novo no próximo acesso.
create or replace function public.admin_reset_mfa(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin com 2FA.' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Não é possível redefinir o próprio 2FA por aqui.' using errcode = '42501';
  end if;
  delete from auth.mfa_factors where user_id = p_user_id;
end
$$;

-- ─── Primeiro admin ───────────────────────────────────────────────────────────────────────────────
-- Uso único, pelo dono do banco (SQL), depois que a pessoa aceitou o convite:
--   select public.bootstrap_first_admin('email@exemplo.com');
-- Recusa se já existir admin; a partir daí, papéis só mudam pelo painel.
create or replace function public.bootstrap_first_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Já existe um admin. Use o painel para alterar papéis.';
  end if;
  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'Nenhuma conta com este e-mail. Convide a pessoa primeiro.';
  end if;
  update public.profiles set role = 'admin' where id = v_id;
  return v_id;
end
$$;

revoke all on function public.has_mfa(), public.my_mfa_enrolled(), public.admin_people(), public.admin_reset_mfa(uuid),
  public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.has_mfa(), public.my_mfa_enrolled(), public.admin_people(), public.admin_reset_mfa(uuid)
  to authenticated;

update public.schema_info set version = '20261007130000_login_e_2fa', updated_at = now();
