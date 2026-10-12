'use client'

import { createSupabaseBrowserClient } from '@portal/db/browser'
import { Button } from '@portal/ui/button'
import { useActionState, useState, useTransition } from 'react'
import { inputCls, labelCls } from '@/components/admin/academic/ui'
import { type ActionState, addAttachment, prepareLibraryUpload, setMainFile } from '@/lib/admin/library-actions'

const MAX = 50 * 1024 * 1024

/**
 * Envio de arquivo da biblioteca: vai direto do navegador para o armazenamento privado (link de envio de uso
 * único gerado pelo servidor), sem passar pelo servidor do portal. `mode="anexo"` aceita arquivo ou link.
 */
export function LibraryUpload({ contentId, mode }: { contentId: string; mode: 'principal' | 'anexo' }) {
  const [state, formAction, saving] = useActionState<ActionState, FormData>(mode === 'principal' ? setMainFile : addAttachment, undefined)
  const [source, setSource] = useState<'arquivo' | 'link'>('arquivo')
  const [error, setError] = useState<string | null>(null)
  const [uploading, startUpload] = useTransition()
  const busy = saving || uploading

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        const form = e.currentTarget
        const fd = new FormData(form)
        startUpload(async () => {
          if (source === 'arquivo') {
            const file = fd.get('arquivo')
            if (!(file instanceof File) || file.size === 0) return setError('Escolha um arquivo.')
            if (file.size > MAX) return setError('Arquivo acima de 50 MB.')
            const prep = await prepareLibraryUpload(contentId, file.name)
            if ('erro' in prep) return setError(prep.erro)
            const supabase = createSupabaseBrowserClient()
            if (!supabase) return setError('Armazenamento não configurado.')
            const { error: upErr } = await supabase.storage.from('library-files').uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type || undefined })
            if (upErr) return setError('Falha no envio do arquivo. Tente de novo.')
            fd.set('arquivo_path', prep.path)
            fd.set('arquivo_nome', file.name)
          }
          fd.delete('arquivo')
          formAction(fd)
          form.reset()
        })
      }}
    >
      <input type="hidden" name="id" value={contentId} />
      {mode === 'anexo' ? (
        <>
          <label className="block">
            <span className={labelCls}>Nome do material</span>
            <input name="titulo" required className={inputCls} placeholder="Ex.: Protocolo fotográfico (PDF)" />
          </label>
          <fieldset>
            <legend className={labelCls}>Tipo</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(['arquivo', 'link'] as const).map((k) => (
                <label key={k} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-3.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-on-ink">
                  <input type="radio" name="origem" value={k} checked={source === k} onChange={() => setSource(k)} className="sr-only" />
                  {k === 'arquivo' ? 'Arquivo (PDF etc.)' : 'Link'}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
      {source === 'arquivo' ? (
        <label className="block">
          <span className={labelCls}>{mode === 'principal' ? 'Arquivo (PDF ou slides, até 50 MB)' : 'Arquivo (até 50 MB)'}</span>
          <input name="arquivo" type="file" required accept=".pdf,.ppt,.pptx,.key,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" className="mt-1.5 block w-full text-sm" />
        </label>
      ) : (
        <label className="block">
          <span className={labelCls}>Link</span>
          <input name="link" type="url" required placeholder="https://…" className={inputCls} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? 'Enviando…' : mode === 'principal' ? 'Enviar arquivo' : 'Adicionar'}
        </Button>
        {error || state?.erro ? (
          <span role="alert" className="text-xs font-semibold text-danger">
            ⚠ {error ?? state?.erro}
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
