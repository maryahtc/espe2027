import type { ComponentProps, ReactNode } from 'react'

/** Campo de formulário: opaco, rótulo claro, ajuda curta, erro com ícone e texto (nunca só cor). */
export function Field({
  label,
  hint,
  error,
  ...input
}: { label: string; hint?: ReactNode; error?: string } & ComponentProps<'input'>) {
  const id = input.id ?? input.name
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className="field mt-1.5 block min-h-11 w-full px-3 text-base aria-invalid:border-danger disabled:opacity-50"
        {...input}
      />
      {error ? <p className="mt-1 text-xs font-semibold text-danger">⚠ {error}</p> : null}
    </div>
  )
}
