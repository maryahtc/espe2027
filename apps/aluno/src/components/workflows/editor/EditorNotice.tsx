import { PageTitle } from '@portal/ui/section'

/** Quando o editor não pode abrir: banco ainda sem a Etapa 9, ou coordenação sem matrícula ativa. Nada é consultado. */
export function EditorNotice({ state, eyebrow }: { state: 'antigo' | 'inativo'; eyebrow: string }) {
  return (
    <>
      <PageTitle eyebrow={eyebrow} title="Workflows clínicos" />
      <div role="note" data-editor-indisponivel={state} className="glass rounded-2xl p-5 text-sm text-ink-2">
        {state === 'antigo' ? (
          <>
            <p className="font-semibold text-ink">Ainda não disponível neste ambiente.</p>
            <p className="mt-1">O editor de Workflows clínicos passa a funcionar quando o banco do portal receber a atualização da Etapa 9. Nada mais do portal muda até lá.</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-ink">Sem acesso ao editor.</p>
            <p className="mt-1">Os Workflows clínicos são editados pelo Admin e pela coordenação com matrícula de coordenação ativa numa turma ativa.</p>
          </>
        )}
      </div>
    </>
  )
}
