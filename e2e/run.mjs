#!/usr/bin/env node
// Runner das regressões E2E do Portal do Aluno — ambiente LOCAL apenas.
//
//   npm run e2e                     # todas as suítes
//   npm run e2e -- casos producao   # só as indicadas
//   npm run e2e -- --no-build       # reaproveita o build existente de apps/aluno
//
// Para cada suíte: banco local recriado (supabase db reset --local + seed da Turma 2027), suíte executada contra o
// portal em http://localhost:3001 (next start). As chaves vêm do `supabase status` local e nunca são versionadas.
// Pré-requisitos: Docker + Supabase local iniciado (`supabase start` em packages/db), Chromium (E2E_CHROMIUM ou
// /opt/pw-browsers) e `psql` no PATH. Ver e2e/README.md.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DBDIR = path.join(ROOT, 'packages/db')
const APPDIR = path.join(ROOT, 'apps/aluno')
const SUITES = path.join(ROOT, 'e2e/suites')
const PORT = 3001
const ORDER = ['home', 'registro', 'casos', 'odontograma', 'planejamento', 'producao', 'permissoes', 'simulacao', 'workflows-editor', 'workflows-aluno', 'visao-turma', 'painel-admin', 'pendencias']

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const wanted = args.filter((a) => !a.startsWith('--'))
const available = readdirSync(SUITES).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''))
const suites = (wanted.length ? wanted : [...ORDER, ...available.filter((s) => !ORDER.includes(s)).sort()]).filter((s) => {
  if (!available.includes(s)) throw new Error(`Suíte inexistente: ${s} (disponíveis: ${available.join(', ')})`)
  return true
})

// Supabase CLI: SUPABASE_CLI (caminho do binário) ou npx com versão fixa (baixa sob demanda, fora do lockfile).
const cli = process.env.SUPABASE_CLI ? [process.env.SUPABASE_CLI] : ['npx', '--yes', 'supabase@3.1.0']
const cliEnv = { ...process.env, SUPABASE_INTERNAL_IMAGE_REGISTRY: process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY ?? 'docker.io' }
const supabase = (...a) => execFileSync(cli[0], [...cli.slice(1), ...a], { cwd: DBDIR, env: cliEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let status
try {
  status = Object.fromEntries(
    supabase('status', '-o', 'env')
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  )
} catch {
  console.error('Supabase local não está rodando. Inicie com: (cd packages/db && supabase start). Ver e2e/README.md.')
  process.exit(2)
}
const env = { E2E_APP: `http://localhost:${PORT}`, E2E_DB: status.DB_URL, E2E_API: status.API_URL, E2E_SECRET: status.SECRET_KEY || status.SERVICE_ROLE_KEY }
for (const [k, v] of Object.entries(env)) if (!v) throw new Error(`supabase status sem ${k}`)
const isLocal = (u) => {
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(u).hostname)
  } catch {
    return false
  }
}
for (const k of ['E2E_DB', 'E2E_API']) if (!isLocal(env[k])) throw new Error(`${k} não é local — abortado.`)

// .env.local do app (não versionado): aponta para o Supabase LOCAL. Nunca sobrescreve um que aponte para outro lugar.
const envFile = path.join(APPDIR, '.env.local')
const wantedEnv = `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY || status.ANON_KEY}\nSUPABASE_SECRET_KEY=${env.E2E_SECRET}\n`
if (existsSync(envFile)) {
  const cur = readFileSync(envFile, 'utf8')
  const url = cur.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1] ?? ''
  if (!isLocal(url)) {
    console.error('apps/aluno/.env.local aponta para um Supabase que não é local. Abortado (o E2E nunca usa outro banco).')
    process.exit(2)
  }
  if (cur !== wantedEnv) writeFileSync(envFile, wantedEnv)
} else writeFileSync(envFile, wantedEnv)

if (!flags.has('--no-build') || !existsSync(path.join(APPDIR, '.next/BUILD_ID'))) {
  console.log('▸ build do portal (apps/aluno)…')
  execFileSync('npm', ['run', 'build', '-w', '@portal/aluno'], { cwd: ROOT, stdio: 'inherit' })
}

function resetDb() {
  supabase('db', 'reset', '--local')
  execFileSync('psql', [env.E2E_DB, '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', path.join(DBDIR, 'seeds/turma-2027.sql')], { stdio: ['ignore', 'ignore', 'pipe'] })
}

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${env.E2E_APP}/entrar`)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('O portal não respondeu em http://localhost:3001')
}

function freePort() {
  try {
    execFileSync('fuser', ['-k', `${PORT}/tcp`], { stdio: 'ignore' })
  } catch {}
}

freePort()
const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { cwd: APPDIR, stdio: 'ignore', detached: true })
const results = []
let exit = 0
try {
  await waitServer()
  for (const s of suites) {
    process.stdout.write(`▸ ${s}: preparando banco local… `)
    resetDb()
    const t0 = Date.now()
    let out = ''
    let code = 0
    try {
      out = execFileSync('node', [path.join(SUITES, `${s}.mjs`)], { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    } catch (e) {
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`
      code = e.status ?? 1
    }
    const m = out.match(/(\d+)\/(\d+) passaram/)
    const passed = m ? Number(m[1]) : 0
    const total = m ? Number(m[2]) : 0
    const ok = code === 0 && m && passed === total
    if (!ok) exit = 1
    results.push({ s, passed, total, ok, secs: Math.round((Date.now() - t0) / 1000) })
    console.log(`${ok ? 'OK' : 'FALHOU'} ${passed}/${total} (${Math.round((Date.now() - t0) / 1000)}s)`)
    if (!ok || flags.has('--verbose'))
      console.log(
        out
          .split('\n')
          .filter((l) => flags.has('--verbose') || l.startsWith('✗'))
          .map((l) => `    ${l}`)
          .join('\n'),
      )
  }
} finally {
  try {
    process.kill(-server.pid)
  } catch {}
  freePort()
}

console.log('\nResumo')
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.s.padEnd(18)} ${r.passed}/${r.total}`)
const p = results.reduce((n, r) => n + r.passed, 0)
const t = results.reduce((n, r) => n + r.total, 0)
console.log(`  ${exit ? '✗' : '✓'} TOTAL              ${p}/${t}`)
process.exit(exit)
