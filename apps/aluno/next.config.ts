import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Vídeo (Bunny Stream): player em iframe, envio direto do navegador (TUS) e capas no CDN do Bunny.
const videoApi = new URL(process.env.BUNNY_STREAM_API_BASE || 'https://video.bunnycdn.com').origin
const videoEmbed = new URL(process.env.BUNNY_STREAM_EMBED_BASE || 'https://iframe.mediadelivery.net').origin
const videoThumbs = process.env.BUNNY_STREAM_CDN_HOST ? `https://${process.env.BUNNY_STREAM_CDN_HOST}` : 'https://*.b-cdn.net'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${videoThumbs}`,
  `frame-src ${videoEmbed} https://player.mediadelivery.net`,
  "font-src 'self'",
  `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl}` : ''} ${videoApi}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** Portal do Aluno: nunca indexado por buscadores; cabeçalhos de segurança em todas as rotas. */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ]
  },
}

export default nextConfig
