import type { ComponentProps, ReactNode } from 'react'

/** Campo de formulário: rótulo em linguagem do dia a dia, ajuda curta, erro com texto (nunca só cor). */
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
        className="mt-1.5 block min-h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-base text-ink placeholder:text-faint focus:border-ink focus:outline-none aria-invalid:border-danger"
        {...input}
      />
      {error ? <p className="mt-1 text-xs font-semibold text-danger">⚠ {error}</p> : null}
    </div>
  )
}
