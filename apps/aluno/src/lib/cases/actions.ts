'use server'

import type { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentCohort, today } from '@/lib/academic/load'
import { applySim } from '@/lib/simulation/apply'
import type { AuthState } from '@/lib/auth/session'
import { studentGate } from '@/lib/simulation/gate'
import type { Simulation } from '@/lib/simulation/session'
import {
  type RegisterInput,
  simRegister,
  simSaveDetails,
  simSetCaseRemoved,
  simSetRecordRemoved,
  simSetStatus,
  simUpdateRecord,
} from '@/lib/simulation/state'
import { type DentalArch, ARCHES } from '@/lib/procedures/model'
import { loadStepOptions } from './load'
import { hasPersonalIdentifier, parseTeeth, patientLabelError, resolvePlacement } from './model'
import { odontogramReady } from './schema'

/**
 * Ações de Meus casos. Só o dono escreve, em turma ativa — o banco garante (RLS + gatilhos); aqui as mensagens são
 * claras e os dados chegam limpos. "Excluir" é sempre lógico (recuperável).
 */
export type ActionState = { erro?: string; aviso?: string } | undefined

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
const UUID = /^[0-9a-f-]{36}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Aluno de verdade → banco. Admin no Modo de simulação → rascunho temporário (`sim`; a conexão fica só leitura).
 * Admin fora da simulação e coordenação → bloqueado: nunca gravam casos.
 */
async function student(): Promise<{ auth: AuthState; db: Db; sim: Simulation | null }> {
  const gate = await studentGate()
  if (gate.kind === 'blocked') throw new Error(gate.reason)
  return { auth: gate.auth, db: gate.db as Db, sim: gate.kind === 'sim' ? gate.sim : null }
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new Error('Não é possível registrar aqui: os casos são registrados pelo aluno, em turma ativa.')
  if (error.code === '23514' && /futuro|Descreva|desativada|módulo|temas|arcada|dentes|FDI/.test(error.message)) throw new Error(error.message)
  if (error.code === '23514') throw new Error('Algum dado não é permitido (ex.: nome, CPF ou telefone do paciente, ou dente inválido).')
  if (error.code === '23503') throw new Error('Registro inválido.')
  throw new Error('Não foi possível salvar.')
}

async function run(fn: (ctx: Awaited<ReturnType<typeof student>>) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const msg = await fn(await student())
    revalidatePath('/', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const id = (fd: FormData, k = 'id') => {
  const v = str(fd, k, 40)
  if (!UUID.test(v)) throw new Error('Registro inválido.')
  return v
}
function cleanText(v: unknown, max: number, label: string): string | null {
  const t = typeof v === 'string' ? v.trim().slice(0, max) : ''
  if (!t) return null
  if (hasPersonalIdentifier(t)) throw new Error(`${label}: não inclua CPF, telefone ou documento do paciente.`)
  return t
}
function checkDate(d: unknown): string {
  if (typeof d !== 'string' || !DATE.test(d)) throw new Error('Informe a data do atendimento.')
  if (d > today()) throw new Error('A data não pode ser no futuro.')
  return d
}
function smile(v: unknown): string | null {
  const t = typeof v === 'string' ? v.trim().slice(0, 500) : ''
  if (!t) return null
  if (!/^https:\/\/\S+$/.test(t)) throw new Error('O link do Smile Cloud precisa começar com https://')
  return t
}

// ─── Registro rápido ─────────────────────────────────────────────────────────────────────────────

type Payload = {
  mode: 'novo' | 'existente'
  caseId?: string
  patient?: string
  date: string
  lines: Array<{ stepId: string; quantity: number; teeth: number[]; description?: string; arch?: DentalArch | null; note?: string }>
  module: { auto: true } | { auto: false; id: string | null }
  extras?: { title?: string; supervisorId?: string; smile?: string; difficulty?: string; ease?: string; differently?: string; topicIds?: string[] }
}

/** Registra o que o aluno fez hoje: em caso novo (cria o caso) ou em caso em andamento. */
export async function registerProcedures(_: ActionState, fd: FormData): Promise<ActionState> {
  const out: { caseId?: string; count?: number } = {}
  const result = await run(async ({ auth, db, sim }) => {
    let p: Payload
    try {
      p = JSON.parse(str(fd, 'payload', 20000)) as Payload
    } catch {
      throw new Error('Não foi possível ler o registro.')
    }
    if (sim) {
      const r = await applySim(sim, (state, ctx) => simRegister(state, p as RegisterInput, ctx))
      out.caseId = r.caseId
      out.count = r.count
      return
    }
    const date = checkDate(p.date)
    const lines = (p.lines ?? []).filter((l) => l && UUID.test(l.stepId))
    if (!lines.length) throw new Error('Escolha o que você fez.')
    if (lines.length > 12) throw new Error('No máximo 12 procedimentos por registro.')
    // Confere as etapas antes de criar qualquer coisa: ativas, descrição quando exigida, posições FDI/arcada conforme
    // a localização da etapa (mesmas regras do banco) e observação curta.
    const ready = await odontogramReady()
    const steps = new Map((await loadStepOptions()).map((o) => [o.stepId, o]))
    const rows = lines.map((l) => {
      const o = steps.get(l.stepId)
      if (!o || !o.active) throw new Error('Um dos procedimentos escolhidos não está mais disponível.')
      const other = cleanText(l.description, 120, 'Descrição')
      if (o.requiresDescription && (other ?? '').length < 3) throw new Error('Descreva o "Outro procedimento".')
      const arch = ARCHES.includes(l.arch as DentalArch) ? (l.arch as DentalArch) : null
      const placed = resolvePlacement(o, { quantity: Number(l.quantity), teeth: l.teeth ?? [], arch }, ready)
      return {
        step_id: l.stepId,
        quantity: placed.quantity,
        teeth: placed.teeth,
        ...(ready ? { arch: placed.arch } : {}),
        other_description: other,
        note: cleanText(l.note, 200, 'Observação'),
      }
    })
    const mod = p.module?.auto === false ? { module_auto: false, module_id: p.module.id && UUID.test(p.module.id) ? p.module.id : null } : { module_auto: true }

    let caseId: string
    let cohortId: string
    if (p.mode === 'existente') {
      if (!p.caseId || !UUID.test(p.caseId)) throw new Error('Escolha o caso em andamento.')
      const { data: own } = await db.from('clinical_cases').select('id, cohort_id').eq('id', p.caseId).eq('owner_id', auth.userId).maybeSingle()
      if (!own) throw new Error('Caso não encontrado.')
      caseId = own.id
      cohortId = own.cohort_id
    } else {
      const label = (p.patient ?? '').trim()
      const err = patientLabelError(label)
      if (err) throw new Error(err)
      const cohort = await currentCohort()
      if (!cohort) throw new Error('Sua conta ainda não está vinculada a uma turma.')
      const x = p.extras ?? {}
      const { data, error } = await db
        .from('clinical_cases')
        .insert({
          cohort_id: cohort.id,
          patient_label: label,
          title: cleanText(x.title, 80, 'Título'),
          supervisor_faculty_id: x.supervisorId && UUID.test(x.supervisorId) ? x.supervisorId : null,
          smile_cloud_url: smile(x.smile),
          difficulty_text: cleanText(x.difficulty, 1000, 'Dificuldade'),
          ease_text: cleanText(x.ease, 1000, 'Facilidade'),
          do_differently_text: cleanText(x.differently, 1000, 'Faria diferente'),
        })
        .select('id')
        .single()
      fail(error)
      caseId = data!.id
      cohortId = cohort.id
      const topicIds = [...new Set((x.topicIds ?? []).filter((t) => UUID.test(t)))].slice(0, 3)
      if (topicIds.length) fail((await db.from('case_difficulty_topics').insert(topicIds.map((topic_id) => ({ case_id: caseId, topic_id, owner_id: auth.userId, source: 'aluno' })))).error)
    }

    // Dono, turma e procedimento também são preenchidos (e conferidos) pelo banco a partir do caso e da etapa.
    const procedureOf = new Map([...steps.values()].map((x) => [x.stepId, x.procedureId]))
    const { error } = await db.from('performed_procedures').insert(
      rows.map((r) => ({ ...r, ...mod, case_id: caseId, owner_id: auth.userId, cohort_id: cohortId, procedure_id: procedureOf.get(r.step_id)!, performed_on: date })),
    )
    if (error && p.mode !== 'existente') {
      // Caso recém-criado sem nenhum registro: sai da vista (exclusão lógica, recuperável) para não ficar vazio.
      await db.from('clinical_cases').update({ removed_at: new Date().toISOString() }).eq('id', caseId)
    }
    fail(error)
    out.caseId = caseId
    out.count = rows.length
  })
  if (out.caseId && !result?.erro) redirect(`/casos/${out.caseId}?registrado=${out.count}`)
  return result
}

// ─── Caso ────────────────────────────────────────────────────────────────────────────────────────

/** Completar/editar os dados opcionais do caso (inclusive os temas da dificuldade, até 3). */
export async function saveCaseDetails(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ auth, db, sim }) => {
    const caseId = id(fd)
    if (sim) {
      await applySim(sim, (state, ctx) =>
        simSaveDetails(
          state,
          caseId,
          {
            patient: str(fd, 'paciente', 40),
            title: fd.get('titulo'),
            supervisorId: str(fd, 'supervisor', 40),
            smile: fd.get('smile'),
            difficulty: fd.get('dificuldade'),
            ease: fd.get('facilidade'),
            differently: fd.get('diferente'),
            topicIds: fd.getAll('temas'),
          },
          ctx,
        ),
      )
      return 'Caso atualizado.'
    }
    const label = str(fd, 'paciente', 40)
    const err = patientLabelError(label)
    if (err) throw new Error(err)
    const sup = str(fd, 'supervisor', 40)
    const { error, count } = await db
      .from('clinical_cases')
      .update(
        {
          patient_label: label,
          title: cleanText(fd.get('titulo'), 80, 'Título'),
          supervisor_faculty_id: UUID.test(sup) ? sup : null,
          smile_cloud_url: smile(fd.get('smile')),
          difficulty_text: cleanText(fd.get('dificuldade'), 1000, 'Dificuldade'),
          ease_text: cleanText(fd.get('facilidade'), 1000, 'Facilidade'),
          do_differently_text: cleanText(fd.get('diferente'), 1000, 'Faria diferente'),
        },
        { count: 'exact' },
      )
      .eq('id', caseId)
    fail(error)
    if (!count) throw new Error('Este caso não pode ser alterado (turma encerrada ou caso de outra pessoa).')
    const wanted = [...new Set(fd.getAll('temas').map(String).filter((t) => UUID.test(t)))]
    if (wanted.length > 3) throw new Error('Escolha no máximo 3 temas.')
    const { data: current } = await db.from('case_difficulty_topics').select('topic_id').eq('case_id', caseId)
    const have = new Set((current ?? []).map((t) => t.topic_id))
    const remove = [...have].filter((t) => !wanted.includes(t))
    if (remove.length) fail((await db.from('case_difficulty_topics').delete().eq('case_id', caseId).in('topic_id', remove)).error)
    const add = wanted.filter((t) => !have.has(t))
    if (add.length) fail((await db.from('case_difficulty_topics').insert(add.map((topic_id) => ({ case_id: caseId, topic_id, owner_id: auth.userId, source: 'aluno' })))).error)
    return 'Caso atualizado.'
  })
}

export async function setCaseStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db, sim }) => {
    const status = str(fd, 'para', 20) === 'concluido' ? 'concluido' : 'em_andamento'
    if (sim) {
      await applySim(sim, (state, ctx) => simSetStatus(state, id(fd), status, ctx))
    } else {
      const { error, count } = await db.from('clinical_cases').update({ status }, { count: 'exact' }).eq('id', id(fd))
      fail(error)
      if (!count) throw new Error('Este caso não pode ser alterado.')
    }
    return status === 'concluido' ? 'Caso concluído. Você pode reabrir quando quiser.' : 'Caso reaberto.'
  })
}

/** Exclusão lógica do caso (some das listas e da Produção) e restauração. */
export async function setCaseRemoved(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db, sim }) => {
    const remove = str(fd, 'excluir', 4) === 'sim'
    if (sim) {
      await applySim(sim, (state) => simSetCaseRemoved(state, id(fd), remove))
      return remove ? 'Caso excluído. Ele fica em "Excluídos" e pode ser restaurado.' : 'Caso restaurado.'
    }
    const { error, count } = await db
      .from('clinical_cases')
      .update({ removed_at: remove ? new Date().toISOString() : null }, { count: 'exact' })
      .eq('id', id(fd))
    fail(error)
    if (!count) throw new Error('Este caso não pode ser alterado.')
    return remove ? 'Caso excluído. Ele fica em "Excluídos" e pode ser restaurado.' : 'Caso restaurado.'
  })
}

// ─── Registros ───────────────────────────────────────────────────────────────────────────────────

export async function updateRecord(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db, sim }) => {
    const quantity = Number(str(fd, 'quantidade', 3)) || 1
    const mod = str(fd, 'modulo', 40)
    const archIn = str(fd, 'arcada', 10)
    const arch = ARCHES.includes(archIn as DentalArch) ? (archIn as DentalArch) : null
    if (sim) {
      await applySim(sim, (state, ctx) =>
        simUpdateRecord(
          state,
          id(fd),
          {
            date: str(fd, 'data', 10),
            quantity,
            teeth: parseTeeth(str(fd, 'dentes', 200)),
            arch,
            note: fd.get('nota'),
            description: fd.has('descricao') ? fd.get('descricao') : undefined,
            module: mod === 'auto' ? { auto: true, id: null } : { auto: false, id: UUID.test(mod) ? mod : null },
          },
          ctx,
        ),
      )
      return 'Registro atualizado.'
    }
    // Posições FDI / arcada conforme a localização da etapa do registro (mesmas regras do banco).
    const ready = await odontogramReady()
    const { data: current } = await db.from('performed_procedures').select('step_id').eq('id', id(fd)).maybeSingle()
    const o = current ? (await loadStepOptions()).find((x) => x.stepId === current.step_id) : undefined
    if (!o) throw new Error('Este registro não pode ser alterado.')
    const placed = resolvePlacement(o, { quantity, teeth: parseTeeth(str(fd, 'dentes', 200)), arch }, ready)
    const row = {
      performed_on: checkDate(str(fd, 'data', 10)),
      quantity: placed.quantity,
      teeth: placed.teeth,
      ...(ready ? { arch: placed.arch } : {}),
      note: cleanText(fd.get('nota'), 200, 'Observação'),
      other_description: fd.has('descricao') ? cleanText(fd.get('descricao'), 120, 'Descrição') : undefined,
      ...(mod === 'auto' ? { module_auto: true } : { module_auto: false, module_id: UUID.test(mod) ? mod : null }),
    }
    const { error, count } = await db.from('performed_procedures').update(row, { count: 'exact' }).eq('id', id(fd))
    fail(error)
    if (!count) throw new Error('Este registro não pode ser alterado.')
    return 'Registro atualizado.'
  })
}

/** Exclusão lógica de um registro lançado por engano (sai da Produção) e restauração. */
export async function setRecordRemoved(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db, sim }) => {
    const remove = str(fd, 'excluir', 4) === 'sim'
    if (sim) {
      await applySim(sim, (state) => simSetRecordRemoved(state, id(fd), remove))
      return remove ? 'Registro excluído (pode ser restaurado).' : 'Registro restaurado.'
    }
    const { error, count } = await db
      .from('performed_procedures')
      .update({ removed_at: remove ? new Date().toISOString() : null }, { count: 'exact' })
      .eq('id', id(fd))
    fail(error)
    if (!count) throw new Error('Este registro não pode ser alterado.')
    return remove ? 'Registro excluído (pode ser restaurado).' : 'Registro restaurado.'
  })
}

// ─── Foto de capa (privada) ──────────────────────────────────────────────────────────────────────

/**
 * Envia ou troca a foto de capa. Só o dono, em turma ativa. O servidor reencoda (sem metadados), grava capa e
 * miniatura na pasta do caso e apaga a anterior. Exige a confirmação de que a foto não mostra o rosto inteiro.
 */
export async function uploadCover(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ auth, db, sim }) => {
    // Simulação: a foto nunca é recebida nem enviada ao Storage (a prévia fica só no navegador).
    if (sim) throw new Error('Simulação: a foto fica só neste navegador e não é enviada.')
    const caseId = id(fd)
    if (fd.get('semRosto') !== 'on') throw new Error('Confirme que a foto não mostra o rosto inteiro do paciente.')
    const file = fd.get('foto')
    if (!(file instanceof Blob) || !file.size) throw new Error('Escolha uma foto.')
    const { data: own } = await db.from('clinical_cases').select('id, cover_path').eq('id', caseId).eq('owner_id', auth.userId).maybeSingle()
    if (!own) throw new Error('Caso não encontrado.')
    const { processCover, miniPath } = await import('./cover')
    const { full, mini } = await processCover(Buffer.from(await file.arrayBuffer()))
    const path = `${auth.userId}/${caseId}/${Date.now()}.webp`
    const bucket = db.storage.from('case-covers')
    const up1 = await bucket.upload(path, full, { contentType: 'image/webp', upsert: false })
    if (up1.error) throw new Error('Não foi possível enviar a foto (caso de turma encerrada ou sem permissão).')
    const up2 = await bucket.upload(miniPath(path), mini, { contentType: 'image/webp', upsert: false })
    const { error, count } = up2.error
      ? { error: up2.error, count: 0 }
      : await db.from('clinical_cases').update({ cover_path: path, cover_updated_at: new Date().toISOString() }, { count: 'exact' }).eq('id', caseId)
    if (error || !count) {
      await bucket.remove([path, miniPath(path)])
      throw new Error('Não foi possível salvar a foto.')
    }
    if (own.cover_path) await bucket.remove([own.cover_path, miniPath(own.cover_path)])
    return 'Foto de capa salva (sem dados de localização ou da câmera).'
  })
}

export async function removeCover(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ auth, db, sim }) => {
    if (sim) return 'Prévia local removida.'
    const caseId = id(fd)
    const { data: own } = await db.from('clinical_cases').select('cover_path').eq('id', caseId).eq('owner_id', auth.userId).maybeSingle()
    if (!own?.cover_path) return 'Sem foto de capa.'
    const { miniPath } = await import('./cover')
    const { error, count } = await db.from('clinical_cases').update({ cover_path: null, cover_updated_at: new Date().toISOString() }, { count: 'exact' }).eq('id', caseId)
    fail(error)
    if (!count) throw new Error('Este caso não pode ser alterado.')
    await db.storage.from('case-covers').remove([own.cover_path, miniPath(own.cover_path)])
    return 'Foto de capa removida.'
  })
}
