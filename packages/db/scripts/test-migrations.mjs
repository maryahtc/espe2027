/**
 * Aplica todas as migrações, em ordem, num banco PostgreSQL vazio e confere o resultado.
 * Uso: DATABASE_URL=postgres://... node scripts/test-migrations.mjs
 *
 * Simula os papéis que o Supabase cria (anon, authenticated, service_role) para que as
 * migrações rodem também num Postgres comum (CI e desenvolvimento local).
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
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
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
   grant usage on schema public to anon, authenticated, service_role;`,
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
