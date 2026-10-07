import { cn } from '@portal/ui/cn'
import type { ComponentProps, ReactNode } from 'react'

/** Peças de formulário do painel — as mesmas classes do editor aprovado na Etapa 1. */
export const inputCls = 'field mt-1.5 block min-h-11 w-full px-3 text-[15px]'
export const smallInputCls = 'field min-h-10 px-2 text-sm'
export const labelCls = 'block text-sm font-semibold'

export function Block({ index, title, hint, children, id }: { index: string; title: string; hint?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-5 border-t border-rule py-8 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <span className="num block text-sm font-semibold text-signal">{index}</span>
        <h2 className="text-xl font-light tracking-tight">{title}</h2>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="min-w-0 space-y-4 lg:col-span-9">{children}</div>
    </section>
  )
}

export function Input({ label, className, ...props }: { label: string } & ComponentProps<'input'>) {
  return (
    <label className={cn('block', className)}>
      <span className={labelCls}>{label}</span>
      <input className={inputCls} {...props} />
    </label>
  )
}

export function TextArea({ label, hint, className, rows = 3, ...props }: { label: string; hint?: string } & ComponentProps<'textarea'>) {
  return (
    <label className={cn('block', className)}>
      <span className={labelCls}>{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      <textarea rows={rows} className="field mt-1.5 block w-full px-3 py-2.5 text-[15px]" {...props} />
    </label>
  )
}

export function Select({
  label,
  options,
  className,
  ...props
}: { label: string; options: Array<[string, string]> } & ComponentProps<'select'>) {
  return (
    <label className={cn('block', className)}>
      <span className={labelCls}>{label}</span>
      <select className={inputCls} {...props}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Check({ label, className, ...props }: { label: string } & ComponentProps<'input'>) {
  return (
    <label className={cn('inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm', className)}>
      <input type="checkbox" className="size-4 accent-[var(--brand)]" {...props} />
      {label}
    </label>
  )
}

/** Item editável recolhido: resumo numa linha; formulário ao abrir. */
export function Editable({ summary, children, open = false }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-rule bg-surface">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        <span className="shrink-0 pt-0.5 text-xs font-semibold text-muted group-open:hidden">Editar</span>
        <span className="hidden shrink-0 pt-0.5 text-xs font-semibold text-muted group-open:inline">Fechar</span>
      </summary>
      <div className="border-t border-rule px-4 py-4">{children}</div>
    </details>
  )
}

/** Ação de adicionar recolhida ("+ Adicionar …"). */
export function AddPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-dashed border-rule-strong">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">+ {label}</span>
        <span className="hidden text-muted group-open:inline">Cancelar</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  )
}
