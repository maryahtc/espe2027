import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Instrument_Serif, Schibsted_Grotesk } from 'next/font/google'
import { baseUrl, isIndexingEnabled } from '@/config/seo'
import { siteConfig } from '@/config/site'
import './globals.css'

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-instrument-serif' })
const sans = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono' })

export function generateMetadata(): Metadata {
  const index = isIndexingEnabled()
  return {
    metadataBase: new URL(baseUrl()),
    title: { default: siteConfig.name, template: `%s · ${siteConfig.shortName}` },
    description: siteConfig.description,
    robots: index ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  }
}

export const viewport: Viewport = { themeColor: '#f7f6f2', width: 'device-width', initialScale: 1 }

/**
 * Layout raiz: só fontes e <html>/<body>. O cabeçalho e o rodapé do portal ficam em
 * (portal)/layout.tsx — o /playbook tem identidade visual própria.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
