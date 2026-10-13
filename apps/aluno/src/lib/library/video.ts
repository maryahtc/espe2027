import 'server-only'
import type { ContentVM } from './model'
import { signedEmbedUrl, videoConfig } from '@/lib/video/bunny'

/** Player assinado para a pessoa (marca d'água com o e-mail). Null se o vídeo não estiver pronto ou sem Bunny. */
export function playerFor(item: Pick<ContentVM, 'kind' | 'videoId' | 'videoStatus'>, email: string): { src: string; watermark: string } | null {
  const cfg = videoConfig()
  if (!cfg || item.kind !== 'video' || !item.videoId || item.videoStatus !== 'pronto') return null
  return { src: signedEmbedUrl(cfg, item.videoId), watermark: email || 'Portal do Aluno' }
}
