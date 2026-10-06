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

export type Lifecycle = 'rascunho' | 'publicado' | 'arquivado'

const LIFECYCLE: Record<Lifecycle, { label: string; mark: string }> = {
  rascunho: { label: 'Rascunho', mark: 'border border-dashed border-ink' },
  publicado: { label: 'Publicado', mark: 'bg-ink' },
  arquivado: { label: 'Arquivado', mark: 'border border-faint' },
}

/** Estado de conteúdo institucional: Rascunho (tracejado) · Publicado (cheio) · Arquivado (vazado, apagado). */
export function StatusPill({ status, className }: { status: Lifecycle; className?: string }) {
  const s = LIFECYCLE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-0.5 text-xs font-semibold',
        status === 'arquivado' ? 'text-muted' : 'text-ink',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', s.mark)} />
      {s.label}
    </span>
  )
}
