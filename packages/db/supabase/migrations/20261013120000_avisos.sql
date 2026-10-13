-- Etapa 5 · Parte 2 — Avisos.
-- Migração só aditiva: duas tabelas novas, uma função auxiliar, gatilhos e regras de acesso. Nada existente muda.
--
-- Regras (aprovadas em 13/10/2026):
-- - Admin cria e publica para qualquer turma ou para todas (cohort_id nulo).
-- - Coordenação cria e publica só para a turma que coordena; não cria aviso "para todas".
-- - Aluno vê os avisos publicados da sua turma (e os "para todas"), só dentro do período de exibição.
-- - "Entendi" só em avisos comuns; os importantes ficam até a data final.
-- - Aviso que já foi publicado não é apagado: é arquivado (histórico mantido).

-- Hoje no fuso da especialização (as datas "de/até" são datas civis de São Paulo).
create or replace function public.sp_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  -- Nulo = todas as turmas (só admin).
  cohort_id uuid references public.cohorts (id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 1000),
  signature text check (signature is null or length(signature) <= 80),
  link_url text check (link_url is null or (length(link_url) <= 500 and (link_url ~ '^https://' or link_url ~ '^/[^/]'))),
  link_label text check (link_label is null or length(link_label) <= 60),
  important boolean not null default false,
  visible_from date not null,
  visible_until date not null,
  status public.content_status not null default 'rascunho',
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_period check (visible_until >= visible_from)
);
create index announcements_cohort_idx on public.announcements (cohort_id, visible_until desc);
create index announcements_live_idx on public.announcements (status, visible_from, visible_until);

-- "Entendi": o aluno esconde um aviso comum para si.
create table public.announcement_dismissals (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
create index announcement_dismissals_announcement_idx on public.announcement_dismissals (announcement_id);

create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
-- Mesmo ciclo de vida dos módulos: carimba published_at / archived_at.
create trigger announcements_lifecycle before insert or update on public.announcements
  for each row execute function public.modules_lifecycle();
-- Histórico "de → para" (change_log), como o resto do painel.
create trigger announcements_log after insert or update or delete on public.announcements
  for each row execute function public.log_change();

-- ─── Privilégios ──────────────────────────────────────────────────────────────────────────────────
revoke all on public.announcements, public.announcement_dismissals from anon, authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, delete on public.announcement_dismissals to authenticated;
revoke all on function public.sp_today() from public, anon;
grant execute on function public.sp_today() to authenticated;

-- ─── RLS ──────────────────────────────────────────────────────────────────────────────────────────
alter table public.announcements enable row level security;
alter table public.announcement_dismissals enable row level security;

-- Leitura: admin vê tudo; coordenação vê tudo da própria turma; os demais, só o publicado e no período.
create policy announcements_select on public.announcements for select to authenticated
  using (
    public.is_admin()
    or (cohort_id is not null and public.coordinates(cohort_id))
    or (
      status = 'publicado'
      and visible_from <= public.sp_today()
      and visible_until >= public.sp_today()
      and (cohort_id is null or public.is_enrolled(cohort_id))
    )
  );
-- Escrita: admin em qualquer turma ou "todas"; coordenação só na própria turma (nunca "todas").
create policy announcements_insert on public.announcements for insert to authenticated
  with check (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)));
create policy announcements_update on public.announcements for update to authenticated
  using (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)))
  with check (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)));
-- Excluir: só rascunho que nunca foi publicado. O que já foi ao ar é arquivado.
create policy announcements_delete on public.announcements for delete to authenticated
  using (
    published_at is null and status = 'rascunho'
    and (public.is_admin() or (cohort_id is not null and public.coordinates(cohort_id)))
  );

-- "Entendi": cada pessoa só vê e grava os próprios; só em aviso comum que ela consegue ler.
create policy announcement_dismissals_select on public.announcement_dismissals for select to authenticated
  using (user_id = (select auth.uid()));
create policy announcement_dismissals_insert on public.announcement_dismissals for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.announcements a where a.id = announcement_id and not a.important)
  );
create policy announcement_dismissals_delete on public.announcement_dismissals for delete to authenticated
  using (user_id = (select auth.uid()));

-- Versão do esquema (lida pelo /api/saude).
update public.schema_info set version = '20261013120000_avisos', updated_at = now();
