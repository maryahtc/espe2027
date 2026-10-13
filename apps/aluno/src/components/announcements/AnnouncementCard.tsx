import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconBell } from '@portal/ui/icons'
import Link from 'next/link'
import { dismissAnnouncement } from '@/lib/announcements/actions'
import type { AnnouncementVM } from '@/lib/announcements/model'
import { formatDayMonth } from '@/lib/dates'

/**
 * Aviso como o aluno vê no Início. Importante: destacado e sem "Entendi" (fica até a data final).
 * `dismissable` falso na pré-visualização (nada é gravado).
 */
export function AnnouncementCard({ item, dismissable = false, className }: { item: AnnouncementVM; dismissable?: boolean; className?: string }) {
  const external = item.linkUrl?.startsWith('https://')
  return (
    <article
      data-aviso={item.important ? 'importante' : 'comum'}
      aria-label={item.important ? `Aviso importante: ${item.title}` : `Aviso: ${item.title}`}
      className={cn('glass flex gap-3 rounded-2xl p-4 sm:p-5', item.important && 'border border-[var(--brand)]/60 bg-[var(--brand)]/[0.06]', className)}
    >
      <IconBell size={18} className="mt-0.5 shrink-0 text-signal" />
      <div className="min-w-0 flex-1">
        {item.important ? <p className="eyebrow mb-1 text-[10px] text-signal">Importante</p> : null}
        <p className="text-[15px] leading-snug font-semibold">{item.title}</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-2">{item.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span>
            {item.signature ? `${item.signature} · ` : ''}
            <span className="num">até {formatDayMonth(item.visibleUntil)}</span>
          </span>
          {item.linkUrl ? (
            external ? (
              <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                {item.linkLabel || 'Abrir link'} <IconArrowRight size={13} />
              </a>
            ) : (
              <Link href={item.linkUrl} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                {item.linkLabel || 'Abrir'} <IconArrowRight size={13} />
              </Link>
            )
          ) : null}
        </div>
      </div>
      {dismissable && !item.important ? (
        <form action={dismissAnnouncement} className="shrink-0 self-start">
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="rounded-full border border-rule-strong px-3 py-1.5 text-xs font-semibold hover:bg-white/[0.06]">
            Entendi
          </button>
        </form>
      ) : null}
    </article>
  )
}
