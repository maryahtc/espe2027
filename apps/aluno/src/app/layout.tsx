import type { Metadata, Viewport } from 'next'
import { Outfit, Raleway } from 'next/font/google'
import './globals.css'

// Raleway: texto e títulos (manual Conexo). Outfit: números, no lugar da Gilroy até a licença web.
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway', display: 'swap' })
const numerals = Outfit({ subsets: ['latin'], variable: '--font-numerals', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Portal do Aluno · Conexo', template: '%s · Conexo' },
  description: 'Portal do Aluno da especialização Conexo — Clavijo & Ottoboni.',
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${raleway.variable} ${numerals.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
