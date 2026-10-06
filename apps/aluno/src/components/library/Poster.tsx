import { cn } from '@portal/ui/cn'
import { IconDoc, IconPlay } from '@portal/ui/icons'
import type { LibraryItem } from '@/demo/library'

/** Posição da luz de cada capa, estável por conteúdo (sem imagens inventadas). */
function lightFor(slug: string) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return { x: 15 + (h % 70), y: 10 + ((h >> 8) % 60) }
}

/**
 * Capa de conteúdo em estilo catálogo: quadro escuro com luz suave, categoria, duração e progresso discreto.
 * Vídeo mostra o botão de play; leitura mostra o ícone de documento.
 */
export function Poster({ item, size = 'md', className }: { item: LibraryItem; size?: 'md' | 'lg'; className?: string }) {
  const video = item.kind === 'Videoaula'
  const { x, y } = lightFor(item.slug)
  return (
    <span
      className={cn('relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black ring-1 ring-white/10', className)}
      style={{
        backgroundImage: `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,${video ? 0.1 : 0.07}), transparent 55%), repeating-linear-gradient(90deg, transparent 0 31px, rgba(255,255,255,0.035) 31px 32px)`,
      }}
    >
      <span className="eyebrow absolute top-3.5 left-4 text-[10px] text-white/60">{item.category}</span>
      <span
        className={cn(
          'relative flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105',
          size === 'lg' ? 'size-16' : 'size-11',
          video ? 'bg-white text-on-ink' : 'border border-white/30 text-ink',
        )}
      >
        {video ? <IconPlay size={size === 'lg' ? 26 : 18} /> : <IconDoc size={size === 'lg' ? 26 : 18} />}
      </span>
      <span className="num absolute right-4 bottom-3 text-xs text-white/70">{item.minutes} min</span>
      {item.progress ? (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
          <span className="block h-full bg-brand" style={{ width: `${item.progress}%` }} />
        </span>
      ) : null}
    </span>
  )
}
