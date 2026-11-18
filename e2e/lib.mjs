// Biblioteca comum das suítes E2E do Portal do Aluno.
// ⚠ Só ambiente LOCAL (supabase start). Nunca produção: o banco precisa ser 127.0.0.1/localhost.
// Configuração vem do runner (e2e/run.mjs) por variáveis de ambiente — nenhuma credencial é versionada.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { chromium, devices } from 'playwright-core'

export const APP = process.env.E2E_APP ?? 'http://localhost:3001'
export const DB = process.env.E2E_DB ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
export const API = process.env.E2E_API ?? 'http://127.0.0.1:54321'
const SECRET = process.env.E2E_SECRET ?? ''

for (const url of [DB, API, APP]) {
  const host = new URL(url).hostname
  if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error(`E2E só roda no ambiente local (recebido: ${host}).`)
}
if (!SECRET) throw new Error('E2E_SECRET ausente: rode pelo runner (npm run e2e).')

/** Senha só das contas de teste locais, criadas e apagadas pelas suítes. */
export const SENHA = 'SenhaForte2027'

// ─── Banco local ────────────────────────────────────────────────────────────────────────────────
export const sql = (q) => execFileSync('psql', [DB, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', q], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
export const one = (q) => sql(q).split('\n')[0]
export const today = () => one('select public.sp_today()')
export const cohortId = (slug = 'turma-2027') => one(`select id from cohorts where slug='${slug}'`)
export const stepId = (proc, step) =>
  one(`select s.id from procedure_steps s join procedures p on p.id=s.procedure_id where p.slug='${proc}'${step ? ` and s.slug='${step}'` : ''} order by s.position limit 1`)
export const procId = (slug) => one(`select id from procedures where slug='${slug}'`)

/**
 * Impressão digital do banco inteiro (todas as tabelas de public) e do Storage. `skip` tira tabelas que o teste altera
 * de propósito (ex.: audit_log quando a coordenação abre um caso).
 */
export function fingerprint(skip = []) {
  const tables = sql("select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
    .split(',')
    .filter((t) => !skip.includes(t))
  const parts = tables.map((t) => `select 'public.${t}', count(*), md5(coalesce(string_agg(r::text, '' order by r::text),'')) from public.${t} r`)
  parts.push("select 'storage.objects', count(*), md5(coalesce(string_agg(r.name, '' order by r.name),'')) from storage.objects r")
  return sql(parts.join(' union all ') + ' order by 1')
}

// ─── Pessoas de teste ───────────────────────────────────────────────────────────────────────────
const H = () => ({ apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' })

/** Cria uma conta local (Auth) e devolve o id. */
export async function createUser(email, name) {
  const r = await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: H(), body: JSON.stringify({ email, password: SENHA, email_confirm: true, user_metadata: { full_name: name } }) })
  const j = await r.json()
  if (!j.id) throw new Error(`Falha ao criar ${email}: ${JSON.stringify(j)}`)
  return j.id
}

/**
 * Pessoas padrão de uma suíte (domínio próprio, apagadas antes): aluno, colega, coordenação e admin da Turma 2027,
 * todos com o termo aceito. Extras: { nome: { role, cohort, cohortRole, status } }.
 */
export async function people(domain, extra = {}) {
  sql(`delete from auth.users where email like '%@${domain}'`)
  const T = cohortId()
  const spec = {
    aluno: { role: 'aluno', cohort: T, cohortRole: 'aluno' },
    colega: { role: 'aluno', cohort: T, cohortRole: 'aluno' },
    coord: { role: 'coordenacao', cohort: T, cohortRole: 'coordenacao' },
    admin: { role: 'admin' },
    ...extra,
  }
  const u = {}
  for (const [k, v] of Object.entries(spec)) {
    u[k] = await createUser(`${k}@${domain}`, `${k[0].toUpperCase()}${k.slice(1)} Teste`)
    if (v.role !== 'aluno') sql(`alter table profiles disable trigger profiles_guard; update profiles set role='${v.role}' where id='${u[k]}'; alter table profiles enable trigger profiles_guard;`)
    if (v.cohort) sql(`insert into enrollments (user_id, cohort_id, role_in_cohort, status) values ('${u[k]}','${v.cohort}','${v.cohortRole}','${v.status ?? 'ativa'}')`)
  }
  sql(`insert into terms_acceptances (user_id, terms_version_id) select id, current_terms_version_id() from profiles where id in (${Object.values(u).map((x) => `'${x}'`).join(',')})`)
  return u
}

/** Token de sessão de uma conta de teste (para conferir a RLS pela API, como o navegador faria). */
export async function token(email) {
  const r = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: SENHA }) })
  return (await r.json()).access_token
}
export const rest = (tk, method, path, body) =>
  fetch(`${API}/rest/v1/${path}`, {
    method,
    headers: { apikey: SECRET, Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })

// ─── Dados clínicos de teste (sempre fictícios) ─────────────────────────────────────────────────
export const newCase = (owner, label, cohort = cohortId()) =>
  one(`insert into clinical_cases (owner_id, cohort_id, patient_label) values ('${owner}','${cohort}','${label}') returning id`)
export const newRecord = (caseId, step, on, teeth = [], quantity) =>
  one(`insert into performed_procedures (case_id, step_id, performed_on, quantity, teeth) values ('${caseId}','${step}','${on}',${quantity ?? (teeth.length || 1)},'{${teeth.join(',')}}') returning id`)

// ─── Navegador ──────────────────────────────────────────────────────────────────────────────────
/** Chromium do ambiente (E2E_CHROMIUM, ou o instalado em PLAYWRIGHT_BROWSERS_PATH / /opt/pw-browsers). */
function chromiumPath() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  if (!existsSync(base)) return undefined
  for (const dir of readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse())
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) if (existsSync(`${base}/${dir}/${sub}`)) return `${base}/${dir}/${sub}`
  return undefined
}

export async function launch() {
  return chromium.launch({ executablePath: chromiumPath() })
}

/** Entra com uma conta de teste. phone=true → iPhone 13 (390 px). */
export async function login(browser, email, { phone = true } = {}) {
  const p = await (await browser.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1360, height: 900 } })).newPage()
  p.on('dialog', (d) => d.accept())
  await p.goto(`${APP}/entrar`)
  await p.fill('input[name=email]', email)
  await p.fill('input[name=senha]', SENHA)
  await p.click('button[type=submit]')
  await p.waitForURL((x) => !x.href.includes('/entrar'), { timeout: 20000 }).catch(() => {})
  await p.waitForLoadState('networkidle')
  return p
}

/** Abre uma página e devolve o status HTTP. */
export async function go(page, path) {
  const r = await page.goto(`${APP}${path}`)
  await page.waitForLoadState('networkidle')
  return r?.status()
}
export const settle = async (page) => {
  await page.waitForTimeout(700)
  await page.waitForLoadState('networkidle')
}
export const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
export const text = (page, sel = 'main') => page.locator(sel).first().innerText()

/** Escolhe uma etapa no seletor procedimento → etapa (registro rápido, editores). */
export async function pickStep(scope, search, label) {
  await scope.locator('input[aria-label="Buscar procedimento"]').fill(search)
  await scope.locator(`ul[aria-label="Resultados"] [data-etapa^="${label}"]`).first().click()
}

// ─── Resultado da suíte ─────────────────────────────────────────────────────────────────────────
/** Coleta as verificações; `finish` imprime "N/M passaram" (o runner lê essa linha) e define o código de saída. */
export function suite(name) {
  const results = []
  console.log(`# ${name}`)
  return {
    check(label, ok, detail = '') {
      results.push(!!ok)
      console.log(`${ok ? '✓' : '✗'} ${label}${!ok && detail ? ` — ${String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600)}` : ''}`)
    },
    fail(e) {
      results.push(false)
      console.log(`✗ Execução sem erro — ${String(e?.stack ?? e).slice(0, 1500)}`)
    },
    finish() {
      const ok = results.filter(Boolean).length
      console.log(`\n${ok}/${results.length} passaram`)
      process.exitCode = ok === results.length && results.length > 0 ? 0 : 1
    },
  }
}
