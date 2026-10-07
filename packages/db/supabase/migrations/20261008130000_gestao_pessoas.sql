-- Gestão de pessoas e equipe: excluir com segurança e desativar acesso (07/10/2026).
-- Regra: o que já tem histórico não é apagado.
--   · Conta de pessoa (login): sem histórico → excluída pelo servidor (Auth); com histórico → acesso DESATIVADO
--     (deactivated_at): perde na hora os poderes de admin/coordenação e a turma; perfil e histórico ficam.
--   · Docente/equipe (sem login): sem vínculo com módulos/atividades → excluído; com vínculo → inativo.

alter table public.profiles add column deactivated_at timestamptz;

-- ─── Permissões só para contas ativas ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and deactivated_at is null
  )
$$;

create or replace function public.is_enrolled(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.user_id = (select auth.uid()) and e.cohort_id = p_cohort_id and e.status = 'ativa'
      and p.deactivated_at is null
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
    select 1 from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.user_id = (select auth.uid()) and e.cohort_id = p_cohort_id
      and e.role_in_cohort = 'coordenacao' and e.status = 'ativa' and p.deactivated_at is null
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
      join public.profiles p on p.id = eu.user_id
      where alvo.user_id = p_user_id
        and eu.user_id = (select auth.uid())
        and eu.role_in_cohort = 'coordenacao'
        and eu.status = 'ativa'
        and p.deactivated_at is null
    )
$$;

-- Papel e desativação só por admin; o último admin ativo não pode ser rebaixado nem desativado.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'O id do perfil não pode mudar.' using errcode = '42501';
  end if;
  if new.role is distinct from old.role or new.deactivated_at is distinct from old.deactivated_at then
    if current_user in ('authenticated', 'anon') and not public.is_admin() then
      raise exception 'Apenas admin altera papéis e acesso.' using errcode = '42501';
    end if;
    if old.role = 'admin' and old.deactivated_at is null
       and (new.role <> 'admin' or new.deactivated_at is not null)
       and not exists (
         select 1 from public.profiles where role = 'admin' and deactivated_at is null and id <> old.id
       ) then
      raise exception 'Não é possível remover o último admin.';
    end if;
  end if;
  return new;
end
$$;

-- ─── Lista de pessoas do painel: inclui desativação ───────────────────────────────────────────────
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
  deactivated_at timestamptz,
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
           p.deactivated_at, c.id, c.name, e.role_in_cohort, e.status, p.created_at
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

-- O que existe ligado a uma pessoa: decide entre excluir (nada) e desativar (há histórico).
create or replace function public.admin_person_footprint(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'entrou', exists (select 1 from auth.users where id = p_user_id and last_sign_in_at is not null),
    'aceites', (select count(*) from public.terms_acceptances where user_id = p_user_id),
    'materiais_marcados', (select count(*) from public.material_checks where user_id = p_user_id),
    'alteracoes', (select count(*) from public.change_log where actor = p_user_id),
    'docente_vinculado', (select count(*) from public.faculty where user_id = p_user_id)
  );
end
$$;
revoke all on function public.admin_person_footprint(uuid) from public, anon, authenticated;
grant execute on function public.admin_person_footprint(uuid) to authenticated;

-- ─── Docentes e equipe: exclusão só sem vínculos (as chaves estrangeiras já bloqueiam) ────────────
grant delete on public.faculty to authenticated;
create policy faculty_delete on public.faculty for delete to authenticated using (public.is_admin());

update public.schema_info set version = '20261008130000_gestao_pessoas', updated_at = now();
