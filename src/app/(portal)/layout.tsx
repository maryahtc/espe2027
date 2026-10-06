import { ChromeEnhancer } from '@/components/Enhancer'
import { DemoBanner, PreviewBanner, SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getPortalData } from '@/server/data/repository'

async function loadFooterInfo() {
  try {
    const { report } = await getPortalData()
    return { updatedAt: report.generatedAt, source: report.source }
  } catch {
    return { updatedAt: null, source: null }
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { updatedAt, source } = await loadFooterInfo()
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Pular para o conteúdo
      </a>
      {source === 'mock' ? <DemoBanner /> : null}
      {source === 'preview' ? <PreviewBanner /> : null}
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-[1120px] px-4 md:px-8">
        {children}
      </main>
      <SiteFooter updatedAt={updatedAt} />
      <ChromeEnhancer />
    </>
  )
}
