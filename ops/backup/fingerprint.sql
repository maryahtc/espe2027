-- Impressão digital (somente leitura) do banco do Portal Conexo: dados de cada tabela de public + objetos do esquema
-- (colunas, políticas, funções, gatilhos, índices, permissões, RLS, visões, tipos) + Storage (buckets e objetos) +
-- contas (auth.users) + histórico de migrações. Mesma consulta usada nas publicações das Etapas 9 e 10.
-- Uso: psql "$DB_URL" -qAt -f fingerprint.sql
with fp(k, v) as (
with t as (select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE')
select 'tabela:'||table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*)::text||''|''||md5(coalesce(string_agg(r::text, '''' order by r::text),'''')) as c from public.%I r', table_name), false, true, '')))[1]::text from t
union all select 'colunas:'||table_name, md5(string_agg(column_name||':'||data_type||':'||coalesce(column_default,'')||':'||is_nullable, ',' order by ordinal_position)) from information_schema.columns where table_schema='public' group by table_name
union all select 'politica:'||tablename||'.'||policyname, md5(coalesce(qual,'')||'|'||coalesce(with_check,'')||'|'||cmd||'|'||array_to_string(roles,',')) from pg_policies where schemaname in ('public','storage')
union all select 'funcao:'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', md5(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p')
union all select 'gatilho:'||tgrelid::regclass::text||'.'||tgname, md5(pg_get_triggerdef(oid)) from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'storage.%' and tgrelid::regclass::text not like 'auth.%' and tgrelid::regclass::text not like 'realtime.%' and tgrelid::regclass::text not like 'supabase_%'
union all select 'indice:'||indexname, md5(indexdef) from pg_indexes where schemaname='public'
union all select 'acl:'||c.relname, md5(coalesce(c.relacl::text,'')) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','v')
union all select 'rls:'||relname, relrowsecurity::text from pg_class where relnamespace='public'::regnamespace and relkind='r'
union all select 'visao:'||viewname, md5(definition) from pg_views where schemaname='public'
union all select 'tipo:'||t.typname, md5(string_agg(e.enumlabel, ',' order by e.enumsortorder)) from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typnamespace='public'::regnamespace group by t.typname
union all select 'storage.buckets', md5(coalesce(string_agg(b::text,'' order by b.id),'')) from storage.buckets b
union all select 'storage.objects', count(*)::text||'|'||md5(coalesce(string_agg(o.name,'' order by o.name),'')) from storage.objects o
union all select 'auth.users', count(*)::text||'|'||md5(coalesce(string_agg(u.id::text||u.email||coalesce(u.encrypted_password,''),'' order by u.id),'')) from auth.users u
union all select 'migracoes', md5(coalesce(string_agg(version||name,',' order by version),'')) from supabase_migrations.schema_migrations
)
select count(*) || ' itens · ' || md5(string_agg(k||'='||coalesce(v,''), ';' order by k)) from fp;
