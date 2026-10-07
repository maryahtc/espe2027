'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'

/**
 * Ações do painel para turmas, módulos e docentes. Todas exigem admin (requireUser) e gravam com a
 * sessão do admin — a RLS confere de novo no banco, e o histórico (change_log) registra quem mudou o quê.
 */
export type ActionState = { erro?: string; aviso?: string } | undefined

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

async function admin(): Promise<Db> {
  const auth = await requireUser(['admin'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  return supabase
}

/** Executa, traduz erros para mensagens e atualiza as telas (admin e aluno). */
async function run(fn: (db: Db) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const db = await admin()
    const msg = await fn(db)
    revalidatePath('/', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e // redirect/notFound do Next
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

function fail(error: { code?: string; message: string } | null, what = 'salvar') {
  if (!error) return
  if (error.code === '23505') throw new Error('Já existe um registro igual (ex.: o mesmo dia ou a mesma pessoa duas vezes).')
  if (error.code === '23514') throw new Error('Algum valor está fora do permitido (ex.: horário de fim antes do início).')
  if (error.code === '23503') throw new Error('Este registro está em uso em outro lugar e não pode ser removido.')
  if (error.code === '42501') throw new Error('Sem permissão para esta ação.')
  throw new Error(`Não foi possível ${what}.`)
}

// ─── Leitura do formulário ────────────────────────────────────────────────────────────────────────
function text(fd: FormData, k: string, max = 500): string {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function opt(fd: FormData, k: string, max = 4000): string | null {
  return text(fd, k, max) || null
}
function req(fd: FormData, k: string, label: string, max = 500): string {
  const v = text(fd, k, max)
  if (!v) throw new Error(`Preencha: ${label}.`)
  return v
}
function id(fd: FormData, k = 'id'): string {
  const v = text(fd, k, 40)
  if (!/^[0-9a-f-]{36}$/.test(v)) throw new Error('Registro inválido.')
  return v
}
function optId(fd: FormData, k: string): string | null {
  const v = text(fd, k, 40)
  return /^[0-9a-f-]{36}$/.test(v) ? v : null
}
function date(fd: FormData, k: string, label: string): string {
  const v = text(fd, k, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`Informe a data: ${label}.`)
  return v
}
function optDate(fd: FormData, k: string): string | null {
  const v = text(fd, k, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}
function optTime(fd: FormData, k: string): string | null {
  const v = text(fd, k, 5)
  return /^\d{2}:\d{2}$/.test(v) ? v : null
}
function optInt(fd: FormData, k: string): number | null {
  const v = text(fd, k, 6)
  if (!v) return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new Error('Número inválido.')
  return n
}
function optNum(fd: FormData, k: string): number | null {
  const v = text(fd, k, 8).replace(',', '.')
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new Error('Carga horária inválida.')
  return n
}
function oneOf<T extends string>(fd: FormData, k: string, allowed: readonly T[], fallback?: T): T {
  const v = text(fd, k, 40) as T
  if (allowed.includes(v)) return v
  if (fallback) return fallback
  throw new Error('Opção inválida.')
}
const checked = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'sim'

const STATUSES = ['rascunho', 'publicado', 'arquivado'] as const
const PERIODS = ['manha', 'tarde', 'noite', 'dia_todo'] as const
const TYPES = ['teorica', 'pratica', 'hands_on', 'clinica', 'demonstracao', 'discussao_caso', 'online', 'outro'] as const
const STAFF_ROLES = ['principal', 'docente', 'equipe_clinica', 'coordenacao', 'apoio'] as const
const FACULTY_KINDS = ['docente', 'equipe_clinica', 'convidado', 'coordenacao', 'apoio'] as const
const PHASES = ['antes', 'durante', 'depois'] as const
const LEVELS = ['obrigatorio', 'recomendado', 'complementar'] as const
const EVENT_KINDS = ['online', 'clinica', 'prazo', 'outro'] as const

function slugify(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'turma'
  )
}

// ─── Turmas ───────────────────────────────────────────────────────────────────────────────────────
export async function createCohort(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = ''
  const state = await run(async (db) => {
    const name = req(fd, 'nome', 'nome da turma', 120)
    const startsOn = date(fd, 'inicio', 'início')
    const endsOn = date(fd, 'fim', 'previsão de conclusão')
    if (endsOn < startsOn) throw new Error('A conclusão precisa ser depois do início.')
    const copyFrom = optId(fd, 'copiar_de')
    const { data, error } = await db
      .from('cohorts')
      .insert({ name, slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`, starts_on: startsOn, ends_on: endsOn, description: opt(fd, 'descricao') })
      .select('id')
      .single()
    fail(error, 'criar a turma')
    newId = data!.id
    if (copyFrom) {
      const { data: src } = await db.from('cohorts').select('starts_on').eq('id', copyFrom).single()
      const shift = src ? Math.round((Date.parse(startsOn) - Date.parse(src.starts_on)) / 86_400_000) : 0
      const { data: n, error: e2 } = await db.rpc('copy_cohort_structure', { p_source: copyFrom, p_target: newId, p_shift_days: shift })
      fail(e2, 'copiar os módulos')
      return `Turma criada com ${n} módulos copiados como rascunho.`
    }
    return 'Turma criada.'
  })
  if (newId && !state?.erro) redirect(`/admin/turmas/${newId}`)
  return state
}

export async function updateCohort(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const startsOn = date(fd, 'inicio', 'início')
    const endsOn = date(fd, 'fim', 'previsão de conclusão')
    if (endsOn < startsOn) throw new Error('A conclusão precisa ser depois do início.')
    const { error } = await db
      .from('cohorts')
      .update({ name: req(fd, 'nome', 'nome da turma', 120), starts_on: startsOn, ends_on: endsOn, description: opt(fd, 'descricao') })
      .eq('id', id(fd))
    fail(error)
  })
}

export async function setCohortStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const status = oneOf(fd, 'status', ['ativa', 'encerrada'] as const)
    const { error } = await db.from('cohorts').update({ status }).eq('id', id(fd))
    fail(error)
    return status === 'encerrada' ? 'Turma encerrada. Os alunos continuam com acesso ao histórico.' : 'Turma reaberta.'
  })
}

// ─── Eventos da turma ─────────────────────────────────────────────────────────────────────────────
export async function saveEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = {
      date: date(fd, 'data', 'data do evento'),
      starts_at: optTime(fd, 'hora'),
      title: req(fd, 'titulo', 'título', 200),
      description: opt(fd, 'descricao'),
      kind: oneOf(fd, 'tipo', EVENT_KINDS, 'outro'),
      status: oneOf(fd, 'status', STATUSES, 'rascunho'),
    }
    const eventId = optId(fd, 'id')
    const { error } = eventId
      ? await db.from('cohort_events').update(row).eq('id', eventId)
      : await db.from('cohort_events').insert({ ...row, cohort_id: id(fd, 'turma') })
    fail(error)
  })
}

export async function deleteEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('cohort_events').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Evento removido.')
}

// ─── Docentes e equipe ────────────────────────────────────────────────────────────────────────────
export async function saveFaculty(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const fullName = req(fd, 'nome', 'nome completo', 120)
    const row = {
      full_name: fullName,
      display_name: text(fd, 'exibicao', 60) || fullName,
      honorific: opt(fd, 'tratamento', 20),
      kind: oneOf(fd, 'tipo', FACULTY_KINDS, 'docente'),
      specialty: opt(fd, 'especialidade', 120),
      short_bio: opt(fd, 'bio', 800),
      active: fd.has('ativo') ? fd.getAll('ativo').includes('on') : true,
    }
    const facultyId = optId(fd, 'id')
    const { error } = facultyId ? await db.from('faculty').update(row).eq('id', facultyId) : await db.from('faculty').insert(row)
    fail(error)
    return facultyId ? 'Cadastro atualizado em todos os módulos.' : 'Pessoa cadastrada.'
  })
}

// ─── Módulos ──────────────────────────────────────────────────────────────────────────────────────
export async function createModule(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = ''
  const state = await run(async (db) => {
    const cohortId = id(fd, 'turma')
    const { data: last } = await db.from('modules').select('position').eq('cohort_id', cohortId).order('position', { ascending: false }).limit(1)
    const number = optInt(fd, 'numero')
    const { data, error } = await db
      .from('modules')
      .insert({ cohort_id: cohortId, position: (last?.[0]?.position ?? 0) + 1, number, title: text(fd, 'titulo', 200) || `Módulo ${number ?? ''}`.trim() })
      .select('id')
      .single()
    fail(error, 'criar o módulo')
    newId = data!.id
  })
  if (newId && !state?.erro) redirect(`/admin/modulos/${newId}`)
  return state
}

export async function updateModuleInfo(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    // Cada bloco do editor envia só os próprios campos; o resto não é tocado.
    const fields: Record<string, () => unknown> = {
      numero: () => ({ number: optInt(fd, 'numero') }),
      titulo: () => ({ title: req(fd, 'titulo', 'título', 200) }),
      tema: () => ({ theme: opt(fd, 'tema', 300) }),
      descricao: () => ({ description: opt(fd, 'descricao') }),
      local: () => ({ location: opt(fd, 'local', 200) }),
      carga: () => ({ workload_hours: optNum(fd, 'carga') }),
      preparacao: () => ({ preparation: opt(fd, 'preparacao') }),
      obs_materiais: () => ({ materials_notes: opt(fd, 'obs_materiais') }),
    }
    const update = Object.assign({}, ...Object.entries(fields).filter(([k]) => fd.has(k)).map(([, f]) => f()))
    const { error } = await db.from('modules').update(update).eq('id', id(fd))
    fail(error)
  })
}

export async function setModuleStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const status = oneOf(fd, 'status', STATUSES)
    const { error } = await db.from('modules').update({ status }).eq('id', id(fd))
    fail(error)
    return status === 'publicado' ? 'Publicado: os alunos da turma já veem este módulo.' : status === 'arquivado' ? 'Arquivado: saiu da vista dos alunos; nada foi apagado.' : 'Voltou a rascunho: invisível para os alunos.'
  })
}

export async function deleteDraftModule(_: ActionState, fd: FormData): Promise<ActionState> {
  let cohortId = ''
  const state = await run(async (db) => {
    const moduleId = id(fd)
    const { data } = await db.from('modules').select('cohort_id, published_at').eq('id', moduleId).single()
    if (!data || data.published_at) throw new Error('Módulo que já foi publicado não pode ser excluído; use Arquivar.')
    cohortId = data.cohort_id
    const { error, count } = await db.from('modules').delete({ count: 'exact' }).eq('id', moduleId)
    fail(error, 'excluir')
    if (!count) throw new Error('Não foi possível excluir.')
  })
  if (cohortId && !state?.erro) redirect(`/admin/modulos?turma=${cohortId}`)
  return state
}

/** Sobe/desce um módulo na sequência (troca de posição com o vizinho). */
export async function moveModule(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const moduleId = id(fd)
    const dir = text(fd, 'direcao') === 'acima' ? -1 : 1
    const { data: m } = await db.from('modules').select('cohort_id, position').eq('id', moduleId).single()
    if (!m) throw new Error('Módulo não encontrado.')
    const { data: list } = await db.from('modules').select('id, position').eq('cohort_id', m.cohort_id).order('position')
    const ordered = list ?? []
    const i = ordered.findIndex((x) => x.id === moduleId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ordered.length) return 'Já está na ponta.'
    // Renumera as posições em sequência para não depender de valores repetidos.
    const swapped = [...ordered]
    ;[swapped[i], swapped[j]] = [swapped[j]!, swapped[i]!]
    for (const [k, row] of swapped.entries()) {
      if (row.position !== k + 1) {
        const { error } = await db.from('modules').update({ position: k + 1 }).eq('id', row.id)
        fail(error, 'reordenar')
      }
    }
    return 'Ordem atualizada.'
  })
}

export async function saveInternalNotes(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_internal_notes').upsert({ module_id: id(fd, 'modulo'), notes: text(fd, 'notas', 8000) })
    fail(error)
  })
}

// ─── Dias e programação ───────────────────────────────────────────────────────────────────────────
export async function saveDay(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = { date: date(fd, 'data', 'data do dia'), label: opt(fd, 'rotulo', 60), note: opt(fd, 'nota', 500) }
    const dayId = optId(fd, 'id')
    const { error } = dayId ? await db.from('module_days').update(row).eq('id', dayId) : await db.from('module_days').insert({ ...row, module_id: id(fd, 'modulo') })
    fail(error)
  })
}

export async function deleteDay(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_days').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Dia removido (com as atividades dele).')
}

export async function saveSession(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = {
      period: oneOf(fd, 'turno', PERIODS),
      starts_at: optTime(fd, 'inicio'),
      ends_at: optTime(fd, 'fim'),
      title: req(fd, 'titulo', 'atividade', 300),
      description: opt(fd, 'descricao', 2000),
      activity_type: oneOf(fd, 'tipo', TYPES, 'outro'),
    }
    const sessionId = optId(fd, 'id')
    if (sessionId) {
      const { error } = await db.from('module_sessions').update(row).eq('id', sessionId)
      fail(error)
    } else {
      const dayId = id(fd, 'dia')
      const { data: day } = await db.from('module_days').select('module_id').eq('id', dayId).single()
      if (!day) throw new Error('Dia não encontrado.')
      const { count } = await db.from('module_sessions').select('id', { count: 'exact', head: true }).eq('day_id', dayId)
      const { error } = await db.from('module_sessions').insert({ ...row, day_id: dayId, module_id: day.module_id, position: (count ?? 0) + 1 })
      fail(error)
    }
  })
}

export async function deleteSession(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_sessions').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Atividade removida.')
}

export async function addSessionFaculty(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const sessionId = id(fd, 'atividade')
    const { data: s } = await db.from('module_sessions').select('module_id').eq('id', sessionId).single()
    if (!s) throw new Error('Atividade não encontrada.')
    const { error } = await db
      .from('session_faculty')
      .insert({ session_id: sessionId, module_id: s.module_id, faculty_id: id(fd, 'docente'), tentative: checked(fd, 'a_confirmar') })
    fail(error)
  }, 'Professor vinculado.')
}

export async function updateSessionFaculty(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const q = db.from('session_faculty')
    const where = { session_id: id(fd, 'atividade'), faculty_id: id(fd, 'docente') }
    const { error } = text(fd, 'acao') === 'remover' ? await q.delete().match(where) : await q.update({ tentative: checked(fd, 'a_confirmar') }).match(where)
    fail(error)
  })
}

// ─── Equipe do módulo ─────────────────────────────────────────────────────────────────────────────
export async function saveStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = {
      role: oneOf(fd, 'papel', STAFF_ROLES, 'equipe_clinica'),
      visible_to_students: checked(fd, 'visivel'),
      tentative: checked(fd, 'a_confirmar'),
    }
    const staffId = optId(fd, 'id')
    if (staffId) {
      const { error } = await db.from('module_staff').update(row).eq('id', staffId)
      fail(error)
    } else {
      const moduleId = id(fd, 'modulo')
      const { count } = await db.from('module_staff').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      const { error } = await db.from('module_staff').insert({ ...row, module_id: moduleId, faculty_id: id(fd, 'docente'), position: (count ?? 0) + 1 })
      fail(error)
    }
  })
}

export async function removeStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_staff').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Removido da equipe do módulo.')
}

// ─── Materiais, entregas e recursos ───────────────────────────────────────────────────────────────
export async function saveMaterial(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = {
      group_label: text(fd, 'grupo', 80) || 'Geral',
      item: req(fd, 'item', 'item', 300),
      note: opt(fd, 'nota', 300),
      required: !checked(fd, 'opcional'),
      day_id: optId(fd, 'dia'),
    }
    const materialId = optId(fd, 'id')
    if (materialId) {
      const { error } = await db.from('module_materials').update(row).eq('id', materialId)
      fail(error)
    } else {
      const moduleId = id(fd, 'modulo')
      const { count } = await db.from('module_materials').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      const { error } = await db.from('module_materials').insert({ ...row, module_id: moduleId, position: (count ?? 0) + 1 })
      fail(error)
    }
  })
}

export async function deleteMaterial(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_materials').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Item removido.')
}

export async function saveDeliverable(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const row = {
      title: req(fd, 'titulo', 'título', 300),
      description: opt(fd, 'descricao', 2000),
      due_date: optDate(fd, 'prazo'),
      phase: oneOf(fd, 'fase', PHASES, 'durante'),
    }
    const deliverableId = optId(fd, 'id')
    if (deliverableId) {
      const { error } = await db.from('module_deliverables').update(row).eq('id', deliverableId)
      fail(error)
    } else {
      const moduleId = id(fd, 'modulo')
      const { count } = await db.from('module_deliverables').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      const { error } = await db.from('module_deliverables').insert({ ...row, module_id: moduleId, position: (count ?? 0) + 1 })
      fail(error)
    }
  })
}

export async function deleteDeliverable(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_deliverables').delete().eq('id', id(fd))
    fail(error, 'remover')
  }, 'Entrega removida.')
}

function availableFrom(fd: FormData): string | null {
  const d = optDate(fd, 'liberar_data')
  if (!d) return null
  const t = optTime(fd, 'liberar_hora') ?? '00:00'
  return `${d}T${t}:00-03:00`
}

export async function saveResource(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const kind = oneOf(fd, 'tipo', ['link', 'arquivo', 'texto'] as const)
    const url = kind === 'link' ? req(fd, 'url', 'endereço do link', 2000) : null
    if (url && !/^https?:\/\//i.test(url)) throw new Error('O link precisa começar com http:// ou https://.')
    const row = {
      kind,
      title: req(fd, 'titulo', 'título', 300),
      description: opt(fd, 'descricao', 2000),
      url,
      body: kind === 'texto' ? req(fd, 'texto', 'texto', 20000) : null,
      phase: oneOf(fd, 'fase', PHASES, 'antes'),
      requirement: oneOf(fd, 'obrigatoriedade', LEVELS, 'recomendado'),
      available_from: availableFrom(fd),
      status: oneOf(fd, 'status', STATUSES, 'rascunho'),
      session_id: optId(fd, 'atividade'),
    }
    const resourceId = optId(fd, 'id')
    if (resourceId) {
      // O arquivo de um recurso existente não muda por aqui (remova e envie outro).
      const { error } = await db.from('module_resources').update(row).eq('id', resourceId)
      fail(error)
    } else {
      const moduleId = id(fd, 'modulo')
      const filePath = kind === 'arquivo' ? req(fd, 'arquivo_path', 'arquivo', 500) : null
      if (filePath && !filePath.startsWith(`${moduleId}/`)) throw new Error('Arquivo inválido.')
      const { count } = await db.from('module_resources').select('id', { count: 'exact', head: true }).eq('module_id', moduleId)
      const { error } = await db.from('module_resources').insert({ ...row, file_path: filePath, module_id: moduleId, position: (count ?? 0) + 1 })
      fail(error)
    }
  })
}

export async function deleteResource(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const resourceId = id(fd)
    const { data } = await db.from('module_resources').select('file_path').eq('id', resourceId).single()
    const { error } = await db.from('module_resources').delete().eq('id', resourceId)
    fail(error, 'remover')
    if (data?.file_path) {
      const { count } = await db.from('module_resources').select('id', { count: 'exact', head: true }).eq('file_path', data.file_path)
      if (!count) await db.storage.from('module-files').remove([data.file_path])
    }
  }, 'Removido.')
}

/** Upload direto do navegador para o armazenamento privado: o servidor só autoriza (link de envio de uso único). */
export async function prepareUpload(moduleId: string, fileName: string): Promise<{ path: string; token: string } | { erro: string }> {
  try {
    const db = await admin()
    if (!/^[0-9a-f-]{36}$/.test(moduleId)) return { erro: 'Módulo inválido.' }
    const safe = fileName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(-80)
    const path = `${moduleId}/${crypto.randomUUID()}-${safe}`
    const { data, error } = await db.storage.from('module-files').createSignedUploadUrl(path)
    if (error || !data) return { erro: 'Não foi possível preparar o envio.' }
    return { path: data.path, token: data.token }
  } catch {
    return { erro: 'Sem permissão.' }
  }
}

// ─── Pessoas (dados permitidos) ───────────────────────────────────────────────────────────────────
export async function adminUpdatePerson(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const userId = id(fd)
    const fullName = req(fd, 'nome', 'nome completo', 120)
    const { error } = await db
      .from('profiles')
      .update({ full_name: fullName, display_name: opt(fd, 'exibicao', 60), role: oneOf(fd, 'papel', ['aluno', 'coordenacao', 'admin'] as const) })
      .eq('id', userId)
    if (error?.code === '42501') throw new Error('Apenas admin altera papéis.')
    if (error) throw new Error(error.message.includes('último admin') ? 'Não é possível remover o último admin.' : 'Não foi possível salvar.')

    const cohortId = optId(fd, 'turma')
    const status = oneOf(fd, 'situacao', ['ativa', 'inativa'] as const, 'ativa')
    const roleInCohort = text(fd, 'papel') === 'coordenacao' ? 'coordenacao' : 'aluno'
    if (cohortId) {
      // Mantém uma matrícula por pessoa nesta fase: troca de turma move a matrícula existente.
      const { data: current } = await db.from('enrollments').select('cohort_id').eq('user_id', userId)
      const other = (current ?? []).filter((e) => e.cohort_id !== cohortId)
      if ((current ?? []).some((e) => e.cohort_id === cohortId)) {
        const { error: e2 } = await db.from('enrollments').update({ status, role_in_cohort: roleInCohort }).match({ user_id: userId, cohort_id: cohortId })
        fail(e2)
      } else {
        const { error: e3 } = await db.from('enrollments').insert({ user_id: userId, cohort_id: cohortId, status, role_in_cohort: roleInCohort })
        fail(e3)
      }
      for (const o of other) {
        const { error: e4 } = await db.from('enrollments').update({ status: 'inativa' }).match({ user_id: userId, cohort_id: o.cohort_id })
        fail(e4)
      }
    }
    return 'Dados atualizados.'
  })
}
