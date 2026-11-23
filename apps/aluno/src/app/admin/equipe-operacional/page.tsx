import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input } from '@/components/admin/academic/ui'
import { requireUser } from '@/lib/auth/session'
import { saveOpsPerson } from '@/lib/ops/actions'
import { loadOpsPeople, type OpsPerson } from '@/lib/ops/load'

export const metadata: Metadata = { title: 'Equipe operacional' }

function Fields({ p }: { p?: OpsPerson }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nome" name="nome" required maxLength={120} defaultValue={p?.name} />
        <Input label="Função" name="funcao" maxLength={120} defaultValue={p?.roleTitle ?? ''} placeholder="Ex.: Compras, Recepção" />
        <Input label="E-mail (opcional)" name="email" type="email" maxLength={200} defaultValue={p?.contact?.email ?? ''} />
        <Input label="Telefone (opcional)" name="telefone" maxLength={40} defaultValue={p?.contact?.phone ?? ''} />
      </div>
      <Input label="Observações do contato (opcional)" name="obs" maxLength={500} defaultValue={p?.contact?.notes ?? ''} />
      {p ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={p.active} className="size-4 accent-[var(--brand)]" /> Ativo (aparece na escolha de responsável)
        </label>
      ) : null}
    </>
  )
}

/** Bloco A — Equipe operacional (só o Admin). Independente de "Docentes e coordenação". */
export default async function OpsTeamPage() {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  const people = await loadOpsPeople(true)
  return (
    <div data-equipe-operacional>
      <PageTitle
        eyebrow="Turmas e pessoas"
        title="Equipe operacional"
        lead="Pessoas que cuidam da operação (compras, recepção, apoio). Podem ser responsáveis por pendências e providências. Não aparecem na programação, na equipe dos módulos, na Biblioteca nem no site público."
      />
      {!people ? (
        <EmptyState title="Ainda não disponível">A Equipe operacional aparece depois da atualização do banco de dados.</EmptyState>
      ) : (
        <>
          <p className="-mt-4 mb-6 text-xs text-muted">Contatos são vistos só pelo Admin. A coordenação vê apenas o nome do responsável nas pendências.</p>
          <details className="glass rounded-2xl p-4 sm:p-5" data-nova-pessoa>
            <summary className="cursor-pointer text-[15px] font-semibold">+ Cadastrar pessoa</summary>
            <ActionForm action={saveOpsPerson} submit="Cadastrar" variant="primary" className="mt-4">
              <Fields />
            </ActionForm>
          </details>
          {people.length ? (
            <ul className="mt-6 space-y-3" data-lista-operacional>
              {people.map((p) => (
                <li key={p.id} className="glass rounded-2xl p-4 sm:p-5" data-pessoa-operacional={p.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[15px] font-semibold">
                      {p.name}
                      {p.roleTitle ? <span className="font-normal text-muted"> · {p.roleTitle}</span> : null}
                    </p>
                    <span className="text-xs text-muted">{p.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  {p.contact?.email || p.contact?.phone ? (
                    <p className="mt-1 text-sm break-words text-ink-2" data-contato>
                      {[p.contact.email, p.contact.phone].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  <details className="mt-2" data-editar-pessoa>
                    <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Editar</summary>
                    <ActionForm action={saveOpsPerson} submit="Salvar" className="mt-3">
                      <Fields p={p} />
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <EmptyState title="Ninguém cadastrado">Use “+ Cadastrar pessoa” para registrar quem cuida da operação.</EmptyState>
            </div>
          )}
        </>
      )}
    </div>
  )
}
