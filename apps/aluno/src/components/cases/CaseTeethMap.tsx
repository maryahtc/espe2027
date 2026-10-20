import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { FDI_LOWER, FDI_UPPER } from '@/lib/cases/model'

/**
 * Odontograma pequeno do caso: só mostra as posições FDI envolvidas nos registros (e ✓ onde já houve a etapa que
 * conclui — tudo derivado dos registros, nenhum estado novo). Tocar numa posição filtra a linha do tempo.
 * Não é prontuário: sem faces, condições ou diagnóstico.
 */
export function CaseTeethMap({ teeth, selected, hrefFor }: { teeth: Map<number, { done: boolean }>; selected?: number | null; hrefFor?: (t: number) => string }) {
  const cell = (t: number, i: number) => {
    const info = teeth.get(t)
    const cls = cn(
      'num relative flex h-8 items-center justify-center rounded border text-[11px]',
      i === 7 && 'sm:mr-1',
      info ? 'border-[var(--brand)] font-semibold text-ink' : 'border-rule text-faint',
      info?.done && 'bg-[var(--brand)]/25',
      selected === t && 'ring-2 ring-ink',
    )
    const content = (
      <>
        {t}
        {info?.done ? <span aria-hidden="true" className="absolute -top-1.5 -right-1 text-[10px] text-ink">✓</span> : null}
      </>
    )
    return info && hrefFor ? (
      <Link key={t} href={hrefFor(t)} scroll={false} className={cls} aria-label={`Posição ${t}${info.done ? ', concluída' : ''}: filtrar a linha do tempo`} aria-current={selected === t ? 'true' : undefined} data-dente-caso={t}>
        {content}
      </Link>
    ) : (
      <span key={t} className={cls} aria-hidden={!info} data-dente-caso={info ? t : undefined}>
        {content}
      </span>
    )
  }
  return (
    <div className="space-y-1.5" data-odontograma-caso>
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-16">{FDI_UPPER.map(cell)}</div>
      <div className="h-px bg-rule" />
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-16">{FDI_LOWER.map(cell)}</div>
      <p className="pt-1 text-[11px] text-muted">
        Posições FDI dos registros deste caso · ✓ etapa que conclui já registrada{hrefFor ? ' · toque para filtrar a linha do tempo' : ''}
      </p>
    </div>
  )
}
