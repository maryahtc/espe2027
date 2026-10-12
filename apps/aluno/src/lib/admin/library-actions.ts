'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { KINDS, parseSynonyms, slugify } from '@/lib/library/model'

/**
 * Ações do painel para Áreas, Temas e Biblioteca. Todas exigem admin e gravam com a sessão do admin —
 * a RLS confere de novo no banco, e o histórico registra quem mudou o quê. Nada é apagado de verdade
 * (arquivar), exceto rascunho nunca publicado e vínculos.
 */
export type ActionState = { erro?: string; aviso?: string } | undefined

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
const UUID = /^[0-9a-f-]{36}$/

async function admin(): Promise<Db> {
  const auth = await requireUser(['admin'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  return supabase
}

async function run(fn: (db: Db) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const db = await admin()
    const msg = await fn(db)
    revalidatePath('/', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

function fail(error: { code?: string; message: string } | null, what = 'salvar') {
  if (!error) return
  if (error.code === '23505') throw new Error('Já existe um registro com esse nome.')
  if (error.code === '23514') throw new Error('Algum valor está fora do permitido (ex.: link sem http/https).')
  if (error.code === '23503') throw new Error('Este registro está em uso em outro lugar e não pode ser removido.')
  if (error.code === '42501') throw new Error('Sem permissão para esta ação.')
  if (error.code === 'P0001') throw new Error(error.message)
  throw new Error(`Não foi possível ${what}.`)
}

const text = (fd: FormData, k: string, max = 500) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const opt = (fd: FormData, k: string, max = 4000) => text(fd, k, max) || null
function req(fd: FormData, k: string, label: string, max = 300): string {
  const v = text(fd, k, max)
  if (!v) throw new Error(`Preencha: ${label}.`)
  return v
}
function id(fd: FormData, k = 'id'): string {
  const v = text(fd, k, 40)
  if (!UUID.test(v)) throw new Error('Registro inválido.')
  return v
}
const ids = (fd: FormData, k: string) => [...new Set(fd.getAll(k).map(String).filter((v) => UUID.test(v)))]
function optUrl(fd: FormData, k: string): string | null {
  const v = text(fd, k, 2000)
  if (!v) return null
  if (!/^https?:\/\/\S+$/i.test(v)) throw new Error('O link precisa começar com http:// ou https://')
  return v
}

/** Slug único na tabela (acrescenta -2, -3… se já existir). */
async function uniqueSlug(db: Db, table: 'categories' | 'topics' | 'contents', base: string): Promise<string> {
  const root = slugify(base)
  const { data } = await db.from(table).select('slug').like('slug', `${root}%`)
  const used = new Set((data ?? []).map((r) => r.slug))
  let slug = root
  for (let i = 2; used.has(slug); i++) slug = `${root}-${i}`
  return slug
}

// ─── Áreas ─────────────────────────────────────────────────────────────────────────────────────────
export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const name = req(fd, 'nome', 'nome da área', 80)
    const position = Number(text(fd, 'posicao', 4)) || 0
    const existing = text(fd, 'id', 40)
    if (existing) {
      const { error } = await db.from('categories').update({ name, position }).eq('id', id(fd))
      fail(error)
      return 'Área salva.'
    }
    const { error } = await db.from('categories').insert({ name, position, slug: await uniqueSlug(db, 'categories', name) })
    fail(error, 'criar a área')
    return 'Área criada.'
  })
}

export async function setCategoryArchived(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const archive = text(fd, 'arquivar', 3) === 'sim'
    const categoryId = id(fd)
    if (archive) {
      const { count } = await db.from('topics').select('id', { count: 'exact', head: true }).eq('category_id', categoryId).is('archived_at', null)
      if (count) throw new Error('Mova ou arquive os temas desta área antes de arquivá-la.')
    }
    const { error } = await db.from('categories').update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', categoryId)
    fail(error)
    return archive ? 'Área arquivada.' : 'Área restaurada.'
  })
}

// ─── Temas ─────────────────────────────────────────────────────────────────────────────────────────
export async function saveTopic(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const name = req(fd, 'nome', 'nome do tema', 120)
    const row = {
      name,
      category_id: id(fd, 'area'),
      description: opt(fd, 'descricao', 1000),
      synonyms: parseSynonyms(text(fd, 'sinonimos', 2000), name),
    }
    const origin = text(fd, 'origem', 1000)
    let topicId = text(fd, 'id', 40)
    if (topicId) {
      if (!UUID.test(topicId)) throw new Error('Registro inválido.')
      const { error } = await db.from('topics').update(row).eq('id', topicId)
      fail(error)
    } else {
      const { data, error } = await db.from('topics').insert({ ...row, slug: await uniqueSlug(db, 'topics', name) }).select('id').single()
      fail(error, 'criar o tema')
      topicId = data!.id
    }
    const { error: e2 } = await db.from('topic_notes').upsert({ topic_id: topicId, origin })
    fail(e2, 'salvar a origem')
    return fd.get('id') ? 'Tema salvo.' : 'Tema criado.'
  })
}

export async function setTopicArchived(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const archive = text(fd, 'arquivar', 3) === 'sim'
    const { error } = await db
      .from('topics')
      .update({ archived_at: archive ? new Date().toISOString() : null, ...(archive ? {} : { merged_into: null }) })
      .eq('id', id(fd))
    fail(error)
    return archive ? 'Tema arquivado. Os conteúdos continuam com ele no histórico.' : 'Tema restaurado.'
  })
}

export async function mergeTopic(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { data, error } = await db.rpc('merge_topics', { p_from: id(fd), p_into: id(fd, 'destino') })
    fail(error, 'juntar os temas')
    return `Temas juntados. ${data ?? 0} conteúdo(s) passaram para o tema que ficou.`
  })
}

// ─── Conteúdos ─────────────────────────────────────────────────────────────────────────────────────
export async function createContent(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = ''
  const state = await run(async (db) => {
    const title = req(fd, 'titulo', 'título', 200)
    const kind = text(fd, 'tipo', 20)
    if (!(KINDS as string[]).includes(kind)) throw new Error('Escolha o tipo.')
    const { data, error } = await db
      .from('contents')
      .insert({ title, kind: kind as (typeof KINDS)[number], category_id: id(fd, 'area'), slug: await uniqueSlug(db, 'contents', title) })
      .select('id')
      .single()
    fail(error, 'criar o conteúdo')
    newId = data!.id
  })
  if (newId && !state?.erro) redirect(`/admin/conteudos/${newId}`)
  return state
}

function releaseAt(fd: FormData): string | null {
  const d = text(fd, 'liberar_data', 10)
  if (!d) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Data de liberação inválida.')
  const t = /^\d{2}:\d{2}$/.test(text(fd, 'liberar_hora', 5)) ? text(fd, 'liberar_hora', 5) : '00:00'
  return `${d}T${t}:00-03:00`
}

export async function updateContent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const kind = text(fd, 'tipo', 20)
    if (!(KINDS as string[]).includes(kind)) throw new Error('Escolha o tipo.')
    const mins = text(fd, 'duracao', 5)
    const duration = mins ? Number(mins) : null
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) throw new Error('Duração em minutos inválida.')
    const { error } = await db
      .from('contents')
      .update({
        kind: kind as (typeof KINDS)[number],
        title: req(fd, 'titulo', 'título', 200),
        description: opt(fd, 'descricao', 6000),
        category_id: id(fd, 'area'),
        citation: opt(fd, 'referencia', 2000),
        url: optUrl(fd, 'link'),
        duration_seconds: duration ? duration * 60 : null,
        available_from: releaseAt(fd),
      })
      .eq('id', id(fd))
    fail(error)
  })
}

export async function setContentTopics(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const contentId = id(fd)
    const wanted = ids(fd, 'temas')
    const { data: current } = await db.from('content_topics').select('topic_id').eq('content_id', contentId)
    const have = new Set((current ?? []).map((c) => c.topic_id))
    const add = wanted.filter((t) => !have.has(t))
    const remove = [...have].filter((t) => !wanted.includes(t))
    if (add.length) fail((await db.from('content_topics').insert(add.map((topic_id) => ({ content_id: contentId, topic_id })))).error)
    if (remove.length) fail((await db.from('content_topics').delete().eq('content_id', contentId).in('topic_id', remove)).error)
    return 'Temas salvos.'
  })
}

export async function setContentFaculty(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const contentId = id(fd)
    const wanted = ids(fd, 'docentes')
    const { data: current } = await db.from('content_faculty').select('faculty_id').eq('content_id', contentId)
    const have = new Set((current ?? []).map((c) => c.faculty_id))
    const add = wanted.filter((f) => !have.has(f))
    const remove = [...have].filter((f) => !wanted.includes(f))
    if (add.length) fail((await db.from('content_faculty').insert(add.map((faculty_id, i) => ({ content_id: contentId, faculty_id, position: have.size + i })))).error)
    if (remove.length) fail((await db.from('content_faculty').delete().eq('content_id', contentId).in('faculty_id', remove)).error)
    return 'Professores salvos.'
  })
}

export async function setContentCohorts(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const contentId = id(fd)
    const all = text(fd, 'disponivel', 10) !== 'turmas'
    const wanted = all ? [] : ids(fd, 'turmas')
    if (!all && !wanted.length) throw new Error('Escolha ao menos uma turma (ou deixe "todas as turmas").')
    const { data: current } = await db.from('content_cohorts').select('cohort_id').eq('content_id', contentId)
    const have = new Set((current ?? []).map((c) => c.cohort_id))
    const add = wanted.filter((c) => !have.has(c))
    const remove = [...have].filter((c) => !wanted.includes(c))
    if (add.length) fail((await db.from('content_cohorts').insert(add.map((cohort_id) => ({ content_id: contentId, cohort_id })))).error)
    if (remove.length) fail((await db.from('content_cohorts').delete().eq('content_id', contentId).in('cohort_id', remove)).error)
    return all ? 'Disponível para todas as turmas.' : 'Turmas salvas.'
  })
}

/** Link de envio de uso único para o armazenamento privado da biblioteca (o arquivo vai direto do navegador). */
export async function prepareLibraryUpload(contentId: string, fileName: string): Promise<{ path: string; token: string } | { erro: string }> {
  try {
    const db = await admin()
    if (!UUID.test(contentId)) return { erro: 'Conteúdo inválido.' }
    const safe = fileName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(-80)
    const { data, error } = await db.storage.from('library-files').createSignedUploadUrl(`${contentId}/${crypto.randomUUID()}-${safe}`)
    if (error || !data) return { erro: 'Não foi possível preparar o envio.' }
    return { path: data.path, token: data.token }
  } catch {
    return { erro: 'Sem permissão.' }
  }
}

function filePath(fd: FormData, contentId: string): string {
  const p = text(fd, 'arquivo_path', 300)
  if (!p.startsWith(`${contentId}/`)) throw new Error('Arquivo inválido.')
  return p
}

/** Arquivo principal (PDF/slides). Trocar mantém o arquivo antigo guardado (nada é apagado do armazenamento). */
export async function setMainFile(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const contentId = id(fd)
    const remove = text(fd, 'remover', 3) === 'sim'
    const { error } = await db
      .from('contents')
      .update(remove ? { file_path: null, file_name: null } : { file_path: filePath(fd, contentId), file_name: text(fd, 'arquivo_nome', 200) || null })
      .eq('id', contentId)
    fail(error)
    return remove ? 'Arquivo retirado do conteúdo.' : 'Arquivo enviado.'
  })
}

export async function addAttachment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const contentId = id(fd)
    const title = req(fd, 'titulo', 'nome do material', 200)
    const url = optUrl(fd, 'link')
    const path = url ? null : filePath(fd, contentId)
    const { count } = await db.from('content_attachments').select('id', { count: 'exact', head: true }).eq('content_id', contentId)
    const { error } = await db.from('content_attachments').insert({
      content_id: contentId,
      title,
      url,
      file_path: path,
      file_name: path ? text(fd, 'arquivo_nome', 200) || null : null,
      position: count ?? 0,
    })
    fail(error)
    return 'Material complementar adicionado.'
  })
}

export async function removeAttachment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('content_attachments').delete().eq('id', id(fd))
    fail(error)
    return 'Material retirado.'
  })
}

export async function setContentStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const status = text(fd, 'status', 12)
    if (!['rascunho', 'publicado', 'arquivado'].includes(status)) throw new Error('Situação inválida.')
    const contentId = id(fd)
    if (status === 'publicado') {
      const { data: c } = await db.from('contents').select('kind, url, file_path, video_id').eq('id', contentId).single()
      if (c && c.kind !== 'video' && !c.url && !c.file_path) throw new Error('Envie o arquivo ou informe o link antes de publicar.')
    }
    const { error } = await db.from('contents').update({ status: status as 'rascunho' | 'publicado' | 'arquivado' }).eq('id', contentId)
    fail(error)
    return status === 'publicado' ? 'Publicado. Já aparece na biblioteca.' : status === 'arquivado' ? 'Arquivado. Saiu da biblioteca; nada foi apagado.' : 'Voltou a rascunho.'
  })
}

export async function deleteDraftContent(_: ActionState, fd: FormData): Promise<ActionState> {
  const state = await run(async (db) => {
    const { error } = await db.from('contents').delete().eq('id', id(fd))
    fail(error, 'excluir')
  })
  if (!state?.erro) redirect('/admin/conteudos')
  return state
}

// ─── Vínculo com módulos ───────────────────────────────────────────────────────────────────────────
export async function linkModule(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const phase = text(fd, 'fase', 10)
    const requirement = text(fd, 'obrigatoriedade', 15)
    if (!['antes', 'durante', 'depois'].includes(phase)) throw new Error('Escolha quando (antes, durante ou depois).')
    if (!['obrigatorio', 'recomendado', 'complementar'].includes(requirement)) throw new Error('Escolha a obrigatoriedade.')
    const moduleId = id(fd, 'modulo')
    const contentId = id(fd, 'conteudo')
    const { count } = await db.from('module_contents').select('content_id', { count: 'exact', head: true }).eq('module_id', moduleId)
    const { error } = await db.from('module_contents').upsert(
      {
        module_id: moduleId,
        content_id: contentId,
        phase: phase as 'antes' | 'durante' | 'depois',
        requirement: requirement as 'obrigatorio' | 'recomendado' | 'complementar',
        note: opt(fd, 'nota', 300),
        ...(fd.get('novo') ? { position: count ?? 0 } : {}),
      },
      { onConflict: 'module_id,content_id' },
    )
    fail(error)
    return 'Vínculo com o módulo salvo.'
  })
}

export async function unlinkModule(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const { error } = await db.from('module_contents').delete().eq('module_id', id(fd, 'modulo')).eq('content_id', id(fd, 'conteudo'))
    fail(error)
    return 'Vínculo retirado.'
  })
}

// ─── Vídeo (Bunny Stream) ──────────────────────────────────────────────────────────────────────────
export type VideoTicket = { endpoint: string; libraryId: string; videoId: string; signature: string; expires: number }

/**
 * Prepara o envio do vídeo: cria o vídeo no Bunny (ou reaproveita um envio interrompido) e devolve o bilhete
 * assinado para o navegador enviar direto ao Bunny. A chave da API nunca sai do servidor.
 * `trocar` = novo vídeo no lugar do atual (o antigo continua guardado no Bunny; nada é apagado).
 */
export async function prepareVideoUpload(contentId: string, trocar = false): Promise<VideoTicket | { erro: string }> {
  try {
    const db = await admin()
    if (!UUID.test(contentId)) return { erro: 'Conteúdo inválido.' }
    const { videoConfig, createUpload } = await import('@/lib/video/bunny')
    const cfg = videoConfig()
    if (!cfg) return { erro: 'O Bunny ainda não está configurado neste ambiente.' }
    const { data: c } = await db.from('contents').select('title, kind, video_id, video_status').eq('id', contentId).single()
    if (!c || c.kind !== 'video') return { erro: 'Este conteúdo não é uma videoaula.' }
    const resume = !trocar && c.video_id && c.video_status === 'enviando' ? c.video_id : null
    const ticket = await createUpload(cfg, c.title, resume)
    if (ticket.videoId !== c.video_id) {
      const { error } = await db
        .from('contents')
        .update({ video_provider: 'bunny', video_id: ticket.videoId, video_status: 'enviando', thumbnail_url: null })
        .eq('id', contentId)
      if (error) return { erro: 'Não foi possível registrar o vídeo.' }
    }
    return ticket
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Não foi possível preparar o envio.' }
  }
}

/** Fim do envio pelo navegador: o Bunny passa a processar. */
export async function markVideoUploaded(contentId: string): Promise<ActionState> {
  return run(async (db) => {
    if (!UUID.test(contentId)) throw new Error('Conteúdo inválido.')
    const { error } = await db.from('contents').update({ video_status: 'processando' }).eq('id', contentId).eq('video_status', 'enviando')
    fail(error)
    return 'Vídeo enviado. O Bunny está processando; a situação atualiza sozinha.'
  })
}

/** Consulta o Bunny e grava situação, duração e capa (só quando mudou). */
export async function refreshVideo(contentId: string): Promise<{ status: string | null; encodeProgress: number | null } | { erro: string }> {
  try {
    const db = await admin()
    const { refreshVideoState } = await import('@/lib/video/refresh')
    return await refreshVideoState(db, contentId)
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Não foi possível consultar o vídeo.' }
  }
}
