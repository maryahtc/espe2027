import { siteConfig } from '@/config/site'

export function SiteFooter({ updatedAt }: { updatedAt: string | null }) {
  const formatted = updatedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: siteConfig.timezone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(updatedAt))
    : null
  return (
    <footer className="mt-20 border-t border-rule">
      <div className="ruler opacity-60" aria-hidden />
      <div className="mx-auto flex max-w-[1120px] flex-col gap-2 px-4 py-8 text-xs text-muted md:flex-row md:justify-between md:px-8">
        <p>{siteConfig.name}</p>
        {formatted ? <p className="data">Dados atualizados em {formatted}</p> : null}
      </div>
    </footer>
  )
}

export function DemoBanner() {
  return (
    <div className="border-b border-warn/30 bg-warn-bg px-4 py-2 text-center text-xs text-warn">
      <strong className="font-semibold">Dados de demonstração.</strong> Pessoas, datas e quantidades são fictícias.
    </div>
  )
}

export function PreviewBanner() {
  return (
    <div className="border-b border-rule-strong bg-surface px-4 py-2 text-center text-xs text-ink-2">
      <strong className="font-semibold">Prévia.</strong> Dados da grade atual da planilha, sem complementos. O que está
      incompleto aparece como “a confirmar”.
    </div>
  )
}
