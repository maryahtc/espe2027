import { Button, ButtonLink } from '@portal/ui/button'
import { IconArrowRight, IconBranch, IconDoc } from '@portal/ui/icons'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import { Poster } from '@/components/library/Poster'
import { modules } from '@/demo/data'
import { type LibraryItem, related } from '@/demo/library'

export function LessonView({ item }: { item: LibraryItem }) {
  const rel = related(item)
  const mods = modules.filter((m) => item.modules.includes(m.number))
  const video = item.kind === 'Videoaula'

  return (
    <article>
      <Link href="/biblioteca" className="text-sm text-muted hover:text-ink">
        ← Biblioteca
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Poster item={item} size="lg" />
          <p className="eyebrow mt-6">
            {item.kind} · {item.category}
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-light tracking-tight text-balance sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {item.teacher} · <span className="num">{item.minutes} min</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {video ? (
              <Button type="button">{item.progress && item.progress < 100 ? `Continuar de onde parei · ${item.progress}%` : 'Assistir'}</Button>
            ) : (
              <Button type="button">
                <IconDoc size={18} /> Abrir {item.kind === 'PDF' ? 'PDF' : 'leitura'}
              </Button>
            )}
            <Button type="button" variant="secondary">
              {item.progress === 100 ? '✓ Concluído' : 'Marcar como concluído'}
            </Button>
          </div>
          <p className="mt-8 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{item.description}</p>
          <p className="mt-5 flex flex-wrap gap-2">
            {item.topics.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </p>

          {item.attachments?.length ? (
            <div className="mt-10">
              <p className="eyebrow">Materiais complementares</p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {item.attachments.map((a) => (
                  <li key={a} className="flex items-center gap-3 py-3 text-sm">
                    <IconDoc size={18} className="text-muted" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-10 lg:col-span-4">
          {item.workflow ? (
            <Link
              href={`/workflows/${item.workflow.slug}${item.workflow.path ? `/${item.workflow.path}` : ''}`}
              className="group block glass rounded-2xl p-5 hover:border-rule-strong"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-sunken">
                <IconBranch size={18} />
              </span>
              <span className="eyebrow mt-4 block text-[10px]">Explorar no Workflow clínico</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[15px] font-semibold">
                {item.workflow.label}
                <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : null}

          {mods.length ? (
            <div>
              <p className="eyebrow">Módulos relacionados</p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {mods.map((m) => (
                  <li key={m.number}>
                    <Link href={`/modulos/${m.slug}`} className="flex items-baseline gap-3 py-3 text-sm hover:underline">
                      <span className="num font-semibold text-muted">{m.slug}</span>
                      {m.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {rel.length ? (
            <div>
              <p className="eyebrow">Conteúdos relacionados</p>
              <ul className="mt-3 space-y-4">
                {rel.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/biblioteca/${r.slug}`} className="group grid grid-cols-[7rem_1fr] gap-3">
                      <Poster item={r} />
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug font-semibold group-hover:underline">{r.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {r.teacher} · <span className="num">{r.minutes} min</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ButtonLink href="/biblioteca" variant="quiet">
            Ver toda a biblioteca <IconArrowRight size={15} />
          </ButtonLink>
        </aside>
      </div>
    </article>
  )
}
