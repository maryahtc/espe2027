import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from './icons'

export function ArrowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 text-sm font-medium text-ink ${className}`}
    >
      <span className="link-underline">{children}</span>
      <ArrowRight width={15} height={15} className="transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  )
}

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-ink-2"
    >
      {children}
      <ArrowRight width={16} height={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  )
}
