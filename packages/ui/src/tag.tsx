import { cn } from './cn'

export type Requirement = 'obrigatorio' | 'recomendado' | 'complementar'

const LABEL: Record<Requirement, string> = {
  obrigatorio: 'Obrigatório',
  recomendado: 'Recomendado',
  complementar: 'Complementar',
}

/**
 * Obrigatoriedade por FORMA, não por cor:
 * ● obrigatório (cheio) · ◐ recomendado (meio) · ○ complementar (vazado).
 */
export function RequirementTag({ level, className }: { level: Requirement; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2', className)}>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        {level === 'obrigatorio' ? <circle cx="5" cy="5" r="4.5" fill="currentColor" /> : null}
        {level === 'recomendado' ? (
          <>
            <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" />
            <path d="M5 1a4 4 0 0 1 0 8z" fill="currentColor" />
          </>
        ) : null}
        {level === 'complementar' ? <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" /> : null}
      </svg>
      {LABEL[level]}
    </span>
  )
}

/** Etiqueta neutra (tipo de conteúdo, tema, status). */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  )
}
