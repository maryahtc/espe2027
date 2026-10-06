import { IconSearch } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Poster } from '@/components/library/Poster'
import { categories, library } from '@/demo/library'

export const metadata: Metadata = { title: 'Biblioteca' }

const FILTERS = ['Todos', ...categories]
const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Filtro por categoria sem JavaScript: rádio + :has(). A busca usa um script mínimo (abaixo).
const filterCss = categories
  .map((c) => `[data-lib]:has(#cat-${slugify(c)}:checked) [data-cat]:not([data-cat="${slugify(c)}"]){display:none}`)
  .join('\n')

const searchScript = `
(function(){var i=document.getElementById('busca');if(!i)return;var items=document.querySelectorAll('[data-text]');var empty=document.getElementById('sem-resultado');
function n(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()}
i.addEventListener('input',function(){var q=n(i.value.trim());var shown=0;items.forEach(function(el){var ok=!q||q.split(/\\s+/).every(function(t){return el.getAttribute('data-text').indexOf(t)>=0});el.hidden=!ok;if(ok)shown++});if(empty)empty.hidden=shown>0;});})();`

export default function LibraryPage() {
  const continuing = library.filter((l) => l.progress && l.progress < 100)
  return (
    <div data-lib>
      <style>{filterCss}</style>
      <PageTitle eyebrow="Aprender" title="Biblioteca" lead="Aulas gravadas, artigos e materiais da especialização." />

      <div className="relative">
        <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <label htmlFor="busca" className="sr-only">
          Buscar por aula, professor ou tema
        </label>
        <input
          id="busca"
          type="search"
          placeholder="Buscar por aula, professor ou tema…"
          className="block min-h-12 w-full rounded-md border border-rule-strong bg-surface pr-4 pl-11 text-base placeholder:text-faint focus:border-ink focus:outline-none"
        />
      </div>

      <fieldset className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <legend className="sr-only">Categoria</legend>
        <div className="flex gap-2 whitespace-nowrap">
          {FILTERS.map((f, i) => {
            const id = i === 0 ? 'cat-todos' : `cat-${slugify(f)}`
            return (
              <span key={f}>
                <input type="radio" name="categoria" id={id} defaultChecked={i === 0} className="peer sr-only" />
                <label
                  htmlFor={id}
                  className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-rule-strong px-3.5 text-sm text-ink-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
                >
                  {f}
                </label>
              </span>
            )
          })}
        </div>
      </fieldset>

      {continuing.length ? (
        <section aria-labelledby="continuar" className="mt-10">
          <h2 id="continuar" className="eyebrow">
            Continuar assistindo
          </h2>
          {continuing.map((l) => (
            <Link
              key={l.slug}
              href={`/biblioteca/${l.slug}`}
              className="group mt-3 grid gap-5 rounded-lg border border-rule bg-surface p-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-center sm:p-5"
            >
              <Poster item={l} />
              <span className="min-w-0">
                <span className="eyebrow block text-[10px]">{l.category}</span>
                <span className="mt-1 block text-xl leading-tight font-light tracking-tight group-hover:underline">{l.title}</span>
                <span className="mt-1 block text-sm text-muted">{l.teacher}</span>
                <span className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="h-[3px] w-32 bg-rule">
                    <span className="block h-full bg-ink" style={{ width: `${l.progress}%` }} />
                  </span>
                  <span className="num">{l.progress}% · faltam {Math.round((l.minutes * (100 - (l.progress ?? 0))) / 100)} min</span>
                </span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="todos" className="mt-12">
        <h2 id="todos" className="eyebrow">
          Todos os conteúdos
        </h2>
        <ul className="mt-3 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {library.map((l) => (
            <li
              key={l.slug}
              data-cat={slugify(l.category)}
              data-text={slugify([l.title, l.teacher, l.category, ...l.topics].join(' '))}
            >
              <Link href={`/biblioteca/${l.slug}`} className="group block">
                <Poster item={l} />
                <span className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                  <span className="font-semibold tracking-wide text-ink-2 uppercase">{l.kind}</span>
                  <span>·</span>
                  <span>{l.category}</span>
                </span>
                <span className="mt-1 block text-[15px] leading-snug font-semibold group-hover:underline">{l.title}</span>
                <span className="mt-0.5 block text-sm text-muted">
                  {l.teacher} · <span className="num">{l.minutes} min</span>
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {l.topics.map((t) => (
                    <span key={t} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-2">
                      {t}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p id="sem-resultado" hidden className="py-10 text-center text-sm text-muted">
          Nenhum conteúdo encontrado. Tente outro termo ou limpe a busca.
        </p>
      </section>
      <script data-preview-keep dangerouslySetInnerHTML={{ __html: searchScript }} />
    </div>
  )
}
