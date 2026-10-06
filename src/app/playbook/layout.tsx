import type { Viewport } from 'next'
import { Urbanist } from 'next/font/google'

// Geométrica de "a" e "g" de um andar, como a tipografia do material impresso.
const urbanist = Urbanist({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800', '900'], variable: '--font-urbanist' })

export const viewport: Viewport = { themeColor: '#0c0c0c' }

/** Fora de (portal): sem cabeçalho/rodapé claros — o playbook tem identidade própria. */
export default function PlaybookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-playbook="" className={`${urbanist.variable} min-h-dvh`}>
      <main id="conteudo">{children}</main>
    </div>
  )
}
