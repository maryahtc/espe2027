'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { loadWorkflowEditor } from './load'
import { nextPosition, publishIssues, reorderPositions, WORKFLOW_LIMITS, type WorkflowItemKind } from './model'
import { workflowsReady } from './schema'

/**
 * Ações do editor de Workflows (Admin e Coordenação — o mesmo código nas duas áreas). Escrevem SÓ nas tabelas de
 * workflow; a garantia é a RLS da Parte 1 (workflow_editor). As conferências daqui servem para mensagens claras.
 */
export type ActionState = { erro?: string; aviso?: string } | undefined

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
const UUID = /^[0-9a-f-]{36}$/
const BASES = ['/admin/workflows', '/coordenacao/workflows'] as const

async function editor(): Promise<{ db: Db; role: string }> {
  const auth = await requireUser(['admin', 'coordenacao'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  if (!(await workflowsReady())) throw new Error('Os Workflows clínicos ainda não estão disponíveis neste banco.')
  return { db: supabase, role: auth.role }
}

async function run(fn: (ctx: { db: Db; role: string }) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const msg = await fn(await editor())
    revalidatePath('/admin/workflows', 'layout')
    revalidatePath('/coordenacao/workflows', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e // redirect/notFound do Next
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

/** Erros do banco → mensagens de gente. As regras dos gatilhos já falam português; restrições de coluna, não. */
function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new Error('Sem permissão para editar workflows.')
  if (error.code === '23505') {
    if (error.message.includes('workflows_procedure_active_key')) throw new Error('Este procedimento já tem um workflow ativo (rascunho ou publicado).')
    if (error.message.includes('workflow_stage_contents')) throw new Error('Este conteúdo já está nesta etapa.')
    throw new Error('Já existe um registro igual.')
  }
  if (error.code === '23514') {
    if (/violates check constraint/i.test(error.message)) throw new Error('Confira os campos: algum texto passou do tamanho permitido ou ficou vazio.')
    throw new Error(error.message)
  }
  if (error.code === '23503') throw new Error('Algo usado por esta ação não existe mais. Atualize a página.')
  throw new Error('Não foi possível salvar.')
}

const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max + 1) : ''
}
const id = (fd: FormData, k = 'id') => {
  const v = str(fd, k, 40)
  if (!UUID.test(v)) throw new Error('Ação inválida. Atualize a página.')
  return v
}
const dir = (fd: FormData) => (str(fd, 'dir', 4) === 'up' ? 'up' : 'down') as 'up' | 'down'
const base = (fd: FormData, role: string) => {
  const b = str(fd, 'base', 40)
  return (BASES as readonly string[]).includes(b) ? b : role === 'admin' ? BASES[0] : BASES[1]
}
function text(fd: FormData, k: string, label: string, max: number, required = true): string | null {
  const v = str(fd, k, max)
  if (!v) {
    if (required) throw new Error(`Preencha: ${label}.`)
    return null
  }
  if (v.length > max) throw new Error(`${label[0]!.toUpperCase()}${label.slice(1)}: no máximo ${max} caracteres.`)
  return v
}
const changed = (count: number | null) => {
  if (!count) throw new Error('Sem permissão para editar este workflow (ou ele não existe mais).')
}

async function stageOf(db: Db, stageId: string) {
  const { data } = await db.from('workflow_stages').select('id, workflow_id, name').eq('id', stageId).maybeSingle()
  if (!data) throw new Error('Etapa não encontrada. Atualize a página.')
  return data
}
async function workflowStatus(db: Db, workflowId: string) {
  const { data } = await db.from('workflows').select('status').eq('id', workflowId).maybeSingle()
  return data?.status ?? null
}

// ─── Workflow ──────────────────────────────────────────────────────────────────────────────────────

export async function createWorkflow(_: ActionState, fd: FormData): Promise<ActionState> {
  let to = ''
  const result = await run(async ({ db, role }) => {
    const procedureId = str(fd, 'procedimento', 40)
    if (!UUID.test(procedureId)) throw new Error('Escolha o procedimento do catálogo.')
    const summary = text(fd, 'descricao', 'descrição curta', WORKFLOW_LIMITS.summary, false)
    const { data: last } = await db.from('workflows').select('position').order('position', { ascending: false }).limit(1)
    const { data, error } = await db
      .from('workflows')
      .insert({ procedure_id: procedureId, summary, position: nextPosition(last ?? []) })
      .select('id')
      .single()
    fail(error)
    to = `${base(fd, role)}/${data!.id}?criado=1`
  })
  if (to && !result?.erro) redirect(to)
  return result
}

export async function saveWorkflow(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const summary = text(fd, 'descricao', 'descrição curta', WORKFLOW_LIMITS.summary, false)
    const { error, count } = await db.from('workflows').update({ summary }, { count: 'exact' }).eq('id', id(fd))
    fail(error)
    changed(count)
  }, 'Descrição salva.')
}

/** ↑ ↓ dentro da categoria do catálogo (a ordem entre categorias é a do catálogo). */
export async function moveWorkflow(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const wid = id(fd)
    const { data: rows } = await db
      .from('workflows')
      .select('id, position, procedures(category_id)')
      .returns<Array<{ id: string; position: number; procedures: { category_id: string } | null }>>()
    const me = (rows ?? []).find((r) => r.id === wid)
    if (!me) throw new Error('Workflow não encontrado.')
    const same = (rows ?? []).filter((r) => r.procedures?.category_id === me.procedures?.category_id)
    for (const r of reorderPositions(same, wid, dir(fd))) {
      const { error, count } = await db.from('workflows').update({ position: r.position }, { count: 'exact' }).eq('id', r.id)
      fail(error)
      changed(count)
    }
  }, 'Ordem salva.')
}

const STATUS = { publicar: 'publicado', despublicar: 'rascunho', arquivar: 'arquivado', restaurar: 'rascunho' } as const

export async function setWorkflowStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const wid = id(fd)
    const action = str(fd, 'para', 20) as keyof typeof STATUS
    const to = STATUS[action]
    if (!to) throw new Error('Ação inválida.')
    const w = await loadWorkflowEditor(wid)
    if (!w) throw new Error('Workflow não encontrado.')
    if (to === 'publicado') {
      const issues = publishIssues(w)
      if (issues.length) throw new Error(`Ainda não dá para publicar. ${issues.join(' ')}`)
    }
    const { error, count } = await db.from('workflows').update({ status: to }, { count: 'exact' }).eq('id', wid)
    fail(error)
    changed(count)
    if (to === 'publicado')
      return w.procedureActive
        ? 'Publicado. As alterações seguintes valem na hora.'
        : 'Publicado. O procedimento está desativado no catálogo: alunos só verão o workflow quando ele for reativado.'
    if (action === 'arquivar') return 'Arquivado. Saiu da lista dos alunos e liberou o procedimento para um novo workflow.'
    if (action === 'restaurar') return 'Restaurado como rascunho.'
    return 'Despublicado: voltou para rascunho e saiu da vista dos alunos.'
  })
}

export async function deleteWorkflow(_: ActionState, fd: FormData): Promise<ActionState> {
  let to = ''
  const result = await run(async ({ db, role }) => {
    const { error, count } = await db.from('workflows').delete({ count: 'exact' }).eq('id', id(fd))
    fail(error)
    if (!count) throw new Error('Só rascunho que nunca foi publicado pode ser excluído. Os demais são arquivados.')
    to = `${base(fd, role)}?excluido=1`
  })
  if (to && !result?.erro) redirect(to)
  return result
}

// ─── Etapas ────────────────────────────────────────────────────────────────────────────────────────

async function catalogStep(db: Db, fd: FormData, workflowId: string): Promise<string | null> {
  const v = str(fd, 'etapa_catalogo', 40)
  if (!v) return null
  if (!UUID.test(v)) throw new Error('Etapa do catálogo inválida.')
  const { data: w } = await db.from('workflows').select('procedure_id').eq('id', workflowId).maybeSingle()
  const { data: s } = await db.from('procedure_steps').select('procedure_id').eq('id', v).maybeSingle()
  if (!w || !s || s.procedure_id !== w.procedure_id) throw new Error('A etapa do catálogo precisa ser do mesmo procedimento.')
  return v
}

export async function addStage(_: ActionState, fd: FormData): Promise<ActionState> {
  let to = ''
  const result = await run(async ({ db, role }) => {
    const wid = id(fd, 'workflow')
    const name = text(fd, 'nome', 'nome da etapa', WORKFLOW_LIMITS.stageName)!
    const first = text(fd, 'primeiro_passo', 'primeiro passo', WORKFLOW_LIMITS.text, false)
    const stepId = await catalogStep(db, fd, wid)
    const status = await workflowStatus(db, wid)
    if (!status) throw new Error('Workflow não encontrado.')
    const { count: total } = await db.from('workflow_stages').select('id', { count: 'exact', head: true }).eq('workflow_id', wid)
    if ((total ?? 0) >= WORKFLOW_LIMITS.stages) throw new Error(`No máximo ${WORKFLOW_LIMITS.stages} etapas por workflow.`)
    let stageId: string
    if (first) {
      // Etapa + primeiro passo na mesma transação (obrigatório em workflow publicado).
      const { data, error } = await db.rpc('workflow_add_stage', { p_workflow_id: wid, p_name: name, p_first_step: first, p_procedure_step_id: stepId ?? undefined })
      fail(error)
      stageId = data as string
    } else {
      if (status === 'publicado') throw new Error('Workflow publicado: informe também o primeiro passo da nova etapa.')
      const { data: list } = await db.from('workflow_stages').select('position').eq('workflow_id', wid)
      const { data, error } = await db
        .from('workflow_stages')
        .insert({ workflow_id: wid, name, slug: '', procedure_step_id: stepId, position: nextPosition(list ?? []) })
        .select('id')
        .single()
      fail(error)
      stageId = data!.id
    }
    to = `${base(fd, role)}/${wid}/etapas/${stageId}?criada=1`
  })
  if (to && !result?.erro) redirect(to)
  return result
}

export async function saveStage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const stage = await stageOf(db, id(fd))
    const name = text(fd, 'nome', 'nome da etapa', WORKFLOW_LIMITS.stageName)!
    const stepId = await catalogStep(db, fd, stage.workflow_id)
    const { error, count } = await db.from('workflow_stages').update({ name, procedure_step_id: stepId }, { count: 'exact' }).eq('id', stage.id)
    fail(error)
    changed(count)
  }, 'Etapa salva.')
}

export async function moveStage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const stage = await stageOf(db, id(fd))
    const { data } = await db.from('workflow_stages').select('id, position').eq('workflow_id', stage.workflow_id)
    for (const r of reorderPositions(data ?? [], stage.id, dir(fd))) {
      const { error, count } = await db.from('workflow_stages').update({ position: r.position }, { count: 'exact' }).eq('id', r.id)
      fail(error)
      changed(count)
    }
  }, 'Ordem salva.')
}

export async function deleteStage(_: ActionState, fd: FormData): Promise<ActionState> {
  let to = ''
  const result = await run(async ({ db, role }) => {
    const stage = await stageOf(db, id(fd))
    if ((await workflowStatus(db, stage.workflow_id)) === 'publicado') {
      const { count } = await db.from('workflow_stages').select('id', { count: 'exact', head: true }).eq('workflow_id', stage.workflow_id)
      if ((count ?? 0) <= 1) throw new Error('Workflow publicado precisa de pelo menos uma etapa. Despublique para excluir a última.')
    }
    const { error, count } = await db.from('workflow_stages').delete({ count: 'exact' }).eq('id', stage.id)
    fail(error)
    changed(count)
    to = `${base(fd, role)}/${stage.workflow_id}?etapa_excluida=1`
  })
  if (to && !result?.erro) redirect(to)
  return result
}

// ─── Passo a passo, materiais e pontos de atenção ──────────────────────────────────────────────────

const KINDS: WorkflowItemKind[] = ['passo', 'material', 'atencao']
const KIND_LABEL: Record<WorkflowItemKind, string> = { passo: 'passo', material: 'material', atencao: 'ponto de atenção' }

export async function addItem(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const stage = await stageOf(db, id(fd, 'etapa'))
    const kind = str(fd, 'tipo', 10) as WorkflowItemKind
    if (!KINDS.includes(kind)) throw new Error('Tipo inválido.')
    const value = text(fd, 'texto', KIND_LABEL[kind], WORKFLOW_LIMITS.text)!
    const { data: list } = await db.from('workflow_stage_items').select('position').eq('stage_id', stage.id).eq('kind', kind)
    if ((list ?? []).length >= WORKFLOW_LIMITS.itemsPerKind) throw new Error(`No máximo ${WORKFLOW_LIMITS.itemsPerKind} itens deste tipo por etapa.`)
    const { error } = await db.from('workflow_stage_items').insert({ stage_id: stage.id, workflow_id: stage.workflow_id, kind, text: value, position: nextPosition(list ?? []) })
    fail(error)
  }, 'Adicionado.')
}

export async function saveItem(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const value = text(fd, 'texto', 'texto', WORKFLOW_LIMITS.text)!
    const { error, count } = await db.from('workflow_stage_items').update({ text: value }, { count: 'exact' }).eq('id', id(fd))
    fail(error)
    changed(count)
  })
}

export async function moveItem(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const iid = id(fd)
    const { data: me } = await db.from('workflow_stage_items').select('stage_id, kind').eq('id', iid).maybeSingle()
    if (!me) throw new Error('Item não encontrado.')
    const { data } = await db.from('workflow_stage_items').select('id, position').eq('stage_id', me.stage_id).eq('kind', me.kind)
    for (const r of reorderPositions(data ?? [], iid, dir(fd))) {
      const { error, count } = await db.from('workflow_stage_items').update({ position: r.position }, { count: 'exact' }).eq('id', r.id)
      fail(error)
      changed(count)
    }
  }, 'Ordem salva.')
}

export async function deleteItem(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const iid = id(fd)
    const { data: me } = await db.from('workflow_stage_items').select('stage_id, workflow_id, kind').eq('id', iid).maybeSingle()
    if (!me) throw new Error('Item não encontrado.')
    if (me.kind === 'passo' && (await workflowStatus(db, me.workflow_id)) === 'publicado') {
      const { count } = await db.from('workflow_stage_items').select('id', { count: 'exact', head: true }).eq('stage_id', me.stage_id).eq('kind', 'passo')
      if ((count ?? 0) <= 1) throw new Error('Workflow publicado: cada etapa precisa manter pelo menos um passo. Adicione outro antes de excluir este.')
    }
    const { error, count } = await db.from('workflow_stage_items').delete({ count: 'exact' }).eq('id', iid)
    fail(error)
    changed(count)
  }, 'Excluído.')
}

// ─── Próximos passos (só os cadastrados; nada é inferido) ──────────────────────────────────────────

async function nextFields(db: Db, fd: FormData, workflowId: string) {
  const label = text(fd, 'condicao', 'condição', WORKFLOW_LIMITS.label, false)
  const note = text(fd, 'orientacao', 'orientação', WORKFLOW_LIMITS.note, false)
  const target = str(fd, 'destino', 40) || null
  if (target) {
    if (!UUID.test(target)) throw new Error('Destino inválido.')
    const { data } = await db.from('workflow_stages').select('workflow_id').eq('id', target).maybeSingle()
    if (!data || data.workflow_id !== workflowId) throw new Error('O destino precisa ser uma etapa deste workflow.')
  }
  if (!target && !note) throw new Error('Escolha uma etapa de destino ou escreva uma orientação.')
  return { label, note, target_stage_id: target }
}

export async function addNext(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const stage = await stageOf(db, id(fd, 'etapa'))
    const fields = await nextFields(db, fd, stage.workflow_id)
    const { data: list } = await db.from('workflow_stage_next').select('position').eq('stage_id', stage.id)
    if ((list ?? []).length >= WORKFLOW_LIMITS.next) throw new Error(`No máximo ${WORKFLOW_LIMITS.next} próximos passos por etapa.`)
    const { error } = await db.from('workflow_stage_next').insert({ stage_id: stage.id, workflow_id: stage.workflow_id, ...fields, position: nextPosition(list ?? []) })
    fail(error)
  }, 'Próximo passo adicionado.')
}

export async function saveNext(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const nid = id(fd)
    const { data: me } = await db.from('workflow_stage_next').select('workflow_id').eq('id', nid).maybeSingle()
    if (!me) throw new Error('Próximo passo não encontrado.')
    const fields = await nextFields(db, fd, me.workflow_id)
    const { error, count } = await db.from('workflow_stage_next').update(fields, { count: 'exact' }).eq('id', nid)
    fail(error)
    changed(count)
  })
}

export async function moveNext(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const nid = id(fd)
    const { data: me } = await db.from('workflow_stage_next').select('stage_id').eq('id', nid).maybeSingle()
    if (!me) throw new Error('Próximo passo não encontrado.')
    const { data } = await db.from('workflow_stage_next').select('id, position').eq('stage_id', me.stage_id)
    for (const r of reorderPositions(data ?? [], nid, dir(fd))) {
      const { error, count } = await db.from('workflow_stage_next').update({ position: r.position }, { count: 'exact' }).eq('id', r.id)
      fail(error)
      changed(count)
    }
  }, 'Ordem salva.')
}

export async function deleteNext(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const { error, count } = await db.from('workflow_stage_next').delete({ count: 'exact' }).eq('id', id(fd))
    fail(error)
    changed(count)
  }, 'Excluído.')
}

// ─── Para aprofundar (Biblioteca: só referência) ───────────────────────────────────────────────────

export async function addContent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const stage = await stageOf(db, id(fd, 'etapa'))
    const contentId = str(fd, 'conteudo', 40)
    if (!UUID.test(contentId)) throw new Error('Escolha um conteúdo da Biblioteca.')
    const { data: list } = await db.from('workflow_stage_contents').select('position, content_id').eq('stage_id', stage.id)
    if ((list ?? []).some((l) => l.content_id === contentId)) throw new Error('Este conteúdo já está nesta etapa.')
    if ((list ?? []).length >= WORKFLOW_LIMITS.contents) throw new Error(`No máximo ${WORKFLOW_LIMITS.contents} conteúdos por etapa.`)
    const { error } = await db.from('workflow_stage_contents').insert({ stage_id: stage.id, workflow_id: stage.workflow_id, content_id: contentId, position: nextPosition(list ?? []) })
    if (error?.code === '42501' || error?.code === '23514') throw new Error('Este conteúdo não pode ser relacionado (precisa estar publicado e visível para você).')
    fail(error)
  }, 'Conteúdo relacionado.')
}

export async function moveContent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const lid = id(fd)
    const { data: me } = await db.from('workflow_stage_contents').select('stage_id').eq('id', lid).maybeSingle()
    if (!me) throw new Error('Vínculo não encontrado.')
    const { data } = await db.from('workflow_stage_contents').select('id, position').eq('stage_id', me.stage_id)
    for (const r of reorderPositions(data ?? [], lid, dir(fd))) {
      const { error, count } = await db.from('workflow_stage_contents').update({ position: r.position }, { count: 'exact' }).eq('id', r.id)
      fail(error)
      changed(count)
    }
  }, 'Ordem salva.')
}

export async function removeContent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const { error, count } = await db.from('workflow_stage_contents').delete({ count: 'exact' }).eq('id', id(fd))
    fail(error)
    changed(count)
  }, 'Vínculo removido.')
}
