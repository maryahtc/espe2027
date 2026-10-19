-- Etapa 6 · Parte 3 — foto de capa do caso (privada).
-- Migração só aditiva: uma função, uma restrição na coluna já existente (tabela vazia em produção), um bucket privado
-- e as regras de acesso aos arquivos. Nada existente muda.
--
-- Regras (E.5.1, aprovadas):
-- - Uma foto opcional por caso, só para reconhecer o caso na lista. Documentação clínica fica no Smile Cloud.
-- - Bucket privado; leitura só por link temporário gerado no servidor, para quem pode ler o caso (dono, coordenação da
--   turma em caso não removido, admin, acesso extra vigente).
-- - Só o dono envia, troca ou remove (turma ativa). O servidor reencoda a imagem (WebP, até 1600 px, miniatura) e
--   descarta todos os metadados (EXIF/GPS) antes de gravar.
-- - Na exclusão definitiva (admin, caso já removido) o servidor apaga os arquivos antes de purge_case.
-- Caminho: {dono}/{caso}/{carimbo}.webp e {dono}/{caso}/{carimbo}-mini.webp

-- Caso a que um arquivo pertence (pelo caminho). Nulo se o caminho não seguir o padrão.
create or replace function public.case_file_case(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}(-mini)?\.webp$'
    then split_part(p_path, '/', 2)::uuid
  end
$$;

-- A capa gravada no caso só pode apontar para a pasta do próprio caso (nunca para arquivo de outro caso/pessoa).
alter table public.clinical_cases add constraint clinical_cases_cover_path_check
  check (cover_path is null or cover_path ~ ('^' || owner_id::text || '/' || id::text || '/[0-9]{10,16}\.webp$'));

revoke all on function public.case_file_case(text) from public, anon;
grant execute on function public.case_file_case(text) to authenticated;

-- ─── Arquivos (bucket privado) — só existe no Supabase (o Postgres do CI não tem o esquema storage) ───
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('case-covers', 'case-covers', false, 5242880, array['image/webp'])
    on conflict (id) do nothing;
    -- Ler: quem pode ler o caso.
    execute $p$create policy case_covers_select on storage.objects for select to authenticated
      using (bucket_id = 'case-covers' and public.case_readable(public.case_file_case(name)))$p$;
    -- Enviar: só o dono, na própria pasta, com o caso editável (turma ativa).
    execute $p$create policy case_covers_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'case-covers' and split_part(name, '/', 1) = (select auth.uid())::text
                  and public.case_writable(public.case_file_case(name)))$p$;
    execute $p$create policy case_covers_update on storage.objects for update to authenticated
      using (bucket_id = 'case-covers' and split_part(name, '/', 1) = (select auth.uid())::text
             and public.case_writable(public.case_file_case(name)))$p$;
    -- Apagar: o dono (trocar/remover a capa) ou o admin, só de caso já removido (exclusão definitiva).
    execute $p$create policy case_covers_delete on storage.objects for delete to authenticated
      using (bucket_id = 'case-covers' and (
        (split_part(name, '/', 1) = (select auth.uid())::text and public.case_writable(public.case_file_case(name)))
        or (public.is_admin() and exists (
          select 1 from public.clinical_cases c where c.id = public.case_file_case(name) and c.removed_at is not null))
      ))$p$;
  end if;
end
$$;

update public.schema_info set version = '20261020120000_casos_capa', updated_at = now();
