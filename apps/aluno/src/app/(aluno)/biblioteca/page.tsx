import { IconSearch } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { RequirementTag } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentGrid, posterOf } from '@/components/library/ContentCard'
import { Poster } from '@/components/library/Poster'
import { cohortModules, currentCohort, today } from '@/lib/academic/load'
import { focusModule, moduleLabel } from '@/lib/academic/model'
import { requireUser } from '@/lib/auth/session'
import { loadLibrary, loadTaxonomy, searchLibrary } from '@/lib/library/load'
import {
  applyFilters,
  type ContentVM,
  facultyNames,
  filtersHref,
  hasFilters,
  KIND_LABEL,
  KINDS,
  minutes,
  parseFilters,
  progressState,
} from '@/lib/library/model'
import { guardStudentPage } from '@/lib/simulation/guard'

export const metadata: Metadata = { title: 'Biblioteca' }

const REQ_ORDER = { obrigatorio: 0, recomendado: 1, complementar: 2 } as const
const select = 'field mt-1.5 block min-h-11 w-full px-3 text-sm'

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await guardStudentPage()
  const auth = await requireUser()
  const f = parseFilters(await searchParams)
  const cohort = await currentCohort()
  const [all, { categories, topics }, modules] = await Promise.all([
    loadLibrary(auth?.userId ?? null, cohort?.id ?? null),
    loadTaxonomy(),
    cohort ? cohortModules(cohort.id) : Promise.resolve([]),
  ])
  const ranked = f.q ? await searchLibrary(f.q) : null
  const results = applyFilters(all, f, ranked, categories, topics)
  const filtered = hasFilters(f)

  // Opções só do que existe na biblioteca (nada de filtro que leva a lista vazia).
  const usedTopics = new Set(all.flatMap((c) => c.topics.map((t) => t.id)))
  const usedAreas = new Set(all.map((c) => c.categoryId))
  const usedKinds = KINDS.filter((k) => all.some((c) => c.kind === k))
  const faculty = [...new Map(all.flatMap((c) => c.faculty).map((p) => [p.id, p])).values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const linkedModules = modules.filter((m) => all.some((c) => c.modules.some((l) => l.moduleId === m.id)))

  // Faixas (só sem filtros)
  const continuing = all
    .filter((c) => progressState(c) === 'em-andamento')
    .sort((a, b) => (b.progress?.updatedAt ?? '').localeCompare(a.progress?.updatedAt ?? ''))
    .slice(0, 3)
  const focus = focusModule(modules)
  const forNext = focus
    ? all
        .filter((c) => c.modules.some((m) => m.moduleId === focus.id))
        .map((c) => ({ c, link: c.modules.find((m) => m.moduleId === focus.id)! }))
        .sort((a, b) => REQ_ORDER[a.link.requirement] - REQ_ORDER[b.link.requirement] || a.link.position - b.link.position)
    : []
  const monthAgo = new Date(Date.parse(`${today()}T00:00:00-03:00`) - 30 * 86_400_000).toISOString()
  const recent = all.filter((c) => (c.publishedAt ?? '') >= monthAgo).slice(0, 3)

  return (
    <div>
      <PageTitle eyebrow="Aprender" title="Biblioteca" lead="Aulas gravadas, artigos e materiais da especialização." />

      <form action="/biblioteca" method="get" role="search">
        <div className="relative">
          <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-muted" />
          <label htmlFor="busca" className="sr-only">
            Buscar por aula, professor ou tema
          </label>
          <input
            id="busca"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Buscar por aula, professor ou tema…"
            className="glass block min-h-13 w-full rounded-full pr-28 pl-12 text-base text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />
          <button type="submit" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-on-ink">
            Buscar
          </button>
        </div>
        {f.area ? <input type="hidden" name="area" value={f.area} /> : null}

        <details className="mt-4" open={Boolean(f.tema || f.tipo || f.prof || f.modulo || f.situacao)}>
          <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">Mais filtros</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-sm font-semibold">
              Tema
              <select name="tema" defaultValue={f.tema ?? ''} className={select}>
                <option value="">Todos</option>
                {categories
                  .filter((c) => topics.some((t) => t.categoryId === c.id && usedTopics.has(t.id)))
                  .map((c) => (
                    <optgroup key={c.id} label={c.name}>
                      {topics
                        .filter((t) => t.categoryId === c.id && usedTopics.has(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.slug}>
                            {t.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Tipo
              <select name="tipo" defaultValue={f.tipo ?? ''} className={select}>
                <option value="">Todos</option>
                {usedKinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Professor
              <select name="prof" defaultValue={f.prof ?? ''} className={select}>
                <option value="">Todos</option>
                {faculty.map((p) => (
                  <option key={p.id} value={p.id}>
                    {facultyNames([p])}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Módulo
              <select name="modulo" defaultValue={f.modulo ?? ''} className={select}>
                <option value="">Todos</option>
                {linkedModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`Módulo ${moduleLabel(m.number)}${m.theme ? ` · ${m.theme}` : ''}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Situação
              <select name="situacao" defaultValue={f.situacao ?? ''} className={select}>
                <option value="">Todas</option>
                <option value="nao-iniciado">Não iniciado</option>
                <option value="em-andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button type="submit" className="rounded-full border border-rule-strong px-4 py-2 text-sm font-semibold hover:border-ink">
              Aplicar filtros
            </button>
            {filtered ? (
              <Link href="/biblioteca" className="text-sm text-muted hover:text-ink hover:underline">
                Limpar tudo
              </Link>
            ) : null}
          </div>
        </details>
      </form>

      <nav aria-label="Área" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 whitespace-nowrap">
          {[{ slug: null, name: 'Todas as áreas' }, ...categories.filter((c) => usedAreas.has(c.id))].map((c) => {
            const on = (f.area ?? null) === c.slug
            return (
              <Link
                key={c.slug ?? 'todas'}
                href={filtersHref(f, { area: c.slug })}
                aria-current={on ? 'page' : undefined}
                className={
                  on
                    ? 'inline-flex min-h-10 items-center rounded-full border border-ink bg-ink px-4 text-sm text-on-ink'
                    : 'glass inline-flex min-h-10 items-center rounded-full px-4 text-sm text-muted hover:text-ink'
                }
              >
                {c.name}
              </Link>
            )
          })}
          <Link href="/biblioteca/temas" className="inline-flex min-h-10 items-center px-3 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Ver temas
          </Link>
        </div>
      </nav>

      {!all.length ? (
        <p className="mt-12 rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-center text-sm text-muted">
          A biblioteca ainda não tem conteúdos publicados.
        </p>
      ) : null}

      {!filtered && continuing.length ? (
        <section aria-labelledby="continuar" className="mt-10">
          <h2 id="continuar" className="eyebrow">
            Continuar
          </h2>
          {continuing.map((c) => (
            <ContinueRow key={c.id} c={c} />
          ))}
        </section>
      ) : null}

      {!filtered && focus && forNext.length ? (
        <section aria-labelledby="proximo" className="mt-12">
          <h2 id="proximo" className="eyebrow">
            Para o {focus.state === 'ongoing' ? 'módulo em andamento' : 'próximo módulo'} · Módulo {moduleLabel(focus.number)}
            {focus.theme ? ` · ${focus.theme}` : ''}
          </h2>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {forNext.map(({ c, link }) => (
              <li key={c.id}>
                <Link href={`/biblioteca/${c.slug}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:bg-white/[0.03]">
                  <span className="min-w-0 flex-1 font-semibold">{c.title}</span>
                  <span className="text-xs text-muted">{KIND_LABEL[c.kind]}</span>
                  <RequirementTag level={link.requirement} />
                  <span className="w-28 text-right text-xs text-muted">
                    {progressState(c) === 'concluido' ? '✓ Concluído' : progressState(c) === 'em-andamento' ? 'Em andamento' : 'Não iniciado'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!filtered && recent.length ? (
        <section aria-labelledby="novidades" className="mt-12">
          <h2 id="novidades" className="eyebrow">
            Novidades
          </h2>
          <ContentGrid items={recent} />
        </section>
      ) : null}

      {all.length ? (
        <section aria-labelledby="todos" className="mt-12">
          <h2 id="todos" className="eyebrow">
            {filtered ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}${f.q ? ` para “${f.q}”` : ''}` : 'Todos os conteúdos'}
          </h2>
          {results.length ? (
            <ContentGrid items={results} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              Nenhum conteúdo encontrado. Tente outro termo ou{' '}
              <Link href="/biblioteca" className="underline">
                limpe os filtros
              </Link>
              .
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}

function ContinueRow({ c }: { c: ContentVM }) {
  const mins = minutes(c.durationSeconds)
  return (
    <Link
      href={`/biblioteca/${c.slug}`}
      className="glass glass-interactive group mt-3 grid gap-6 rounded-[22px] p-4 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-center sm:p-5"
    >
      <Poster item={posterOf(c)} />
      <span className="min-w-0">
        <span className="eyebrow block text-[10px]">{c.category}</span>
        <span className="mt-1 block text-xl leading-tight font-light tracking-tight group-hover:underline">{c.title}</span>
        <span className="mt-1 block text-sm text-muted">
          {facultyNames(c.faculty)}
          {mins ? <span className="num">{c.faculty.length ? ' · ' : ''}{mins} min</span> : null}
        </span>
        <span className="mt-4 block text-xs text-muted">Em andamento · {KIND_LABEL[c.kind]}</span>
      </span>
    </Link>
  )
}
