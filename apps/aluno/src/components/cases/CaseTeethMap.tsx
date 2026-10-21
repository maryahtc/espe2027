import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { OrientationLegend, QuadrantGrid } from '@/components/cases/ToothQuadrants'

/**
 * Odontograma pequeno do caso: só mostra os dentes/posições FDI envolvidos nos registros (e ✓ onde já houve a etapa
 * que conclui — tudo derivado dos registros, nenhum estado novo). Tocar num dente filtra a linha do tempo.
 * Mesmos quadrantes do odontograma do registro. Não é prontuário: sem faces, condições ou diagnóstico.
 */
export function CaseTeethMap({ teeth, selected, hrefFor }: { teeth: Map<number, { done: boolean }>; selected?: number | null; hrefFor?: (t: number) => string }) {
  const cell = (t: number) => {
    const info = teeth.get(t)
    const cls = cn(
      'num relative flex h-9 min-w-0 items-center justify-center rounded-md border text-xs sm:h-8',
      info ? 'border-[var(--brand)] font-semibold text-ink' : 'border-rule text-faint',
      info?.done && 'bg-[var(--brand)]/25',
      selected === t && 'ring-2 ring-ink',
    )
    const content = (
      <>
        {t}
        {info?.done ? (
          <span aria-hidden="true" className="absolute -top-1.5 -right-1 text-[10px] text-ink">
            ✓
          </span>
        ) : null}
      </>
    )
    return info && hrefFor ? (
      <Link
        href={hrefFor(t)}
        scroll={false}
        className={cls}
        aria-label={`Dente ${t}${info.done ? ', etapa final registrada' : ''}: filtrar a linha do tempo`}
        aria-current={selected === t ? 'true' : undefined}
        data-dente-caso={t}
      >
        {content}
      </Link>
    ) : (
      <span className={cls} aria-hidden={!info} data-dente-caso={info ? t : undefined}>
        {content}
      </span>
    )
  }
  return (
    <div data-odontograma-caso>
      <OrientationLegend top />
      <QuadrantGrid cell={cell} compact />
      <OrientationLegend />
      <p className="pt-2 text-[11px] text-muted">
        Dentes dos registros deste caso · ✓ etapa final já registrada{hrefFor ? ' · toque num dente para filtrar a linha do tempo' : ''}
      </p>
    </div>
  )
}
