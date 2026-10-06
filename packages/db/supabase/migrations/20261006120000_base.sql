-- Etapa 1 — base do banco do Portal do Aluno.
-- Ainda sem tabelas de domínio: elas chegam a partir da Etapa 2, sempre com RLS ligada.

-- Busca textual em português sem acento (biblioteca, procedimentos, temas).
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Registro da versão do esquema, lido pela verificação de saúde.
create table if not exists public.schema_info (
  id boolean primary key default true check (id),
  version text not null,
  updated_at timestamptz not null default now()
);
alter table public.schema_info enable row level security;
-- Sem políticas: nenhum papel lê a tabela diretamente; só a função abaixo.

insert into public.schema_info (version) values ('20261006120000_base')
on conflict (id) do update set version = excluded.version, updated_at = now();

-- Verificação de saúde: devolve só a versão do esquema. Nada de dados.
create or replace function public.health()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object('ok', true, 'schema', (select version from public.schema_info))
$$;

revoke all on function public.health() from public;
grant execute on function public.health() to anon, authenticated;
