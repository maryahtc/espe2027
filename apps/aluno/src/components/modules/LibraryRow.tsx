import { IconDoc, IconExternal, IconPlay } from '@portal/ui/icons'
import { RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import type { ModuleLibraryItem } from '@/lib/academic/load'
import { KIND_LABEL } from '@/lib/library/model'

/** Conteúdo da biblioteca no módulo (mesmo desenho da linha de recurso), com a situação do aluno. */
export function LibraryRow({ item, preview = false }: { item: ModuleLibraryItem; preview?: boolean }) {
  const Icon = item.kind === 'video' ? IconPlay : item.kind === 'link' ? IconExternal : IconDoc
  return (
    <li className="group flex items-start gap-4 py-4">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border border-rule-strong bg-surface text-ink">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/biblioteca/${item.slug}`} className="block text-[15px] leading-snug font-semibold hover:underline">
          {item.title}
        </Link>
        {item.note ? <p className="mt-1 text-sm text-ink-2">{item.note}</p> : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <RequirementTag level={item.requirement} />
          <span>{KIND_LABEL[item.kind]} · Biblioteca</span>
          {item.progress === 'concluido' ? <span className="font-semibold text-ink">✓ Concluído</span> : null}
          {item.progress === 'iniciado' ? <span>Em andamento</span> : null}
          {preview && item.status !== 'publicado' ? <span className="font-semibold text-ink">{item.status === 'rascunho' ? 'Rascunho' : 'Arquivado'} (invisível ao aluno)</span> : null}
        </p>
      </div>
    </li>
  )
}
