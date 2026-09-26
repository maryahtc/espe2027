import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Instrument_Serif, Schibsted_Grotesk } from 'next/font/google'
import { DemoBanner, SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { baseUrl, isIndexingEnabled } from '@/config/seo'
import { siteConfig } from '@/config/site'
import { getPortalData } from '@/server/data/repository'
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

async function loadFooterInfo() {
  try {
    const { report } = await getPortalData()
    return { updatedAt: report.generatedAt, isDemo: report.source === 'mock' }
  } catch {
    return { updatedAt: null, isDemo: false }
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { updatedAt, isDemo } = await loadFooterInfo()
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Pular para o conteúdo
        </a>
        {isDemo ? <DemoBanner /> : null}
        <SiteHeader />
        <main id="conteudo" className="mx-auto max-w-[1120px] px-4 md:px-8">
          {children}
        </main>
        <SiteFooter updatedAt={updatedAt} />
      </body>
    </html>
  )
}
