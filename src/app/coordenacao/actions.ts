'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { cacheConfig } from '@/config/cache'
import { canEdit, getEntity, type EntityDef } from '@/config/editing'
import { errorMessage, log } from '@/lib/log'
import { requireEditorForWrite } from '@/server/auth'
import { createSheetWriter } from '@/server/data/source'
import { REF_PATTERN } from '@/server/editing/records'
import { createRecord, removeRecord, updateRecord, type FormValues, type SaveResult } from '@/server/editing/service'

/** Resultado de uma tentativa. `values` devolve o que foi digitado para não perder nada em caso de erro. */
export type FormState = { message?: string; errors?: Record<string, string>; values?: FormValues; attempt?: number } | null

const NO_ACCESS = 'Sua sessão expirou ou seu acesso foi removido. Entre novamente.'

function readValues(entity: EntityDef, form: FormData): FormValues {
  const values: FormValues = {}
  for (const field of entity.fields) {
    if (field.kind === 'professors') {
      if (!form.has(`${field.key}__presente`)) continue
      const chosen = form.getAll(field.key).map(String).filter(Boolean)
      const others = String(form.get(`${field.key}__outros`) ?? '').trim()
      values[field.key] = [...chosen, ...(others ? [others] : [])].join('; ')
    } else if (form.has(field.key)) {
      values[field.key] = String(form.get(field.key) ?? '')
    }
  }
  return values
}

/** Atualiza o portal público imediatamente depois de gravar. */
function refreshPortal() {
  updateTag(cacheConfig.tag)
  revalidatePath('/', 'layout')
}

async function run(
  entitySlug: string,
  work: (entity: EntityDef) => Promise<SaveResult>,
  done: string,
  values?: (entity: EntityDef) => FormValues,
): Promise<FormState> {
  const entity = getEntity(entitySlug)
  if (!entity) return { message: 'Tipo de registro desconhecido.' }
  const attempt = Date.now()
  let result: SaveResult
  try {
    result = await work(entity)
  } catch (error) {
    log.error('editing.failed', { entity: entity.slug, message: errorMessage(error) })
    return { message: 'Não foi possível gravar na planilha agora. Tente novamente em instantes.', values: values?.(entity), attempt }
  }
  if (!result.ok) return { message: result.message, errors: result.errors, values: values?.(entity), attempt }
  refreshPortal()
  redirect(`/coordenacao/${entity.slug}?aviso=${encodeURIComponent(result.message)}&${done}`)
}

export async function saveRecordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const editor = await requireEditorForWrite()
  if (!editor) return { message: NO_ACCESS }
  const slug = String(form.get('__entidade') ?? '')
  const ref = String(form.get('__ref') ?? '')
  const version = String(form.get('__versao') ?? '')
  return run(
    slug,
    async (entity) => {
      if (!canEdit(editor.role, entity)) return { ok: false, message: 'Você não tem permissão para editar isto.' }
      const values = readValues(entity, form)
      const writer = createSheetWriter()
      if (!ref) return createRecord(writer, entity, values, editor)
      if (!REF_PATTERN.test(ref)) return { ok: false, message: 'Registro inválido.' }
      return updateRecord(writer, entity, ref, version, values, editor)
    },
    'ok=1',
    (entity) => readValues(entity, form),
  )
}

export async function removeRecordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const editor = await requireEditorForWrite()
  if (!editor) return { message: NO_ACCESS }
  const ref = String(form.get('__ref') ?? '')
  if (!REF_PATTERN.test(ref)) return { message: 'Registro inválido.' }
  return run(
    String(form.get('__entidade') ?? ''),
    async (entity) => {
      if (!canEdit(editor.role, entity)) return { ok: false, message: 'Você não tem permissão para editar isto.' }
      return removeRecord(createSheetWriter(), entity, ref, String(form.get('__versao') ?? ''), editor)
    },
    'ok=1',
  )
}
