import 'server-only'
import { createHash } from 'node:crypto'

/**
 * Bunny Stream — camada única de vídeo do portal (trocar de provedor = trocar este arquivo).
 *
 * Segredos só no servidor (variáveis de ambiente, nunca no código nem no navegador):
 * - BUNNY_STREAM_LIBRARY_ID   id da biblioteca de vídeo (teste ou produção)
 * - BUNNY_STREAM_API_KEY      chave da API da biblioteca (cria vídeo, consulta situação, assina envio)
 * - BUNNY_STREAM_TOKEN_KEY    chave de "Embed view token authentication" (assina o player)
 * - BUNNY_STREAM_CDN_HOST     opcional: host da capa (ex.: vz-xxxx.b-cdn.net)
 * Endereços (só mudam no ambiente de teste local, que usa um Bunny simulado):
 * - BUNNY_STREAM_API_BASE (https://video.bunnycdn.com) · BUNNY_STREAM_EMBED_BASE (https://iframe.mediadelivery.net)
 */
export type VideoConfig = {
  libraryId: string
  apiKey: string
  tokenKey: string
  cdnHost: string | null
  apiBase: string
  embedBase: string
}

export function videoConfig(): VideoConfig | null {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim()
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim()
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY?.trim()
  if (!libraryId || !apiKey || !tokenKey) return null
  return {
    libraryId,
    apiKey,
    tokenKey,
    cdnHost: process.env.BUNNY_STREAM_CDN_HOST?.trim() || null,
    apiBase: (process.env.BUNNY_STREAM_API_BASE?.trim() || 'https://video.bunnycdn.com').replace(/\/+$/, ''),
    embedBase: (process.env.BUNNY_STREAM_EMBED_BASE?.trim() || 'https://iframe.mediadelivery.net').replace(/\/+$/, ''),
  }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Assinatura do envio TUS: SHA256(library_id + api_key + expiration_time + video_id). */
export function uploadSignature(cfg: Pick<VideoConfig, 'libraryId' | 'apiKey'>, videoId: string, expires: number): string {
  return sha256(`${cfg.libraryId}${cfg.apiKey}${expires}${videoId}`)
}

/** Token do player: SHA256_HEX(token_security_key + video_id + expiration). Expiração em segundos Unix. */
export function embedToken(cfg: Pick<VideoConfig, 'tokenKey'>, videoId: string, expires: number): string {
  return sha256(`${cfg.tokenKey}${videoId}${expires}`)
}

/** Endereço do player assinado, válido por `ttlSeconds` (padrão 4 h). */
export function signedEmbedUrl(cfg: VideoConfig, videoId: string, ttlSeconds = 4 * 3600, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + ttlSeconds
  const params = new URLSearchParams({ token: embedToken(cfg, videoId, expires), expires: String(expires), autoplay: 'false', preload: 'true', responsive: 'true' })
  return `${cfg.embedBase}/embed/${encodeURIComponent(cfg.libraryId)}/${encodeURIComponent(videoId)}?${params}`
}

export type UploadTicket = { endpoint: string; libraryId: string; videoId: string; signature: string; expires: number }

/** Cria o vídeo no Bunny e devolve o "bilhete" para o navegador enviar o arquivo direto (TUS, retomável). */
export async function createUpload(cfg: VideoConfig, title: string, existingVideoId?: string | null): Promise<UploadTicket> {
  let videoId = existingVideoId ?? null
  if (!videoId) {
    const res = await fetch(`${cfg.apiBase}/library/${encodeURIComponent(cfg.libraryId)}/videos`, {
      method: 'POST',
      headers: { AccessKey: cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ title: title.slice(0, 200) }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Bunny recusou a criação do vídeo (${res.status}).`)
    videoId = ((await res.json()) as { guid?: string }).guid ?? null
    if (!videoId) throw new Error('Bunny não devolveu o identificador do vídeo.')
  }
  const expires = Math.floor(Date.now() / 1000) + 24 * 3600
  return { endpoint: `${cfg.apiBase}/tusupload`, libraryId: cfg.libraryId, videoId, signature: uploadSignature(cfg, videoId, expires), expires }
}

export type VideoState = { status: 'processando' | 'pronto' | 'erro'; durationSeconds: number | null; thumbnailUrl: string | null; encodeProgress: number | null }

type BunnyVideo = {
  status?: number
  length?: number
  encodeProgress?: number
  thumbnailFileName?: string | null
  availableResolutions?: string | null
}

/**
 * Situação do vídeo no Bunny. Pronto quando já existe ao menos uma resolução (ou a codificação chegou a 100%);
 * erro nos códigos de falha da API (5 e 6).
 */
export function interpretVideo(v: BunnyVideo, cfg: Pick<VideoConfig, 'cdnHost'>, videoId: string): VideoState {
  const failed = v.status === 5 || v.status === 6
  const ready = !failed && (v.status === 4 || (v.encodeProgress ?? 0) >= 100 || Boolean(v.availableResolutions))
  const thumbnailUrl = ready && cfg.cdnHost && v.thumbnailFileName ? `https://${cfg.cdnHost}/${videoId}/${v.thumbnailFileName}` : null
  return {
    status: failed ? 'erro' : ready ? 'pronto' : 'processando',
    durationSeconds: v.length && v.length > 0 ? Math.round(v.length) : null,
    thumbnailUrl,
    encodeProgress: typeof v.encodeProgress === 'number' ? v.encodeProgress : null,
  }
}

export async function fetchVideoState(cfg: VideoConfig, videoId: string): Promise<VideoState> {
  const res = await fetch(`${cfg.apiBase}/library/${encodeURIComponent(cfg.libraryId)}/videos/${encodeURIComponent(videoId)}`, {
    headers: { AccessKey: cfg.apiKey, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Bunny respondeu ${res.status} ao consultar o vídeo.`)
  return interpretVideo((await res.json()) as BunnyVideo, cfg, videoId)
}

/** Progresso a gravar: concluído aos 90% (decisão da Maryah); quem já concluiu continua concluído. */
export function videoProgress(seconds: number, duration: number, alreadyDone: boolean) {
  const pos = Math.max(0, Math.floor(seconds))
  const percent = duration > 0 ? Math.min(100, Math.floor((pos / duration) * 100)) : 0
  return { position_seconds: pos, percent, status: alreadyDone || percent >= 90 ? ('concluido' as const) : ('iniciado' as const) }
}
