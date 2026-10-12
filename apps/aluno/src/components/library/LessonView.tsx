import { buttonClasses, ButtonLink } from '@portal/ui/button'
import { IconArrowRight, IconDoc, IconExternal } from '@portal/ui/icons'
import { RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import { moduleLabel } from '@/lib/academic/model'
import { type AttachmentVM, type ContentVM, facultyNames, KIND_LABEL, minutes, PHASE_LABEL } from '@/lib/library/model'
import { posterOf, releaseLabel } from './ContentCard'
import { Poster } from './Poster'
import { ProgressButton } from './ProgressButton'

/**
 * Página de um conteúdo da biblioteca. `preview` = pré-visualização do painel (sem gravar progresso).
 * Vídeo: o player protegido entra na Parte 2 (Bunny); até lá a capa indica "vídeo em preparação".
 */
export function LessonView({
  item,
  attachments,
  related,
  preview = false,
  backHref = '/biblioteca',
}: {
  item: ContentVM
  attachments: AttachmentVM[]
  related: ContentVM[]
  preview?: boolean
  backHref?: string
}) {
  const mins = minutes(item.durationSeconds)
  const release = releaseLabel(item)
  const done = item.progress?.status === 'concluido'
  const file = (extra = '') => `/biblioteca/arquivo/${item.id}${extra}`

  return (
    <article>
      <Link href={backHref} className="text-sm text-muted hover:text-ink">
        ← {preview ? 'Voltar ao conteúdo' : 'Biblioteca'}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Poster item={posterOf(item)} size="lg" />
          <p className="eyebrow mt-6">
            {KIND_LABEL[item.kind]} · {item.category}
            {release ? <span className="text-signal"> · {release}</span> : null}
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-light tracking-tight text-balance sm:text-4xl">{item.title}</h1>
          {item.faculty.length || mins ? (
            <p className="mt-2 text-sm text-muted">
              {facultyNames(item.faculty)}
              {item.faculty.length && mins ? ' · ' : ''}
              {mins ? <span className="num">{mins} min</span> : null}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-start gap-3">
            {item.kind === 'video' && !item.videoId ? (
              <p className="glass rounded-full px-4 py-2.5 text-sm text-muted">O vídeo desta aula entra em breve.</p>
            ) : null}
            {item.filePath ? (
              <>
                <a href={file()} target="_blank" rel="noopener" className={buttonClasses('primary')}>
                  <IconDoc size={18} /> Abrir {item.kind === 'slides' ? 'slides' : 'PDF'}
                </a>
                <a href={file('?baixar=1')} className={buttonClasses('secondary')}>
                  Baixar
                </a>
              </>
            ) : null}
            {item.url ? (
              <a href={`/biblioteca/abrir/${item.id}`} target="_blank" rel="noopener" className={buttonClasses(item.filePath ? 'secondary' : 'primary')}>
                <IconExternal size={16} /> Abrir link
              </a>
            ) : null}
            {preview ? null : <ProgressButton contentId={item.id} done={done} />}
          </div>

          {item.description ? <p className="mt-8 max-w-[65ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{item.description}</p> : null}

          {item.topics.length ? (
            <p className="mt-5 flex flex-wrap gap-2">
              {item.topics.map((t) => (
                <Link
                  key={t.id}
                  href={`/biblioteca/temas/${t.slug}`}
                  className="inline-flex items-center rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink"
                >
                  {t.name}
                </Link>
              ))}
            </p>
          ) : null}

          {item.citation ? (
            <div className="mt-8">
              <p className="eyebrow">Referência</p>
              <p className="mt-2 max-w-[70ch] text-sm leading-relaxed whitespace-pre-line text-ink-2">{item.citation}</p>
            </div>
          ) : null}

          {attachments.length ? (
            <div className="mt-10">
              <p className="eyebrow">Materiais complementares</p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {attachments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      {a.url ? <IconExternal size={16} className="text-muted" /> : <IconDoc size={18} className="text-muted" />}
                      {a.title}
                    </span>
                    {a.url ? (
                      <a href={`/biblioteca/abrir/${item.id}?anexo=${a.id}`} target="_blank" rel="noopener" className="font-semibold hover:underline">
                        Abrir link
                      </a>
                    ) : (
                      <span className="flex gap-4">
                        <a href={file(`?anexo=${a.id}`)} target="_blank" rel="noopener" className="font-semibold hover:underline">
                          Abrir
                        </a>
                        <a href={file(`?anexo=${a.id}&baixar=1`)} className="text-muted hover:text-ink hover:underline">
                          Baixar
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="space-y-10 lg:col-span-4">
          {item.modules.length ? (
            <div>
              <p className="eyebrow">Módulos relacionados</p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {item.modules.map((m) => (
                  <li key={m.moduleId}>
                    <Link href={`/modulos/${m.moduleId}`} className="block py-3 text-sm hover:underline">
                      <span className="flex items-baseline gap-3">
                        <span className="num font-semibold text-muted">{moduleLabel(m.number)}</span>
                        {m.theme || m.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-3 pl-9 text-xs text-muted">
                        {PHASE_LABEL[m.phase]} <RequirementTag level={m.requirement} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {related.length ? (
            <div>
              <p className="eyebrow">Conteúdos relacionados</p>
              <ul className="mt-3 space-y-4">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/biblioteca/${r.slug}`} className="group grid grid-cols-[7rem_1fr] gap-3">
                      <Poster item={posterOf(r)} />
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug font-semibold group-hover:underline">{r.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {KIND_LABEL[r.kind]}
                          {r.faculty.length ? ` · ${facultyNames(r.faculty)}` : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview ? null : (
            <ButtonLink href="/biblioteca" variant="quiet">
              Ver toda a biblioteca <IconArrowRight size={15} />
            </ButtonLink>
          )}
        </aside>
      </div>
    </article>
  )
}
