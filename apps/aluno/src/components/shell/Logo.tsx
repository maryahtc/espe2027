import Image from 'next/image'
import Link from 'next/link'

/** Logo Conexo (recortado do manual; trocar pelo SVG oficial quando chegar). */
export function Logo({ variant = 'full', href = '/' }: { variant?: 'full' | 'short'; href?: string }) {
  const full = variant === 'full'
  return (
    <Link href={href} aria-label="Conexo — Clavijo & Ottoboni · início" className="inline-flex shrink-0">
      <Image
        src={full ? '/logo-conexo-escuro.png' : '/logo-conexo-curto-escuro.png'}
        alt=""
        width={full ? 640 : 352}
        height={95}
        priority
        className={full ? 'h-[26px] w-auto' : 'h-6 w-auto'}
      />
    </Link>
  )
}
