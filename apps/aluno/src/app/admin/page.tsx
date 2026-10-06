import { IconArrowRight, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { NavIcon } from '@/components/shell/NavIcon'
import { adminGroups } from '@/config/nav'
import { adminOverview, attention, shortcuts } from '@/demo/admin'
import { DEMO_TODAY, nextModule } from '@/demo/data'
import { relativeDays } from '@/lib/dates'

export default function AdminHome() {
  return (
    <>
      <PageTitle eyebrow={`Administração · ${adminOverview.cohort}`} title="O que você quer cadastrar?" />

      {/* As seis ações principais: o caminho mais curto para cada cadastro. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((s) => (
          <li key={s.slug}>
            <Link
              href={s.slug === 'modulos' || s.slug === 'workflows' ? `/admin/${s.slug}/novo` : `/admin/${s.slug}`}
              className="group flex h-full gap-4 glass rounded-2xl p-5 transition-colors hover:border-rule-strong"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-sunken text-ink">
                <NavIcon name={s.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-lg leading-tight font-semibold">
                  <IconPlus size={16} className="text-signal" />
                  {s.verb} {s.noun}
                </span>
                <span className="mt-1 block text-xs text-muted">em {s.where}</span>
                <span className="mt-3 block border-t border-rule pt-3 text-xs text-ink-2">{s.status}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="atencao" className="lg:col-span-7">
          <span className="num block text-sm font-semibold text-signal">01</span>
          <h2 id="atencao" className="text-2xl font-light tracking-tight">
            Precisa da sua atenção
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {attention.map((a) => (
              <li key={a.text}>
                <Link href={a.href} className="flex items-center justify-between gap-4 py-4 hover:bg-surface">
                  <span className="text-[15px] leading-snug">
                    {a.text}
                    {a.when ? <span className="block text-xs text-muted">{a.when}</span> : null}
                  </span>
                  <IconArrowRight size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="agora" className="lg:col-span-5">
          <span className="num block text-sm font-semibold text-signal">02</span>
          <h2 id="agora" className="text-2xl font-light tracking-tight">
            {adminOverview.cohort} agora
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
            {[
              ['alunos', adminOverview.students],
              ['conteúdos na biblioteca', adminOverview.contents],
              ['workflows publicados', adminOverview.workflowsPublished],
              ['procedimentos cadastrados', adminOverview.procedures],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface p-4">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="num mt-1 text-3xl leading-none font-light">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-ink-2">
            Próximo: <strong>Módulo {nextModule.slug} · {nextModule.title}</strong>, {relativeDays(DEMO_TODAY, nextModule.start)}.
          </p>
        </section>
      </div>

      <section aria-labelledby="mapa" className="mt-14 border-t border-rule pt-8">
        <h2 id="mapa" className="eyebrow">
          Todas as áreas do painel
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {adminGroups.map((g) => (
            <div key={g.label}>
              <p className="text-sm font-semibold">{g.label}</p>
              <ul className="mt-2 space-y-1.5">
                {g.sections.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/admin/${s.slug}`} className="text-sm text-muted hover:text-ink hover:underline">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
