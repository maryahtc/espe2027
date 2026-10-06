import Link from 'next/link'
import { cn } from './cn'

export type RulerModule = { number: number; label: string; state: 'done' | 'next' | 'upcoming'; href: string }

/**
 * Régua da especialização: um traço por módulo, como uma régua milimetrada.
 * Concluídos em tinta, o próximo em vermelho (com rótulo), os futuros em cinza.
 */
export function ModuleRuler({ modules, className }: { modules: RulerModule[]; className?: string }) {
  return (
    <ol className={cn('flex items-end gap-[3px] sm:gap-1', className)} aria-label="Módulos da especialização">
      {modules.map((m) => (
        <li key={m.number} className="group relative min-w-0 flex-1">
          <Link
            href={m.href}
            aria-label={`Módulo ${m.number}: ${m.label}${m.state === 'done' ? ' (concluído)' : m.state === 'next' ? ' (próximo)' : ''}`}
            className="flex flex-col items-center pt-1 pb-5"
          >
            <span
              className={cn(
                'block w-full rounded-[1px] transition-[height] duration-200',
                m.state === 'done' && 'h-5 bg-ink group-hover:h-6',
                m.state === 'next' && 'h-9 bg-brand shadow-[0_0_18px_var(--brand-glow)]',
                m.state === 'upcoming' && (m.number % 5 === 0 ? 'h-4' : 'h-3'),
                m.state === 'upcoming' && 'bg-rule-strong group-hover:h-5',
              )}
            />
            <span
              className={cn(
                'num absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] leading-none',
                m.state === 'next' ? 'font-semibold text-signal' : 'text-faint',
                labelVisibility(m, modules.length),
              )}
            >
              {String(m.number).padStart(2, '0')}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/** Celular: só o primeiro, o próximo e o último. Telas maiores: também os múltiplos de 5. */
function labelVisibility(m: RulerModule, total: number): string {
  if (m.state === 'next' || m.number === 1 || m.number === total) return ''
  return m.number % 5 === 0 ? 'hidden sm:block' : 'hidden'
}
