/**
 * Gera uma PRÉVIA NAVEGÁVEL do portal em um único arquivo HTML (sem servidor).
 *
 * Uso:
 *   DATA_SOURCE=preview npm run build && DATA_SOURCE=preview PORT=3100 npm start   (em outro terminal)
 *   node scripts/build-preview.mjs [http://localhost:3100] [saida.html]
 *
 * Percorre todas as páginas, junta o HTML renderizado pelo próprio portal, embute CSS e
 * fontes e usa o MESMO JavaScript de filtros/busca do portal (src/client), com um roteador
 * mínimo por "#". Nenhum dado além do que o portal já publica entra no arquivo.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] ?? 'http://localhost:3100'
const output = process.argv[3] ?? path.join(root, 'preview', 'portal-previa.html')

const START = ['/', '/cronograma', '/professores', '/materiais', '/estoque', '/equipamentos', '/busca']

async function fetchHtml(route) {
  const res = await fetch(base + route)
  if (!res.ok) throw new Error(`${route}: HTTP ${res.status}`)
  return res.text()
}

function between(html, start, end, from = 0) {
  const i = html.indexOf(start, from)
  if (i < 0) return null
  const j = html.indexOf(end, i)
  return { inner: html.slice(i, j + end.length), start: i, end: j + end.length }
}

function stripScripts(html) {
  return html.replace(/<script\b(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g, '')
}

// 1) Percorre o portal
const pages = new Map()
const queue = [...START]
while (queue.length) {
  const route = queue.shift()
  if (pages.has(route)) continue
  const html = await fetchHtml(route)
  pages.set(route, html)
  for (const [, href] of html.matchAll(/href="(\/(?:modulos|professores)\/[^"?#]+)/g)) {
    if (!pages.has(href) && !queue.includes(href)) queue.push(href)
  }
}
console.log(`${pages.size} páginas`)

// 2) Casca (faixa, cabeçalho, rodapé) a partir da Home
const home = pages.get('/')
const bodyStart = home.indexOf('>', home.indexOf('<body')) + 1
const body = home.slice(bodyStart, home.lastIndexOf('</body>'))
const htmlClass = /<html[^>]*class="([^"]*)"/.exec(home)?.[1] ?? ''
const mainOpen = body.indexOf('<main')
const mainClose = body.indexOf('</main>') + '</main>'.length
const before = stripScripts(body.slice(0, mainOpen))
const after = stripScripts(body.slice(mainClose))
const mainTag = /<main[^>]*>/.exec(body.slice(mainOpen))[0]

// 3) Seções: o conteúdo de <main> de cada página
const notFound = await fetch(base + '/rota-inexistente').then((r) => r.text())
pages.set('/404', notFound)
let sections = ''
for (const [route, html] of pages) {
  const main = between(html, '<main', '</main>')
  const inner = main.inner.replace(/^<main[^>]*>/, '').replace(/<\/main>$/, '')
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''
  sections += `<div data-route="${route}" data-route-title="${title}" hidden>${stripScripts(inner)}</div>\n`
}

// 4) CSS com fontes embutidas
let css = ''
for (const [, href] of home.matchAll(/<link rel="stylesheet" href="([^"]+\.css)"/g)) {
  const cssFile = path.join(root, '.next', href.replace(/^\/_next\//, ''))
  let text = readFileSync(cssFile, 'utf8')
  text = text.replace(/url\(([^)]+\.(?:woff2|woff|ttf))\)/g, (_, url) => {
    const file = readFileSync(
      url.startsWith('/_next/') ? path.join(root, '.next', url.replace(/^\/_next\//, '')) : path.resolve(path.dirname(cssFile), url),
    )
    const type = url.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream'
    return `url(data:${type};base64,${file.toString('base64')})`
  })
  css += text
}

// 5) JavaScript: o mesmo de src/client + roteador
const bundle = await build({
  entryPoints: [path.join(root, 'src/client/index.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'Portal',
  minify: true,
  write: false,
  alias: { '@': path.join(root, 'src') },
  target: 'es2019',
})
const js = bundle.outputFiles[0].text + readFileSync(path.join(root, 'scripts/preview-router.js'), 'utf8')

const page = `<title>Portal da Especialização</title>
<style>${css}</style>
<script>document.documentElement.className += ${JSON.stringify(' ' + htmlClass)}</script>
<div class="${htmlClass} min-h-dvh" style="background:var(--paper)">
${before}${mainTag}
${sections}</main>${after}
</div>
<script>${js.replace(/<\/script/g, '<\\/script')}</script>
`
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, page)
console.log(`${output} — ${(Buffer.byteLength(page) / 1024).toFixed(0)} KB`)
