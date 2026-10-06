import { IconBell, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import { LifecycleTabs } from '@/components/admin/Lifecycle'
import { adminNotices, countBy } from '@/demo/admin-content'

export const metadata: Metadata = { title: 'Avisos' }

export default function AdminNoticesPage() {
  return (
    <div data-lc-root="avisos">
      <PageTitle eyebrow="Especialização" title="Avisos" lead="Recados curtos que aparecem no Início da turma durante o período escolhido." />
      <LifecycleTabs name="avisos" counts={countBy(adminNotices)} />
      <ul className="space-y-3">
        {adminNotices.map((n) => (
          <li key={n.id} data-lifecycle={n.status} className="glass grid gap-5 rounded-2xl p-5 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={n.status} />
                <span className="num text-xs text-muted">
                  Exibir de {n.showFrom} até {n.showUntil}
                </span>
              </div>
              <p className={`mt-3 text-[17px] font-semibold ${n.status === 'arquivado' ? 'text-muted' : ''}`}>{n.title}</p>
              <p className="mt-1 text-sm text-ink-2">{n.body}</p>
              <p className="mt-4 flex gap-4 text-sm">
                <span className="font-semibold underline underline-offset-2">Editar</span>
                <span className="text-muted underline underline-offset-2">
                  {n.status === 'arquivado' ? 'Restaurar' : n.status === 'rascunho' ? 'Publicar' : 'Arquivar'}
                </span>
              </p>
            </div>
            <div className="md:col-span-5">
              <p className="eyebrow text-[10px]">Como o aluno vê no Início</p>
              <div className={`glass mt-2 flex gap-3 rounded-2xl p-4 ${n.status === 'arquivado' ? 'opacity-85 grayscale' : ''}`}>
                <IconBell size={18} className="mt-0.5 shrink-0 text-signal" />
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{n.body}</p>
                  <p className="mt-2 text-[11px] text-muted">{n.from}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <details className="mt-4 rounded-2xl border border-dashed border-rule-strong">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-2 p-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <IconPlus size={18} /> Novo aviso
        </summary>
        <div className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
          <input aria-label="Título" placeholder="Título curto" className="field min-h-11 px-3 sm:col-span-2" />
          <textarea aria-label="Texto" rows={2} placeholder="Texto do aviso" className="field px-3 py-2.5 sm:col-span-2" />
          <input aria-label="Exibir de" type="date" className="field min-h-11 px-3" />
          <input aria-label="Exibir até" type="date" className="field min-h-11 px-3" />
          <p className="text-xs text-muted sm:col-span-2">O aviso nasce como rascunho. Ele só aparece para a turma depois de publicado.</p>
        </div>
      </details>
    </div>
  )
}
