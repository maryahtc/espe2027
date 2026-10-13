import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { embedToken, interpretVideo, signedEmbedUrl, uploadSignature, videoProgress } from '@/lib/video/bunny'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const cfg = { libraryId: '12345', apiKey: 'api-key', tokenKey: 'token-key', cdnHost: 'vz-abc.b-cdn.net', apiBase: 'https://video.bunnycdn.com', embedBase: 'https://iframe.mediadelivery.net' }

describe('Bunny: assinaturas (conforme a documentação)', () => {
  it('envio TUS = SHA256(library_id + api_key + expiration + video_id)', () => {
    expect(uploadSignature(cfg, 'vid-1', 1700000000)).toBe(sha('12345api-key1700000000vid-1'))
  })

  it('player = SHA256_HEX(token_key + video_id + expiration)', () => {
    expect(embedToken(cfg, 'vid-1', 1700000000)).toBe(sha('token-keyvid-11700000000'))
  })

  it('link do player assinado e com validade em segundos (4 h)', () => {
    const now = Date.UTC(2027, 1, 11, 12, 0, 0)
    const url = new URL(signedEmbedUrl(cfg, 'vid-1', undefined, now))
    expect(url.origin + url.pathname).toBe('https://iframe.mediadelivery.net/embed/12345/vid-1')
    const expires = Number(url.searchParams.get('expires'))
    expect(expires).toBe(now / 1000 + 4 * 3600)
    expect(url.searchParams.get('token')).toBe(sha(`token-keyvid-1${expires}`))
    expect(url.toString()).not.toContain('api-key')
  })
})

describe('Bunny: situação do vídeo', () => {
  it('pronto com resolução disponível; capa no CDN; duração arredondada', () => {
    expect(interpretVideo({ status: 4, length: 412.6, thumbnailFileName: 'thumbnail.jpg', availableResolutions: '360p,720p' }, cfg, 'vid-1')).toEqual({
      status: 'pronto',
      durationSeconds: 413,
      thumbnailUrl: 'https://vz-abc.b-cdn.net/vid-1/thumbnail.jpg',
      encodeProgress: null,
    })
  })
  it('processando e erro', () => {
    expect(interpretVideo({ status: 3, encodeProgress: 40 }, cfg, 'v').status).toBe('processando')
    expect(interpretVideo({ status: 5 }, cfg, 'v').status).toBe('erro')
    expect(interpretVideo({ status: 6 }, cfg, 'v').status).toBe('erro')
  })
})

describe('Progresso do vídeo', () => {
  it('conclui aos 90%', () => {
    expect(videoProgress(89 * 6, 600, false)).toMatchObject({ percent: 89, status: 'iniciado' })
    expect(videoProgress(540, 600, false)).toMatchObject({ percent: 90, status: 'concluido' })
  })
  it('quem já concluiu continua concluído ao rever', () => {
    expect(videoProgress(30, 600, true)).toMatchObject({ position_seconds: 30, status: 'concluido' })
  })
})
