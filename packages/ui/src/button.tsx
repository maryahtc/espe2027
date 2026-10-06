import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'

/**
 * primary: vermelho Conexo — uma ação principal por área.
 * secondary: vidro com borda fina.
 * quiet: só texto.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong shadow-[0_8px_28px_-12px_var(--brand-glow)]',
  secondary: 'glass glass-interactive text-ink',
  quiet: 'px-0 text-ink underline-offset-4 hover:underline',
}

export function buttonClasses(variant: ButtonVariant = 'primary', className?: string) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[background-color,border-color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-45',
    VARIANTS[variant],
    className,
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button className={buttonClasses(variant, className)} {...props} />
}

export function ButtonLink({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  )
}
