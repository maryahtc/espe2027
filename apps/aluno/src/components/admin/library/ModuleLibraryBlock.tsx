import { RequirementTag, StatusPill } from '@portal/ui/tag'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Editable, Input, Select } from '@/components/admin/academic/ui'
import { moduleLibrary } from '@/lib/admin/library'
import { linkModule, unlinkModule } from '@/lib/admin/library-actions'
import { KIND_LABEL, type ContentKind, PHASE_LABEL, REQUIREMENT_LABEL } from '@/lib/library/model'

const PHASES = Object.entries(PHASE_LABEL) as Array<[string, string]>
const LEVELS = Object.entries(REQUIREMENT_LABEL) as Array<[string, string]>

/** Bloco "Biblioteca" do editor do módulo: ligar/desligar conteúdos e ajustar fase e obrigatoriedade. */
export async function ModuleLibraryBlock({ moduleId }: { moduleId: string }) {
  const { linked, options } = await moduleLibrary(moduleId)
  const linkedIds = new Set(linked.map((c) => c.id))
  const available = options.filter((o) => !linkedIds.has(o.id))
  return (
    <>
      {linked.length ? (
        <ul className="space-y-2">
          {linked.map((c) => {
            const m = c.modules[0]!
            return (
              <li key={c.id}>
                <Editable
                  summary={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold">{c.title}</span>
                      <span className="text-xs text-muted">{KIND_LABEL[c.kind]}</span>
                      <span className="text-xs text-muted">{PHASE_LABEL[m.phase]}</span>
                      <RequirementTag level={m.requirement} />
                      {c.status !== 'publicado' ? <StatusPill status={c.status} /> : null}
                    </span>
                  }
                >
                  <ActionForm action={linkModule} row>
                    <input type="hidden" name="conteudo" value={c.id} />
                    <input type="hidden" name="modulo" value={moduleId} />
                    <Select label="Quando" name="fase" defaultValue={m.phase} options={PHASES} />
                    <Select label="Obrigatoriedade" name="obrigatoriedade" defaultValue={m.requirement} options={LEVELS} />
                    <Input label="Nota (opcional)" name="nota" defaultValue={m.note ?? ''} className="min-w-[14rem] flex-1" />
                  </ActionForm>
                  <div className="mt-3 flex flex-wrap gap-5">
                    <Link href={`/admin/conteudos/${c.id}`} className="text-xs font-semibold text-muted hover:text-ink hover:underline">
                      Abrir o conteúdo
                    </Link>
                    <ActionForm action={unlinkModule} submit="Retirar do módulo" quiet>
                      <input type="hidden" name="conteudo" value={c.id} />
                      <input type="hidden" name="modulo" value={moduleId} />
                    </ActionForm>
                  </div>
                </Editable>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum conteúdo da biblioteca ligado a este módulo.</p>
      )}
      {available.length ? (
        <AddPanel label="Ligar conteúdo da biblioteca">
          <ActionForm action={linkModule} submit="Ligar" row>
            <input type="hidden" name="modulo" value={moduleId} />
            <input type="hidden" name="novo" value="1" />
            <Select
              label="Conteúdo"
              name="conteudo"
              className="min-w-[18rem] flex-1"
              options={available.map((o) => [o.id, `${o.title} · ${KIND_LABEL[o.kind as ContentKind]}${o.status === 'rascunho' ? ' (rascunho)' : ''}`])}
            />
            <Select label="Quando" name="fase" defaultValue="antes" options={PHASES} />
            <Select label="Obrigatoriedade" name="obrigatoriedade" defaultValue="recomendado" options={LEVELS} />
          </ActionForm>
        </AddPanel>
      ) : (
        <p className="text-sm text-muted">
          Para ligar, crie o conteúdo em{' '}
          <Link href="/admin/conteudos/novo" className="underline">
            Aulas e conteúdos
          </Link>
          .
        </p>
      )}
    </>
  )
}
