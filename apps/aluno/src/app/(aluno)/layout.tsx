import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { StudentBottomNav, StudentSidebar, StudentTopBar } from '@/components/shell/StudentNav'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-on-ink"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <StudentSidebar />
        <div className="min-w-0 flex-1">
          <PreviewBanner />
          <StudentTopBar />
          <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:px-6 lg:px-12 lg:pt-10 lg:pb-20">
            {children}
          </main>
        </div>
      </div>
      <StudentBottomNav />
    </>
  )
}
