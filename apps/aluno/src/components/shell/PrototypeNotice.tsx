/**
 * Aviso de protótipo, só nas telas que ainda usam dados fictícios (Casos, Produção, Workflows…).
 * As áreas já reais não mostram nada. Some quando a etapa da tela for implementada.
 */
export function PrototypeNotice({ etapa }: { etapa?: string }) {
  return (
    <p
      role="note"
      data-prototipo
      className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-rule-strong bg-black/40 px-4 py-1.5 text-[11px] font-medium tracking-wide text-muted"
    >
      <span className="font-semibold text-ink">Protótipo</span>
      <span>· esta tela ainda usa dados fictícios{etapa ? ` — a versão real chega na ${etapa}` : ''}.</span>
    </p>
  )
}
