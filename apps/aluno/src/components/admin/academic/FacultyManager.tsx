import { ActionForm } from './ActionForm'
import { AddPanel, Check, Editable, Input, Select, TextArea } from './ui'
import { saveFaculty } from '@/lib/admin/academic-actions'
import { FACULTY_KIND_LABEL, type FacultyRef } from '@/lib/academic/model'

const KIND_OPTIONS = Object.entries(FACULTY_KIND_LABEL) as Array<[string, string]>

function Fields({ f }: { f?: FacultyRef }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
        <Input label="Tratamento" name="tratamento" defaultValue={f?.honorific ?? ''} placeholder="Prof., Dra." />
        <Input label="Nome completo" name="nome" required defaultValue={f?.fullName} />
        <Input label="Como aparece" name="exibicao" defaultValue={f?.name ?? ''} placeholder="Thiago" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" name="tipo" defaultValue={f?.kind ?? 'docente'} options={KIND_OPTIONS} />
        <Input label="Especialidade (opcional)" name="especialidade" defaultValue={f?.specialty ?? ''} />
      </div>
      <TextArea label="Minibio (opcional, visível ao aluno)" name="bio" rows={2} defaultValue={f?.bio ?? ''} />
      {f ? (
        <>
          <input type="hidden" name="ativo" value="" />
          <Check label="ativo (aparece nas listas de escolha)" name="ativo" defaultChecked={f.active} />
        </>
      ) : null}
    </>
  )
}

/** Docentes e equipe: cadastro de conteúdo, sem login. Corrigir aqui muda o nome em todos os módulos. */
export function FacultyManager({ faculty }: { faculty: FacultyRef[] }) {
  return (
    <section id="docentes" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-xl font-light tracking-tight">Docentes e equipe</h2>
        <div className="rule-brand mt-2 w-12" />
        <p className="mt-3 text-sm text-muted">
          Quem dá aula ou acompanha os módulos. Sem login: aparece no cronograma e nas páginas dos módulos. Corrigir um nome aqui atualiza todos os módulos.
        </p>
      </div>
      <ul className="space-y-2">
        {faculty.map((f) => (
          <li key={f.id}>
            <Editable
              summary={
                <span className="block text-sm">
                  <span className="font-semibold">
                    {f.honorific ? `${f.honorific} ` : ''}
                    {f.fullName}
                  </span>
                  {f.name !== f.fullName ? <span className="text-muted"> · aparece como “{f.name}”</span> : null}
                  <span className="ml-2 text-xs text-muted">
                    {FACULTY_KIND_LABEL[f.kind]}
                    {!f.active ? ' · inativo' : ''}
                  </span>
                </span>
              }
            >
              <ActionForm action={saveFaculty}>
                <input type="hidden" name="id" value={f.id} />
                <Fields f={f} />
              </ActionForm>
            </Editable>
          </li>
        ))}
      </ul>
      <AddPanel label="Cadastrar docente ou membro da equipe">
        <ActionForm action={saveFaculty} submit="Cadastrar">
          <Fields />
        </ActionForm>
      </AddPanel>
    </section>
  )
}
