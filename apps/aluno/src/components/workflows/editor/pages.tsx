import { notFound } from 'next/navigation'
import type { Role } from '@/lib/auth/flow'
import { editorGate } from '@/lib/workflows/gate'
import { contentChoices, loadWorkflowEditor, loadWorkflowList, procedureChoices } from '@/lib/workflows/load'
import { EditorNotice } from './EditorNotice'
import { NewWorkflowView } from './NewWorkflowView'
import { StageEditorView } from './StageEditorView'
import { WorkflowEditorView } from './WorkflowEditorView'
import { WorkflowListView } from './WorkflowListView'

/**
 * As mesmas telas do editor em /admin/workflows e /coordenacao/workflows: cada rota só informa a base, o papel aceito
 * e o rótulo. Banco sem a Etapa 9 → aviso, sem consultar as tabelas novas.
 */
export type Area = { base: string; roles: Role[]; eyebrow: string }
export const ADMIN_AREA: Area = { base: '/admin/workflows', roles: ['admin'], eyebrow: 'Clínica' }
export const COORD_AREA: Area = { base: '/coordenacao/workflows', roles: ['coordenacao', 'admin'], eyebrow: 'Coordenação' }

type Search = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

export async function WorkflowListPage({ area, searchParams }: { area: Area; searchParams: Search }) {
  const gate = await editorGate(area.roles)
  if (gate.state !== 'ok') return <EditorNotice state={gate.state} eyebrow={area.eyebrow} />
  const status = one(searchParams.status)
  return (
    <WorkflowListView
      base={area.base}
      eyebrow={area.eyebrow}
      list={await loadWorkflowList()}
      query={one(searchParams.q).slice(0, 80)}
      status={['rascunho', 'publicado', 'arquivado'].includes(status) ? status : ''}
      deleted={one(searchParams.excluido) === '1'}
    />
  )
}

export async function NewWorkflowPage({ area }: { area: Area }) {
  const gate = await editorGate(area.roles)
  if (gate.state !== 'ok') return <EditorNotice state={gate.state} eyebrow={area.eyebrow} />
  return <NewWorkflowView base={area.base} eyebrow={area.eyebrow} choices={await procedureChoices()} />
}

export async function WorkflowEditorPage({ area, id, searchParams }: { area: Area; id: string; searchParams: Search }) {
  const gate = await editorGate(area.roles)
  if (gate.state !== 'ok') return <EditorNotice state={gate.state} eyebrow={area.eyebrow} />
  const w = await loadWorkflowEditor(id)
  if (!w) notFound()
  const flash = one(searchParams.criado) ? 'Rascunho criado. Agora adicione as etapas clínicas.' : one(searchParams.etapa_excluida) ? 'Etapa excluída.' : null
  return <WorkflowEditorView base={area.base} eyebrow={area.eyebrow} w={w} flash={flash} />
}

export async function StageEditorPage({ area, id, stageId, searchParams }: { area: Area; id: string; stageId: string; searchParams: Search }) {
  const gate = await editorGate(area.roles)
  if (gate.state !== 'ok') return <EditorNotice state={gate.state} eyebrow={area.eyebrow} />
  const [w, contents] = await Promise.all([loadWorkflowEditor(id), contentChoices()])
  const stage = w?.stages.find((s) => s.id === stageId)
  if (!w || !stage) notFound()
  return (
    <StageEditorView
      base={area.base}
      eyebrow={area.eyebrow}
      w={w}
      stage={stage}
      contents={contents}
      flash={one(searchParams.criada) ? 'Etapa criada. Agora preencha o passo a passo e o que mais for útil.' : null}
    />
  )
}
