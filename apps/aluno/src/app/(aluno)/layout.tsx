import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { student } from '@/demo/data'
import { currentCohort } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { StudentBottomNav, StudentSidebar, StudentTopBar } from '@/components/shell/StudentNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser()
  const cohort = auth ? await currentCohort() : null
  // Sem Supabase (modo prévia), mantém a pessoa fictícia da Etapa 1.
  const name = auth ? (auth.displayName || auth.fullName || auth.email).trim() : student.name
  const viewer = {
    name,
    initials: auth
      ? name
          .split(/[\s@.]+/)
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : student.initials,
    cohort: auth ? (cohort?.name.split('|').at(-1)?.trim() ?? '') : student.cohort,
  }
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-on-ink"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <StudentSidebar viewer={viewer} />
        <div className="min-w-0 flex-1">
          <PreviewBanner />
          <StudentTopBar viewer={viewer} />
          <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:px-6 lg:px-12 lg:pt-10 lg:pb-20">
            {children}
          </main>
        </div>
      </div>
      <StudentBottomNav />
    </>
  )
}
