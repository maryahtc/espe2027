import { Button, ButtonLink, buttonClasses } from '@portal/ui/button'
import { type Lifecycle, StatusPill } from '@portal/ui/tag'

/**
 * Barra de ciclo de vida de um conteúdo institucional (workflow, módulo, aula, artigo, material, aviso):
 * Rascunho (editável, invisível ao aluno) → Pré-visualizar como aluno → Publicar → Publicado (continua editável)
 * → Arquivar (sai da vista do aluno, histórico mantido). Excluir não é ação padrão.
 *
 * Quando a mudança afeta alunos, cronograma ou estrutura acadêmica, "Publicar" abre uma confirmação.
 */
export function LifecycleBar({
  status,
  previewHref,
  edited = 'rascunho salvo automaticamente',
  confirmId,
}: {
  status: Lifecycle
  previewHref: string
  edited?: string
  /** id do ConfirmDialog que "Publicar" deve abrir (quando a mudança tem impacto). */
  confirmId?: string
}) {
  const publishLabel = status === 'publicado' ? 'Publicar alterações' : status === 'arquivado' ? 'Restaurar como rascunho' : 'Publicar'
  return (
    <div className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusPill status={status} />
        <span className="text-muted">{edited}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'arquivado' ? (
          <span className="mr-1 text-sm text-muted underline underline-offset-2 hover:text-ink">Arquivar</span>
        ) : null}
        <ButtonLink href={previewHref} variant="secondary">
          Pré-visualizar como aluno
        </ButtonLink>
        {confirmId && status !== 'arquivado' ? (
          <a href={`#${confirmId}`} className={buttonClasses('primary')}>
            {publishLabel}
          </a>
        ) : (
          <Button type="button">{publishLabel}</Button>
        )}
      </div>
    </div>
  )
}

/**
 * Confirmação antes de aplicar uma mudança com impacto. Abre por âncora (#id) — funciona sem JavaScript;
 * na versão real vira um diálogo com foco preso e Esc para fechar.
 */
export function ConfirmDialog({
  id,
  title,
  impact,
  confirmLabel,
  note,
}: {
  id: string
  title: string
  impact: string[]
  confirmLabel: string
  note?: string
}) {
  return (
    <div id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="fixed inset-0 z-50 hidden items-center justify-center p-4 target:flex">
      <a href="#" aria-label="Fechar" className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="glass glass-strong glass-sheen relative w-full max-w-lg rounded-[24px] border p-6 sm:p-8">
        <p className="eyebrow flex items-center gap-2 text-signal">
          <span className="glow-dot !size-1.5" /> Confirmar alteração
        </p>
        <h2 id={`${id}-t`} className="mt-3 text-2xl leading-tight font-light tracking-tight">
          {title}
        </h2>
        <ul className="mt-5 space-y-2.5">
          {impact.map((i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink-2">
              <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-white/50" />
              {i}
            </li>
          ))}
        </ul>
        {note ? (
          <label htmlFor={`${id}-avisar`} className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.04] p-3 text-sm">
            <input id={`${id}-avisar`} type="checkbox" defaultChecked className="mt-0.5 size-4 accent-[var(--brand)]" />
            {note}
          </label>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <a href="#" className={buttonClasses('secondary')}>
            Cancelar
          </a>
          <a href="#" className={buttonClasses('primary')}>
            {confirmLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

const TABS: Array<{ key: 'todos' | Lifecycle; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'rascunho', label: 'Rascunhos' },
  { key: 'publicado', label: 'Publicados' },
  { key: 'arquivado', label: 'Arquivados' },
]

/** Filtro por estado (rádio + :has(), sem JavaScript). Os itens filtráveis levam data-lifecycle. */
export function LifecycleTabs({ name, counts }: { name: string; counts: Record<Lifecycle, number> }) {
  const css = (['rascunho', 'publicado', 'arquivado'] as const)
    .map((k) => `[data-lc-root="${name}"]:has(#${name}-${k}:checked) [data-lifecycle]:not([data-lifecycle="${k}"]){display:none}`)
    .join('\n')
  const total = counts.rascunho + counts.publicado + counts.arquivado
  return (
    <fieldset className="mb-5">
      <style>{css}</style>
      <legend className="sr-only">Mostrar por estado</legend>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <span key={t.key}>
            <input type="radio" name={name} id={`${name}-${t.key}`} defaultChecked={t.key === 'todos'} className="peer sr-only" />
            <label
              htmlFor={`${name}-${t.key}`}
              className="glass inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm text-muted hover:text-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
            >
              {t.label}
              <span className="num text-xs">{t.key === 'todos' ? total : counts[t.key]}</span>
            </label>
          </span>
        ))}
      </div>
    </fieldset>
  )
}
