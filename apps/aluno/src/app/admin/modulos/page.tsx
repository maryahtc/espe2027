import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LifecycleTabs } from '@/components/admin/Lifecycle'
import { adminModules, countBy } from '@/demo/admin-content'
import { formatDayMonth, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Módulos e cronograma' }

export default function AdminModulesPage() {
  return (
    <div data-lc-root="modulos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Especialização · Turma 2027"
          title="Módulos e cronograma"
          lead="Rascunhos ficam invisíveis para os alunos. Publicados continuam editáveis. Nada é apagado: o que sai de cena é arquivado."
        />
        <ButtonLink href="/admin/modulos/novo" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Novo módulo
        </ButtonLink>
      </div>
      <LifecycleTabs name="modulos" counts={countBy(adminModules)} />
      <div className="glass overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[4rem_1fr_8rem_11rem_8rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
          <span>Nº</span>
          <span>Módulo</span>
          <span>Início</span>
          <span>Conteúdo</span>
          <span>Estado</span>
        </div>
        <ul className="divide-y divide-rule">
          {adminModules.map((m) => (
            <li key={m.slug} data-lifecycle={m.status}>
              <Link
                href={m.href}
                className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-white/[0.04] md:grid-cols-[4rem_1fr_8rem_11rem_8rem]"
              >
                <span className={`num text-xl font-light ${m.status === 'arquivado' ? 'text-faint' : ''}`}>{m.number}</span>
                <span className={`truncate text-[15px] font-semibold ${m.status === 'arquivado' ? 'text-muted' : ''}`}>{m.title}</span>
                <span className="num hidden text-sm text-ink-2 md:block">
                  {formatDayMonth(m.dates)}/{String(year(m.dates)).slice(2)}
                </span>
                <span className="hidden text-sm text-muted md:block">{m.note}</span>
                <span className="text-right md:text-left">
                  <StatusPill status={m.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
