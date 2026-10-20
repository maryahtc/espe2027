'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import { type ActionState, removeCover, uploadCover } from '@/lib/cases/actions'

/** Reduz no próprio aparelho (até 2000 px, JPEG) antes de enviar — rápido no 4G; o servidor reencoda de novo. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha'))), 'image/jpeg', 0.9))
}

/**
 * Foto de capa opcional (só o dono). Orientação explícita e confirmação de que a foto não mostra o rosto inteiro.
 * A foto fica privada: só quem pode ver o caso a enxerga, por link temporário.
 */
export function CoverUpload({ caseId, hasCover, simulated = false }: { caseId: string; hasCover: boolean; simulated?: boolean }) {
  const [state, upload, sending] = useActionState<ActionState, FormData>(uploadCover, undefined)
  const [removed, remove, removing] = useActionState<ActionState, FormData>(removeCover, undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [noFace, setNoFace] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  // Simulação: a foto "salva" fica só nesta tela (nunca sai do navegador nem vai para o Storage).
  const [local, setLocal] = useState<string | null>(null)

  async function pick(file: File | undefined) {
    setError(null)
    setBlob(null)
    setPreview(null)
    if (!file) return
    try {
      const b = await shrink(file)
      setBlob(b)
      setPreview(URL.createObjectURL(b))
    } catch {
      setError('Não foi possível ler esta foto neste aparelho. Tente uma foto JPG ou PNG.')
    }
  }

  return (
    <details className="rounded-2xl border border-rule p-4 text-sm" data-capa>
      <summary className="cursor-pointer font-semibold">{hasCover ? 'Trocar ou remover a foto de capa' : 'Adicionar foto de capa (opcional)'}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted">
          Use uma foto <span className="text-ink">intraoral ou do sorriso</span>, <span className="text-ink">sem o rosto inteiro</span> do paciente. Ela serve só
          para reconhecer o caso na lista: a documentação clínica continua no Smile Cloud. A foto fica privada e é salva sem dados de localização ou da câmera.
        </p>
        <input ref={input} type="file" accept="image/*" aria-label="Escolher foto" onChange={(e) => pick(e.target.files?.[0])} className="block w-full text-sm" />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob) antes de enviar
          <img src={preview} alt="Prévia da foto escolhida" className="max-h-56 rounded-xl object-contain" />
        ) : null}
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={noFace} onChange={(e) => setNoFace(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
          <span>Confirmo que a foto não mostra o rosto inteiro do paciente nem dados que o identifiquem.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!blob || !noFace || sending}
            onClick={() => {
              if (simulated) {
                setLocal(preview)
                return
              }
              const fd = new FormData()
              fd.set('id', caseId)
              fd.set('semRosto', noFace ? 'on' : '')
              fd.set('foto', blob!, 'capa.jpg')
              startTransition(() => upload(fd))
            }}
            className="min-h-11 rounded-full bg-[var(--brand)] px-5 font-semibold text-white disabled:opacity-40"
          >
            {sending ? 'Enviando…' : 'Salvar foto'}
          </button>
          {simulated && local ? (
            <button type="button" onClick={() => setLocal(null)} className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
              Remover foto
            </button>
          ) : null}
          {hasCover && !simulated ? (
            <button
              type="button"
              disabled={removing}
              onClick={() => {
                if (!window.confirm('Remover a foto de capa?')) return
                const fd = new FormData()
                fd.set('id', caseId)
                startTransition(() => remove(fd))
              }}
              className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Remover foto
            </button>
          ) : null}
        </div>
        {simulated ? (
          <p role="note" data-capa-local className="rounded-xl border border-[#ffc21a]/50 px-3 py-2 text-xs text-[#ffc21a]">
            Simulação: a foto fica só neste navegador e nunca é enviada. Ela some ao recarregar ou sair.
          </p>
        ) : null}
        {simulated && local ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob) da simulação
          <img src={local} alt="Capa (prévia local da simulação)" data-capa-simulada className="max-h-56 rounded-xl object-cover" />
        ) : null}
        {error || state?.erro || removed?.erro ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            ⚠ {error ?? state?.erro ?? removed?.erro}
          </p>
        ) : state?.aviso || removed?.aviso ? (
          <p role="status" className="text-xs text-muted">
            ✓ {state?.aviso ?? removed?.aviso}
          </p>
        ) : null}
      </div>
    </details>
  )
}
