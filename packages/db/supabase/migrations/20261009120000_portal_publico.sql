-- Etapa 3 · Parte A — o portal público passa a ler o banco.
-- O Admin do Portal do Aluno é a única fonte de cronograma, módulos e professores; o portal público só consulta.
--
-- Migração SOMENTE ADITIVA (regra de produção de 07/10/2026): uma coluna nova (padrão desmarcado), três visões e
-- permissões de leitura nelas. Nenhum dado existente é alterado ou apagado.
--
-- Como funciona a proteção:
-- - As visões têm uma lista FECHADA de colunas. O que não está aqui não existe para o portal público.
-- - Filtros no próprio banco: só a turma marcada "Exibir no portal público", só módulos publicados,
--   só equipe marcada como visível. Rascunho, arquivado, equipe interna e outras turmas nunca aparecem.
-- - O visitante (papel anon) só recebe SELECT nestas três visões; as tabelas continuam fechadas pela RLS.
-- - Nunca expostos: alunos, perfis, e-mails, matrículas, termos, observações internas (do módulo e dos dias),
--   histórico de alterações, materiais do aluno, entregas, recursos, arquivos, local, carga horária, preparo,
--   vínculo docente ↔ conta.

-- ─── Turma exibida no portal público (no máximo uma) ─────────────────────────────────────────────
alter table public.cohorts add column if not exists show_on_public boolean not null default false;
create unique index if not exists cohorts_one_on_public on public.cohorts ((true)) where show_on_public;

comment on column public.cohorts.show_on_public is
  'Turma exibida no portal público (no máximo uma). Começa desmarcada; só o admin altera.';

-- ─── Visões públicas ─────────────────────────────────────────────────────────────────────────────
-- Executam com os direitos do dono (não da pessoa), por isso os filtros abaixo são a regra de exposição.
-- security_barrier impede que filtros do visitante sejam avaliados antes dos filtros da visão.

create or replace view public.public_modules with (security_barrier = true) as
select
  m.id,
  coalesce(m.number, m.position) as number,
  m.position,
  m.title,
  m.theme,
  m.description,
  (select min(d.date) from public.module_days d where d.module_id = m.id) as starts_on,
  (select max(d.date) from public.module_days d where d.module_id = m.id) as ends_on,
  coalesce(array(
    select s.faculty_id from public.module_staff s
     where s.module_id = m.id and s.visible_to_students
     order by s.position, s.faculty_id
  ), '{}') as staff_ids
from public.modules m
join public.cohorts c on c.id = m.cohort_id and c.show_on_public
where m.status = 'publicado';

create or replace view public.public_schedule with (security_barrier = true) as
select
  s.id,
  s.module_id,
  d.date,
  (select count(*) from public.module_days d2 where d2.module_id = s.module_id and d2.date <= d.date)::int as day_number,
  s.period,
  s.starts_at,
  s.ends_at,
  s.title,
  s.description,
  s.activity_type,
  s.position,
  coalesce(array(
    select sf.faculty_id from public.session_faculty sf
     where sf.session_id = s.id
     order by (sf.role = 'apoio'), sf.faculty_id
  ), '{}') as faculty_ids,
  exists (select 1 from public.session_faculty sf where sf.session_id = s.id and sf.tentative) as tentative
from public.module_sessions s
join public.module_days d on d.id = s.day_id
join public.modules m on m.id = s.module_id and m.status = 'publicado'
join public.cohorts c on c.id = m.cohort_id and c.show_on_public;

create or replace view public.public_teachers with (security_barrier = true) as
select f.id, f.display_name, f.honorific, f.specialty, f.short_bio
from public.faculty f
where exists (
    select 1 from public.public_schedule ps where f.id = any (ps.faculty_ids)
  ) or exists (
    select 1 from public.public_modules pm where f.id = any (pm.staff_ids)
  );

comment on view public.public_modules is 'Portal público: módulos publicados da turma exibida. Lista fechada de colunas.';
comment on view public.public_schedule is 'Portal público: programação dos módulos publicados da turma exibida.';
comment on view public.public_teachers is 'Portal público: quem participa de atividade publicada ou equipe visível.';

-- ─── Permissões: visitante lê só as três visões ─────────────────────────────────────────────────
revoke all on public.public_modules, public.public_schedule, public.public_teachers from public, anon, authenticated;
grant select on public.public_modules, public.public_schedule, public.public_teachers to anon, authenticated;

update public.schema_info set version = '20261009120000_portal_publico', updated_at = now();
