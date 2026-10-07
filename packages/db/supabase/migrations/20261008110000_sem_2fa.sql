-- Remoção da verificação em duas etapas (2FA) — decisão de 07/10/2026.
-- Todos os perfis entram só com e-mail e senha. Os poderes de admin e coordenação passam a depender apenas do
-- papel (profiles.role) e da matrícula de coordenação, como antes da Parte 2; a sessão não precisa mais de aal2.
-- Continuam valendo: RLS em todas as tabelas, isolamento entre turmas, papéis protegidos, último admin protegido.

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

-- Lista de pessoas do painel: sem a coluna de 2FA.
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
revoke all on function public.admin_people() from public, anon, authenticated;
grant execute on function public.admin_people() to authenticated;

-- Funções que só existiam para o 2FA.
drop function public.admin_reset_mfa(uuid);
drop function public.my_mfa_enrolled();
drop function public.has_mfa();

-- Fatores de 2FA já cadastrados deixam de existir (senão o Auth continuaria pedindo o código).
do $$
begin
  if to_regclass('auth.mfa_factors') is not null then
    delete from auth.mfa_factors;
  end if;
end
$$;

update public.schema_info set version = '20261008110000_sem_2fa', updated_at = now();
