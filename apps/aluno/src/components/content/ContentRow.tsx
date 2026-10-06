import { cn } from '@portal/ui/cn'
import { IconCheck, IconDoc, IconPlay } from '@portal/ui/icons'
import { RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import type { PrepItem } from '@/demo/data'

const KIND_LABEL: Record<PrepItem['kind'], string> = {
  video: 'Vídeo',
  artigo: 'Artigo',
  pdf: 'PDF',
  capitulo: 'Capítulo',
}

/** Uma linha de conteúdo de preparação (pré-módulo). */
export function ContentRow({ item }: { item: PrepItem }) {
  const done = item.status === 'concluido'
  const Icon = item.kind === 'video' ? IconPlay : IconDoc
  return (
    <li className={cn('group flex items-start gap-4 py-4', done && 'opacity-60')}>
      <span
        className={cn(
          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border',
          done ? 'border-rule bg-sunken text-muted' : 'border-rule-strong bg-surface text-ink',
        )}
      >
        {done ? <IconCheck size={18} /> : <Icon size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/biblioteca/${item.slug}`}
          className={cn('block text-[15px] leading-snug font-semibold hover:underline', done && 'line-through decoration-rule-strong')}
        >
          {item.title}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <RequirementTag level={item.requirement} />
          <span>{item.author}</span>
          <span className="num">
            {KIND_LABEL[item.kind]} · {item.minutes} min
          </span>
        </p>
      </div>
      <div className="shrink-0 pt-0.5 text-right">
        {item.status === 'concluido' ? <span className="text-xs font-semibold text-muted">Concluído</span> : null}
        {item.status === 'em-andamento' ? (
          <Link href={`/biblioteca/${item.slug}`} className="block text-sm font-semibold text-ink hover:underline">
            Continuar
            <span className="mt-1.5 block h-[2px] w-16 bg-rule">
              <span className="block h-full bg-ink" style={{ width: `${item.progress ?? 0}%` }} />
            </span>
            <span className="num mt-1 block text-[11px] font-normal text-muted">{item.progress}% assistido</span>
          </Link>
        ) : null}
        {item.status === 'pendente' ? (
          <Link href={`/biblioteca/${item.slug}`} className="text-sm font-semibold text-ink hover:underline">
            {item.kind === 'video' ? 'Assistir' : 'Ler'}
          </Link>
        ) : null}
      </div>
    </li>
  )
}

/** Ordem de exibição: em andamento → obrigatórios pendentes → demais pendentes → concluídos. */
export function sortPreparation(items: PrepItem[]): PrepItem[] {
  const rank = (i: PrepItem) => {
    if (i.status === 'concluido') return 4
    if (i.status === 'em-andamento') return 0
    if (i.requirement === 'obrigatorio') return 1
    return i.requirement === 'recomendado' ? 2 : 3
  }
  return [...items].sort((a, b) => rank(a) - rank(b))
}
