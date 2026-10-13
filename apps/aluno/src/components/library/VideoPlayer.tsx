'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { saveVideoProgress } from '@/lib/library/actions'

const PJS = { context: 'player.js', version: '0.0.11' }
const SAVE_EVERY_MS = 15_000

type PlayerMessage = { context?: string; event?: string; value?: unknown; listener?: string }

function parse(data: unknown): PlayerMessage | null {
  try {
    const m = (typeof data === 'string' ? JSON.parse(data) : data) as PlayerMessage
    return m && m.context === 'player.js' ? m : null
  } catch {
    return null
  }
}

/**
 * Player do Bunny Stream (iframe com link assinado, gerado no servidor e válido por poucas horas).
 * - Conversa com o player pelo protocolo player.js: retoma de onde parou e acompanha o tempo assistido.
 * - Progresso salvo a cada ~15 s, ao pausar, ao terminar e ao sair da página; concluído aos 90% (no servidor).
 * - Marca d'água discreta com o e-mail do aluno, que muda de lugar de tempos em tempos. A tela cheia é do
 *   quadro inteiro (não só do vídeo), para a marca d'água continuar visível.
 * `preview`: pré-visualização do painel — não grava progresso.
 */
export function VideoPlayer({
  src,
  contentId,
  watermark,
  startAt = 0,
  preview = false,
  title,
}: {
  src: string
  contentId: string
  watermark: string
  startAt?: number
  preview?: boolean
  title: string
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const last = useRef({ seconds: 0, duration: 0, savedAt: 0, savedSeconds: -1 })
  const [spot, setSpot] = useState(0)
  const origin = new URL(src).origin

  const post = useCallback(
    (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(JSON.stringify({ ...PJS, ...msg }), origin),
    [origin],
  )

  const save = useCallback(
    (force = false) => {
      const l = last.current
      if (preview || l.duration <= 0 || l.seconds < 1) return
      // Primeiro tempo recebido só marca o relógio (dá tempo de retomar antes de gravar).
      if (!force && l.savedAt === 0) {
        l.savedAt = Date.now()
        return
      }
      if (!force && Date.now() - l.savedAt < SAVE_EVERY_MS) return
      if (Math.floor(l.seconds) === l.savedSeconds) return
      l.savedAt = Date.now()
      l.savedSeconds = Math.floor(l.seconds)
      void saveVideoProgress(contentId, l.seconds, l.duration)
    },
    [contentId, preview],
  )

  const heard = useRef(false)
  const resumed = useRef(false)
  /** Pede ao player os eventos de tempo. Repetido até o player responder (o "ready" pode chegar antes da página). */
  const hook = useCallback(() => {
    for (const ev of ['timeupdate', 'pause', 'ended']) post({ method: 'addEventListener', value: ev, listener: `portal-${ev}` })
  }, [post])
  /** Retoma do ponto salvo uma vez, quando o player já responde (ready ou primeiro timeupdate). */
  const resume = useCallback(() => {
    if (resumed.current) return
    resumed.current = true
    if (startAt > 5) post({ method: 'setCurrentTime', value: startAt })
  }, [post, startAt])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow) return
      const m = parse(e.data)
      if (!m) return
      if (m.event === 'ready') {
        if (!heard.current) hook()
        resume()
      } else if (m.event === 'timeupdate') {
        heard.current = true
        resume()
        const v = m.value as { seconds?: number; duration?: number } | undefined
        if (typeof v?.seconds === 'number') last.current.seconds = v.seconds
        if (typeof v?.duration === 'number' && v.duration > 0) last.current.duration = v.duration
        save()
      } else if (m.event === 'pause') {
        save(true)
      } else if (m.event === 'ended') {
        if (last.current.duration > 0) last.current.seconds = last.current.duration
        save(true)
      }
    }
    function onHide() {
      if (document.visibilityState === 'hidden') save(true)
    }
    window.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', onHide)
    // Novas tentativas de registrar os eventos enquanto o player não responde.
    const retries = [700, 2000, 5000].map((ms) => setTimeout(() => !heard.current && hook(), ms))
    return () => {
      window.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onHide)
      retries.forEach(clearTimeout)
      save(true)
    }
  }, [origin, hook, resume, save])

  // Marca d'água muda de canto a cada 25 s.
  useEffect(() => {
    const t = setInterval(() => setSpot((s) => (s + 1) % 4), 25_000)
    return () => clearInterval(t)
  }, [])

  const corners = ['top-[8%] left-[6%]', 'top-[8%] right-[6%]', 'bottom-[18%] right-[6%]', 'bottom-[18%] left-[6%]']

  return (
    <div>
      <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
        <iframe
          ref={frame}
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          className="absolute inset-0 size-full border-0"
          onLoad={() => setTimeout(() => !heard.current && hook(), 500)}
          data-video-player
        />
        <span
          aria-hidden="true"
          data-watermark
          className={`pointer-events-none absolute ${corners[spot]} select-none text-[11px] font-medium tracking-wide text-white/25 transition-all duration-1000 sm:text-xs`}
        >
          {watermark}
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.())}
          className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Tela cheia
        </button>
      </div>
    </div>
  )
}
