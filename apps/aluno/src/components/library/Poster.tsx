import { cn } from '@portal/ui/cn'
import { IconDoc, IconPlay } from '@portal/ui/icons'
import type { LibraryItem } from '@/demo/library'

/** Capa do conteúdo: vídeo = quadro escuro com play; leitura = folha clara. Sem imagens inventadas. */
export function Poster({ item, size = 'md', className }: { item: LibraryItem; size?: 'md' | 'lg'; className?: string }) {
  const video = item.kind === 'Videoaula'
  return (
    <span
      className={cn(
        'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md',
        video ? 'bg-ink text-white' : 'border border-rule bg-sunken text-ink',
        className,
      )}
    >
      {video ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(90deg,transparent_0_23px,rgba(255,255,255,.18)_23px_24px)]"
        />
      ) : null}
      <span
        className={cn(
          'relative flex items-center justify-center rounded-full',
          size === 'lg' ? 'size-16' : 'size-11',
          video ? 'bg-white text-ink' : 'bg-surface text-ink',
        )}
      >
        {video ? <IconPlay size={size === 'lg' ? 26 : 18} /> : <IconDoc size={size === 'lg' ? 26 : 18} />}
      </span>
      <span className={cn('num absolute right-3 bottom-2.5 text-xs', video ? 'text-white/80' : 'text-muted')}>{item.minutes} min</span>
      <span className="absolute top-0 left-0 h-[3px] w-10 bg-brand" />
      {item.progress ? (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
          <span className="block h-full bg-brand" style={{ width: `${item.progress}%` }} />
        </span>
      ) : null}
    </span>
  )
}
