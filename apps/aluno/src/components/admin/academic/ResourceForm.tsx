'use client'

import { createSupabaseBrowserClient } from '@portal/db/browser'
import { Button } from '@portal/ui/button'
import { useActionState, useId, useState, useTransition } from 'react'
import { prepareUpload, saveResource } from '@/lib/admin/academic-actions'
import type { ResourceVM } from '@/lib/academic/load'

const input = 'field mt-1.5 block min-h-11 w-full px-3 text-[15px]'
const label = 'block text-sm font-semibold'

function splitDate(iso: string | null) {
  if (!iso) return { d: '', t: '' }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso))
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { d: `${g('year')}-${g('month')}-${g('day')}`, t: `${g('hour')}:${g('minute')}` }
}

/**
 * Aula, link, arquivo ou texto do módulo. Arquivos vão direto do navegador para o armazenamento privado
 * (link de envio de uso único gerado pelo servidor), sem passar pelo servidor do portal.
 */
export function ResourceForm({
  moduleId,
  sessions,
  resource,
  defaultPhase = 'antes',
}: {
  moduleId: string
  sessions: Array<{ id: string; label: string }>
  resource?: ResourceVM
  defaultPhase?: 'antes' | 'durante' | 'depois'
}) {
  const uid = useId()
  const [state, formAction, saving] = useActionState(saveResource, undefined)
  const [kind, setKind] = useState<ResourceVM['kind']>(resource?.kind ?? 'link')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, startUpload] = useTransition()
  const avail = splitDate(resource?.availableFrom ?? null)
  const busy = saving || uploading

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setUploadError(null)
        const fd = new FormData(e.currentTarget)
        startUpload(async () => {
          if (!resource && kind === 'arquivo') {
            const file = fd.get('arquivo')
            if (!(file instanceof File) || file.size === 0) return setUploadError('Escolha um arquivo.')
            if (file.size > 50 * 1024 * 1024) return setUploadError('Arquivo acima de 50 MB.')
            const prep = await prepareUpload(moduleId, file.name)
            if ('erro' in prep) return setUploadError(prep.erro)
            const supabase = createSupabaseBrowserClient()
            if (!supabase) return setUploadError('Armazenamento não configurado.')
            const { error } = await supabase.storage.from('module-files').uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type || undefined })
            if (error) return setUploadError('Falha no envio do arquivo. Tente de novo.')
            fd.set('arquivo_path', prep.path)
          }
          fd.delete('arquivo')
          formAction(fd)
        })
      }}
    >
      {resource ? <input type="hidden" name="id" value={resource.id} /> : <input type="hidden" name="modulo" value={moduleId} />}
      <fieldset>
        <legend className={label}>Tipo</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(['link', 'arquivo', 'texto'] as const).map((k) => (
            <label key={k} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-3.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-on-ink">
              <input
                type="radio"
                name="tipo"
                value={k}
                checked={kind === k}
                disabled={Boolean(resource) && k !== resource?.kind}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {k === 'link' ? 'Link' : k === 'arquivo' ? 'Arquivo (PDF, slides…)' : 'Texto'}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${uid}-t`} className={label}>
          Título
        </label>
        <input id={`${uid}-t`} name="titulo" required defaultValue={resource?.title} className={input} />
      </div>
      {kind === 'link' ? (
        <div>
          <label htmlFor={`${uid}-u`} className={label}>
            Endereço (https://…)
          </label>
          <input id={`${uid}-u`} name="url" type="url" required defaultValue={resource?.url ?? ''} className={input} />
        </div>
      ) : null}
      {kind === 'arquivo' && !resource ? (
        <div>
          <label htmlFor={`${uid}-f`} className={label}>
            Arquivo
          </label>
          <input id={`${uid}-f`} name="arquivo" type="file" required className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-on-ink" />
          <p className="mt-1 text-xs text-muted">Até 50 MB. Fica em armazenamento privado; o aluno abre por link temporário.</p>
        </div>
      ) : null}
      {kind === 'texto' ? (
        <div>
          <label htmlFor={`${uid}-b`} className={label}>
            Texto
          </label>
          <textarea id={`${uid}-b`} name="texto" rows={5} required defaultValue={resource?.body ?? ''} className="field mt-1.5 block w-full px-3 py-2.5 text-[15px]" />
        </div>
      ) : null}
      <div>
        <label htmlFor={`${uid}-d`} className={label}>
          Descrição (opcional)
        </label>
        <input id={`${uid}-d`} name="descricao" defaultValue={resource?.description ?? ''} className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${uid}-p`} className={label}>
            Quando
          </label>
          <select id={`${uid}-p`} name="fase" defaultValue={resource?.phase ?? defaultPhase} className={input}>
            <option value="antes">Antes do módulo</option>
            <option value="durante">Durante</option>
            <option value="depois">Depois</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-r`} className={label}>
            Obrigatoriedade
          </label>
          <select id={`${uid}-r`} name="obrigatoriedade" defaultValue={resource?.requirement ?? 'recomendado'} className={input}>
            <option value="obrigatorio">Obrigatório</option>
            <option value="recomendado">Recomendado</option>
            <option value="complementar">Complementar</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-s`} className={label}>
            Situação
          </label>
          <select id={`${uid}-s`} name="status" defaultValue={resource?.status ?? 'publicado'} className={input}>
            <option value="rascunho">Rascunho (invisível)</option>
            <option value="publicado">Publicado</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${uid}-ld`} className={label}>
            Liberar a partir de
          </label>
          <input id={`${uid}-ld`} name="liberar_data" type="date" defaultValue={avail.d} className={input} />
        </div>
        <div>
          <label htmlFor={`${uid}-lh`} className={label}>
            Hora
          </label>
          <input id={`${uid}-lh`} name="liberar_hora" type="time" defaultValue={avail.t} className={input} />
        </div>
        <div>
          <label htmlFor={`${uid}-a`} className={label}>
            Ligado à atividade
          </label>
          <select id={`${uid}-a`} name="atividade" defaultValue={resource?.sessionId ?? ''} className={input}>
            <option value="">—</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={busy}>
          {uploading ? 'Enviando…' : saving ? 'Salvando…' : resource ? 'Salvar' : 'Adicionar'}
        </Button>
        {uploadError || state?.erro ? (
          <span role="alert" className="text-xs font-semibold text-danger">
            ⚠ {uploadError ?? state?.erro}
          </span>
        ) : state?.aviso ? (
          <span role="status" className="text-xs text-muted">
            ✓ {state.aviso}
          </span>
        ) : null}
      </div>
    </form>
  )
}
