import { Button } from '@portal/ui/button'
import { Field } from '@portal/ui/field'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Novo módulo' }

const STEPS = ['Informações', 'Programação', 'Antes do módulo', 'Durante e depois', 'Publicar']

/**
 * Esboço da tela de cadastro (Etapa 1): mostra a estrutura que o formulário real terá na Etapa 3.
 * Nada é gravado.
 */
export default function NewModulePage() {
  return (
    <>
      <Link href="/admin/modulos" className="text-sm text-muted hover:text-ink">
        ← Módulos e cronograma
      </Link>
      <PageTitle eyebrow="Turma 2027" title="Novo módulo" lead="Comece pelo básico. Programação e conteúdos vêm nos passos seguintes." />

      <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-rule pb-4 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={i === 0 ? 'font-semibold text-ink' : 'text-muted'}>
            <span className={`num mr-1.5 ${i === 0 ? 'text-brand' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
            {s}
          </li>
        ))}
      </ol>

      <form className="grid max-w-3xl gap-6" aria-describedby="aviso-previa">
        <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
          <Field label="Número" name="numero" inputMode="numeric" defaultValue="31" />
          <Field label="Tema principal" name="tema" placeholder="Ex.: Laminados cerâmicos" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Primeiro dia" name="inicio" type="date" />
          <Field label="Último dia" name="fim" type="date" hint="Pode deixar em branco se ainda não estiver confirmado." />
        </div>
        <Field label="Docentes" name="docentes" placeholder="Comece a digitar o nome do docente…" hint="Escolha da lista de docentes. Se não estiver lá, cadastre em Docentes e coordenação." />
        <div>
          <label htmlFor="descricao" className="block text-sm font-semibold">
            Descrição para os alunos
          </label>
          <p className="mt-0.5 text-xs text-muted">Duas ou três frases: o que será trabalhado e o que esperar da clínica.</p>
          <textarea
            id="descricao"
            name="descricao"
            rows={4}
            className="mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-base focus:border-ink focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
          <Button type="button" disabled className="disabled:opacity-60">
            Salvar e continuar: programação
          </Button>
          <span className="text-xs text-muted">Rascunho salvo automaticamente · o aluno só vê depois de publicar</span>
        </div>
        <p id="aviso-previa" className="rounded-md bg-sunken px-4 py-3 text-xs text-muted">
          Prévia da Etapa 1: este formulário mostra a estrutura da tela. O cadastro passa a funcionar na Etapa 3.
        </p>
      </form>
    </>
  )
}
