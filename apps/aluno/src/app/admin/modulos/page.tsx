import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { modules, nextModule } from '@/demo/data'
import { formatRange } from '@/lib/dates'

export const metadata: Metadata = { title: 'Módulos e cronograma' }

/** Situação fictícia de cada módulo no painel. */
function adminStatus(n: number) {
  if (n <= nextModule.number) return { label: 'Publicado', prep: n === nextModule.number ? '3 obrigatórios · 2 outros' : '—', draft: false }
  if (n === nextModule.number + 1) return { label: 'Rascunho', prep: 'Sem obrigatório', draft: true }
  if (n === nextModule.number + 2) return { label: 'Rascunho', prep: '1 obrigatório', draft: true }
  return { label: 'Só datas', prep: '—', draft: false }
}

export default function AdminModulesPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Especialização · Turma 2027"
          title="Módulos e cronograma"
          lead="Cada módulo tem programação por dia, preparação (antes) e materiais (durante e depois)."
        />
        <ButtonLink href="/admin/modulos/novo" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Novo módulo
        </ButtonLink>
      </div>

      <div className="overflow-hidden rounded-lg border border-rule bg-surface">
        <div className="hidden grid-cols-[4rem_1fr_9rem_10rem_8rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
          <span>Nº</span>
          <span>Módulo</span>
          <span>Datas</span>
          <span>Preparação</span>
          <span>Situação</span>
        </div>
        <ul className="divide-y divide-rule">
          {modules.map((m) => {
            const st = adminStatus(m.number)
            return (
              <li key={m.number}>
                <Link
                  href="/admin/modulos/novo"
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-sunken md:grid-cols-[4rem_1fr_9rem_10rem_8rem]"
                >
                  <span className="num text-xl font-light">{m.slug}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{m.title}</span>
                    <span className="block truncate text-xs text-muted">{m.teachers.map((t) => t.short).join(', ')}</span>
                  </span>
                  <span className="num hidden text-sm md:block">{formatRange(m.start, m.end)}</span>
                  <span className={`hidden text-sm md:block ${st.prep === 'Sem obrigatório' ? 'font-semibold' : 'text-ink-2'}`}>{st.prep}</span>
                  <span className="text-right text-xs md:text-left">
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${st.draft ? 'text-ink' : st.label === 'Publicado' ? 'text-ink-2' : 'text-muted'}`}
                    >
                      <span
                        className={`size-2 rounded-full ${st.label === 'Publicado' ? 'bg-ink' : st.draft ? 'border border-ink' : 'border border-rule-strong'}`}
                      />
                      {st.label}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
