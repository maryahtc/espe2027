import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { inputCls, labelCls, TextArea } from '@/components/admin/academic/ui'
import { createWorkflow } from '@/lib/workflows/actions'
import type { ProcedureChoice } from '@/lib/workflows/load'
import { WORKFLOW_LIMITS } from '@/lib/workflows/model'

/** "+ Novo workflow": escolher um procedimento existente do catálogo (sem criar nem editar o catálogo). */
export function NewWorkflowView({ base, eyebrow, choices }: { base: string; eyebrow: string; choices: ProcedureChoice[] }) {
  const groups = new Map<string, ProcedureChoice[]>()
  for (const c of choices) groups.set(c.categoryName, [...(groups.get(c.categoryName) ?? []), c])
  const available = choices.filter((c) => !c.blocked).length
  return (
    <div data-novo-workflow className="max-w-2xl">
      <Link href={base} className="text-sm text-muted hover:text-ink">
        ← Workflows clínicos
      </Link>
      <PageTitle
        eyebrow={eyebrow}
        title="Novo workflow"
        lead="Escolha o procedimento do catálogo. O nome e a categoria vêm do catálogo e não são editados aqui. O workflow nasce como rascunho e não aparece para alunos."
      />
      {available ? (
        <ActionForm action={createWorkflow} submit="Criar rascunho" variant="primary">
          <input type="hidden" name="base" value={base} />
          <label className={labelCls}>
            Procedimento
            <select name="procedimento" required defaultValue="" className={inputCls} data-campo="procedimento">
              <option value="" disabled>
                Escolha um procedimento…
              </option>
              {[...groups].map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((c) => (
                    <option key={c.id} value={c.id} disabled={!!c.blocked} data-bloqueio={c.blocked ?? undefined}>
                      {c.name}
                      {c.blocked ? ` — ${c.blocked}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted">Indisponíveis: “Outro procedimento”, procedimentos desativados e os que já têm workflow ativo.</p>
          <TextArea label="Descrição curta (opcional)" name="descricao" maxLength={WORKFLOW_LIMITS.summary} rows={3} hint={`Até ${WORKFLOW_LIMITS.summary} caracteres.`} />
        </ActionForm>
      ) : (
        <p className="glass rounded-2xl p-5 text-sm text-ink-2" data-sem-procedimento>
          Todos os procedimentos disponíveis do catálogo já têm workflow. Para começar outro, arquive o atual do mesmo procedimento.
        </p>
      )}
    </div>
  )
}
