import { cn } from '@portal/ui/cn'
import { IconDoc, IconExternal } from '@portal/ui/icons'
import { RequirementTag } from '@portal/ui/tag'
import type { ResourceVM } from '@/lib/academic/load'

const KIND_LABEL: Record<ResourceVM['kind'], string> = { link: 'Link', arquivo: 'Arquivo', texto: 'Texto' }
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** Uma aula, link, arquivo ou texto do módulo (mesmo desenho da linha de conteúdo da preparação). */
export function ResourceRow({ item, preview = false }: { item: ResourceVM; preview?: boolean }) {
  const Icon = item.kind === 'link' ? IconExternal : IconDoc
  const href = item.kind === 'link' ? item.url! : item.kind === 'arquivo' ? `/modulos/arquivo/${item.id}` : null
  const notYet = item.availableFrom && new Date(item.availableFrom) > new Date()
  return (
    <li className="group flex items-start gap-4 py-4">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border border-rule-strong bg-surface text-ink">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[15px] leading-snug font-semibold hover:underline"
          >
            {item.title}
          </a>
        ) : (
          <p className="text-[15px] leading-snug font-semibold">{item.title}</p>
        )}
        {item.description ? <p className="mt-1 text-sm text-ink-2">{item.description}</p> : null}
        {item.kind === 'texto' && item.body ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-sm text-muted hover:text-ink">Ler</summary>
            <p className="mt-2 rounded-md bg-surface p-4 text-sm leading-relaxed whitespace-pre-line text-ink-2">{item.body}</p>
          </details>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <RequirementTag level={item.requirement} />
          <span>{KIND_LABEL[item.kind]}</span>
          {preview && item.status !== 'publicado' ? <span className="font-semibold text-ink">Rascunho (invisível ao aluno)</span> : null}
          {notYet ? <span className={cn('num', preview && 'font-semibold text-ink')}>Liberado em {dateTime.format(new Date(item.availableFrom!))}</span> : null}
        </p>
      </div>
    </li>
  )
}
