/**
 * Aplica todas as migrações, em ordem, num banco PostgreSQL vazio e confere o resultado.
 * Uso: DATABASE_URL=postgres://... node scripts/test-migrations.mjs
 *
 * Simula os papéis que o Supabase cria (anon, authenticated, service_role) e o mínimo do esquema
 * auth (auth.users, auth.uid()) para que as migrações rodem também num Postgres comum (CI e
 * desenvolvimento local). Depois roda os testes de isolamento (RLS) da pasta tests/.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não definida.')
  process.exit(1)
}
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'supabase', 'migrations')
const testsDir = path.join(root, 'tests')
const psql = (args) => execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-qAt', ...args], { encoding: 'utf8' })

psql([
  '-c',
  `do $$ begin
     if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
     if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
     if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
   end $$;
   -- Como no Supabase: papéis da API têm privilégio nas tabelas; quem filtra é a RLS.
   alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
   grant usage on schema public to anon, authenticated, service_role;
   -- Como no Supabase: auth.uid() lê o "sub" do JWT da requisição.
   create schema if not exists auth;
   create table if not exists auth.users (
     id uuid primary key,
     email text,
     raw_user_meta_data jsonb default '{}'::jsonb,
     raw_app_meta_data jsonb default '{}'::jsonb
   );
   create or replace function auth.uid() returns uuid language sql stable as $f$
     select coalesce(
       nullif(current_setting('request.jwt.claim.sub', true), ''),
       (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
     )::uuid
   $f$;
   grant usage on schema auth to anon, authenticated, service_role;
   grant execute on function auth.uid() to anon, authenticated, service_role;`,
])

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
for (const file of files) {
  psql(['-f', path.join(dir, file)])
  console.log(`✓ ${file}`)
}

const health = JSON.parse(psql(['-c', 'set role anon; select public.health();']).trim())
if (!health.ok) throw new Error('health() não devolveu ok')
const direct = psql(['-c', 'set role anon; select count(*) from public.schema_info;']).trim()
if (direct !== '0') throw new Error('anon conseguiu ler schema_info diretamente (RLS falhou)')
console.log(`✓ health() = ${JSON.stringify(health)} · RLS bloqueia leitura direta`)

// Testes de isolamento: cada arquivo devolve linhas "ordem|teste|passou" e desfaz tudo no final.
let falhas = 0
for (const file of readdirSync(testsDir).filter((f) => f.endsWith('.sql')).sort()) {
  const linhas = psql(['-F', '|', '-f', path.join(testsDir, file)]).trim().split('\n').filter(Boolean)
  if (linhas.length === 0) throw new Error(`${file} não devolveu resultados`)
  console.log(`\n${file}`)
  for (const linha of linhas) {
    const [ordem, teste, passou] = linha.split('|')
    const ok = passou === 't'
    if (!ok) falhas++
    console.log(`  ${ok ? '✓' : '✗'} ${ordem.padStart(2)}. ${teste}`)
  }
}
if (falhas > 0) {
  console.error(`\n${falhas} teste(s) de isolamento falharam.`)
  process.exit(1)
}
