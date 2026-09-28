import Link from 'next/link'
import { ButtonLink } from '@/components/ui/ArrowLink'
import { ModuleNotices } from '@/features/modules/ModuleRow'
import { moduleHref, moduleWhen, professorHref } from '@/lib/domain/selectors'
import type { PublicModule, PublicProfessor } from '@/schemas/public'

export function NextModuleHero({
  module,
  professors,
  current,
}: {
  module: PublicModule
  professors: PublicProfessor[]
  current: boolean
}) {
  return (
    <section aria-labelledby="proximo-modulo" className="animate-rise relative overflow-hidden rounded-xl border border-rule-strong bg-surface">
      <div className="ruler" aria-hidden />
      <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:gap-12 md:p-10">
        <div className="flex items-start justify-between md:block">
          <p className="label" id="proximo-modulo">
            {current ? 'Acontecendo agora' : 'Próximo módulo'}
          </p>
          <p className="font-display text-[5.5rem] leading-[0.8] tracking-tight md:mt-4 md:text-[9rem]" aria-hidden>
            {String(module.number).padStart(2, '0')}
          </p>
        </div>
        <div className="flex flex-col">
          <p className="data text-lg font-medium tracking-wide uppercase md:text-2xl">
            <span className="sr-only">Módulo {module.slug}, </span>
            {moduleWhen(module)}
          </p>
          <div className="mt-2 empty:hidden"><ModuleNotices module={module} /></div>
          <h2 className="mt-3 font-display text-[2.4rem] leading-[1.02] text-balance md:text-6xl">
            {module.title ?? <span className="text-muted">Tema a confirmar</span>}
          </h2>
          {module.description ? <p className="mt-3 max-w-xl text-[15px] text-muted">{module.description}</p> : null}
          {professors.length ? (
            <div className="mt-6 border-t border-rule pt-4">
              <p className="label mb-2">Professores</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {professors.map((p) => (
                  <li key={p.slug}>
                    <Link href={professorHref(p.slug)} className="link-underline text-[15px] text-ink">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-7">
            <ButtonLink href={moduleHref(module)}>Ver módulo</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
