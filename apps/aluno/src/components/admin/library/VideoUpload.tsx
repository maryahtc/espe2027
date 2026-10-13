'use client'

import { Button } from '@portal/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Upload } from 'tus-js-client'
import { labelCls } from '@/components/admin/academic/ui'
import { markVideoUploaded, prepareVideoUpload, refreshVideo } from '@/lib/admin/library-actions'

const STATUS_LABEL: Record<string, string> = {
  enviando: 'Envio iniciado e não concluído — envie o arquivo de novo para retomar.',
  processando: 'Processando no Bunny (pode levar alguns minutos). A situação atualiza sozinha.',
  pronto: 'Pronto para os alunos.',
  erro: 'O Bunny não conseguiu processar este arquivo. Envie novamente (de preferência MP4).',
}

/**
 * Envio da videoaula direto do navegador para o Bunny (protocolo TUS: retoma se a conexão cair).
 * O servidor só cria o vídeo e assina o envio; o arquivo nunca passa pelo servidor do portal.
 */
export function VideoUpload({ contentId, status, configured }: { contentId: string; status: string | null; configured: boolean }) {
  const router = useRouter()
  const [pct, setPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [encode, setEncode] = useState<number | null>(null)
  const uploading = pct !== null
  const upload = useRef<Upload | null>(null)

  // Enquanto processa, consulta o Bunny a cada 10 s.
  useEffect(() => {
    if (status !== 'processando') return
    const t = setInterval(async () => {
      const r = await refreshVideo(contentId)
      if ('erro' in r) return
      setEncode(r.encodeProgress)
      if (r.status !== 'processando') router.refresh()
    }, 10_000)
    return () => clearInterval(t)
  }, [contentId, status, router])

  // Avisa antes de sair da página no meio do envio.
  useEffect(() => {
    if (!uploading) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [uploading])

  if (!configured) {
    return (
      <p className="rounded-2xl border border-dashed border-rule-strong px-4 py-3 text-sm text-muted">
        O Bunny ainda não está configurado neste ambiente. Assim que as chaves forem cadastradas, o envio aparece aqui.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {status ? (
        <p className="text-sm" data-video-status={status}>
          <span className="font-semibold">Situação:</span> {STATUS_LABEL[status] ?? status}
          {status === 'processando' && encode !== null ? <span className="num text-muted"> · {encode}%</span> : null}
        </p>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          const file = new FormData(e.currentTarget).get('video')
          if (!(file instanceof File) || file.size === 0) return setError('Escolha o arquivo de vídeo.')
          if (!file.type.startsWith('video/')) return setError('O arquivo precisa ser um vídeo (MP4, MOV…).')
          const ticket = await prepareVideoUpload(contentId, status === 'pronto' || status === 'erro')
          if ('erro' in ticket) return setError(ticket.erro)
          setPct(0)
          const up = new Upload(file, {
            endpoint: ticket.endpoint,
            retryDelays: [0, 3000, 10000, 30000, 60000],
            chunkSize: 50 * 1024 * 1024,
            headers: {
              AuthorizationSignature: ticket.signature,
              AuthorizationExpire: String(ticket.expires),
              VideoId: ticket.videoId,
              LibraryId: ticket.libraryId,
            },
            metadata: { filetype: file.type, title: file.name },
            onProgress: (sent, total) => setPct(total ? Math.floor((sent / total) * 100) : 0),
            onError: () => {
              setPct(null)
              setError('O envio foi interrompido. Escolha o mesmo arquivo e envie de novo: ele continua de onde parou.')
            },
            onSuccess: async () => {
              await markVideoUploaded(contentId)
              setPct(null)
              router.refresh()
            },
          })
          upload.current = up
          const previous = await up.findPreviousUploads()
          if (previous[0]) up.resumeFromPreviousUpload(previous[0])
          up.start()
        }}
      >
        <label className="block">
          <span className={labelCls}>{status === 'pronto' ? 'Trocar o vídeo (o atual continua guardado no Bunny)' : 'Arquivo de vídeo (MP4 ou MOV)'}</span>
          <input name="video" type="file" accept="video/*" required disabled={uploading} className="mt-1.5 block w-full text-sm" />
        </label>
        {uploading ? (
          <div className="space-y-1.5" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="num text-xs text-muted">Enviando… {pct}% — não feche esta página.</p>
          </div>
        ) : (
          <Button type="submit" variant="secondary">
            {status === 'pronto' ? 'Trocar vídeo' : 'Enviar vídeo'}
          </Button>
        )}
        {error ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            ⚠ {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
