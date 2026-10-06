import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Activate } from '@/components/Enhancer'
import { DataList } from '@/components/data/DataList'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/PageHeader'
import { ArrowLeft, ArrowRight } from '@/components/ui/icons'
import { ModuleNotices } from '@/features/modules/ModuleRow'
import { ScheduleDay } from '@/features/modules/Schedule'
import { equipmentColumns, materialColumns } from '@/features/inventory/columns'
import { ProfessorCard } from '@/features/professors/ProfessorCard'
import {
  getModule,
  getModuleClasses,
  getModuleNeighbors,
  getModuleProfessors,
  groupClassesByDay,
  moduleHref,
  moduleLabel,
  moduleWhen,
  professorIndex,
} from '@/lib/domain/selectors'
import { getDataset } from '@/server/data/repository'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const ds = await getDataset()
  return ds.modules.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mod = getModule(await getDataset(), (await params).slug)
  return { title: mod ? `${moduleLabel(mod)} · ${mod.title ?? 'tema a confirmar'}` : 'Módulo não encontrado' }
}

const CONTENT_KIND_LABEL = {
  artigo: 'Artigo',
  capitulo: 'Capítulo',
  livro: 'Livro',
  video: 'Vídeo',
  'aula-gravada': 'Aula gravada',
  pdf: 'PDF',
  link: 'Link',
} as const

export default async function ModulePage({ params }: Props) {
  const { slug } = await params
  const ds = await getDataset()
  const mod = getModule(ds, slug)
  if (!mod) notFound()
  if (slug !== mod.slug) permanentRedirect(moduleHref(mod))

  const classes = getModuleClasses(ds, mod.slug)
  const days = groupClassesByDay(classes)
  const team = getModuleProfessors(ds, mod.slug)
  const materials = ds.materials.filter((m) => m.moduleNumber === mod.number)
  const equipment = ds.equipment.filter((e) => e.moduleNumbers.includes(mod.number))
  const content = ds.content.filter((c) => c.moduleNumber === mod.number)
  const { previous, next } = getModuleNeighbors(ds, mod.slug)
  const professors = professorIndex(ds)

  const sections = [
    { id: 'programacao', label: 'Programação' },
    { id: 'professores', label: 'Professores' },
    { id: 'materiais', label: 'Materiais' },
    { id: 'equipamentos', label: 'Equipamentos' },
    { id: 'conteudo', label: 'Conteúdo' },
  ]

  return (
    <article data-highlight-root="">
      <div className="pt-6">
        <Link href="/cronograma" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft width={15} height={15} /> Cronograma
        </Link>
      </div>

      <header className="animate-rise pt-2 pb-8 md:pt-6 md:pb-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="label !text-ink">{moduleLabel(mod)}</p>
          <ModuleNotices module={mod} />
        </div>
        <p className="data mt-3 text-xl font-medium tracking-wide uppercase md:text-2xl">{moduleWhen(mod)}</p>
        <h1 className="mt-2 font-display text-[2.75rem] leading-[1.02] text-balance md:text-7xl">
          {mod.title ?? <span className="text-muted">Tema a confirmar</span>}
        </h1>
        {mod.description ? <p className="mt-4 max-w-2xl text-[15px] text-muted md:text-base">{mod.description}</p> : null}
        {team.length ? (
          <p className="mt-5 text-[15px] text-ink-2">
            {team.map(({ professor }, i) => (
              <span key={professor.slug}>
                {i > 0 ? <span className="text-faint"> · </span> : null}
                <Link href={`/professores/${professor.slug}`} className="link-underline">
                  {professor.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      <nav aria-label="Seções do módulo" className="-mx-4 mb-10 overflow-x-auto border-y border-rule px-4 md:mx-0 md:px-0">
        <ul className="flex gap-6 whitespace-nowrap">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="flex min-h-11 items-center text-sm text-muted hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mb-14 scroll-mt-20" aria-label="Programação">
        <SectionHeader id="programacao" title="Programação" />
        {days.length ? (
          days.map((group) => <ScheduleDay key={group.key} group={group} professors={professors} />)
        ) : (
          <EmptyState title="Programação ainda não publicada.">As aulas deste módulo aparecerão aqui.</EmptyState>
        )}
      </section>

      <section className="mb-14 scroll-mt-20" aria-label="Professores do módulo">
        <SectionHeader id="professores" title="Professores do módulo" count={team.length} />
        {team.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map(({ professor, classes: own }) => (
              <ProfessorCard key={professor.slug} professor={professor} classes={own} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Professores a confirmar." />
        )}
      </section>

      <section className="mb-14 scroll-mt-20" aria-label="Materiais">
        <SectionHeader id="materiais" title="Materiais" count={materials.length} />
        {materials.length ? (
          <DataList rows={materials} columns={materialColumns({ withModule: false })} rowKey={(m) => m.id} caption={`Materiais do ${moduleLabel(mod)}`} />
        ) : (
          <EmptyState title="Nenhum material cadastrado para este módulo." />
        )}
      </section>

      <section className="mb-14 scroll-mt-20" aria-label="Equipamentos">
        <SectionHeader id="equipamentos" title="Equipamentos" count={equipment.length} />
        {equipment.length ? (
          <DataList rows={equipment} columns={equipmentColumns({ withModule: false })} rowKey={(e) => e.id} caption={`Equipamentos do ${moduleLabel(mod)}`} />
        ) : (
          <EmptyState title="Nenhum equipamento cadastrado para este módulo." />
        )}
      </section>

      <section className="mb-14 scroll-mt-20" aria-label="Conteúdo relacionado">
        <SectionHeader id="conteudo" title="Conteúdo relacionado" count={content.length || undefined} />
        {content.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {content.map((item) => (
              <li key={item.id} className="flex items-baseline gap-3 py-3">
                <span className="label w-24 shrink-0">{CONTENT_KIND_LABEL[item.kind]}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {item.title}
                </a>
                {item.author ? <span className="text-sm text-muted">{item.author}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum conteúdo publicado ainda.">
            Artigos, capítulos, vídeos e materiais de apoio deste módulo aparecerão aqui.
          </EmptyState>
        )}
      </section>

      <nav aria-label="Outros módulos" className="grid grid-cols-2 gap-3 border-t border-ink pt-5">
        {previous ? (
          <Link href={moduleHref(previous)} className="group flex flex-col gap-1 rounded-md py-2">
            <span className="label inline-flex items-center gap-1">
              <ArrowLeft width={13} height={13} /> {moduleLabel(previous)}
            </span>
            <span className="font-display text-lg leading-tight group-hover:underline">{previous.title ?? 'Tema a confirmar'}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={moduleHref(next)} className="group flex flex-col items-end gap-1 rounded-md py-2 text-right">
            <span className="label inline-flex items-center gap-1">
              {moduleLabel(next)} <ArrowRight width={13} height={13} />
            </span>
            <span className="font-display text-lg leading-tight group-hover:underline">{next.title ?? 'Tema a confirmar'}</span>
          </Link>
        ) : null}
      </nav>
      <Activate />
    </article>
  )
}
