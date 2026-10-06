import { cn } from '@portal/ui/cn'
import { IconTooth } from '@portal/ui/icons'
import Image from 'next/image'
import type { DemoCase } from '@/demo/cases'

/**
 * Capa do caso: foto opcional com escurecimento para o texto por cima.
 * Sem foto, um fundo neutro com um ícone discreto.
 * Na versão real a imagem vem de URL assinada (privada), nunca de endereço público.
 */
export function CaseCover({
  item,
  className,
  overlay = true,
  sizes = '(min-width: 1024px) 33vw, 100vw',
}: {
  item: Pick<DemoCase, 'patient' | 'cover'>
  className?: string
  overlay?: boolean
  sizes?: string
}) {
  return (
    <span className={cn('relative block overflow-hidden bg-[#0d0d0d]', className)}>
      {item.cover ? (
        <Image src={item.cover} alt="" fill unoptimized sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_60%)]">
          <IconTooth size={56} className="text-white/15" />
        </span>
      )}
      {overlay ? <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" /> : null}
    </span>
  )
}
