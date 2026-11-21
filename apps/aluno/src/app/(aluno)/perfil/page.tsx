import { ButtonLink } from '@portal/ui/button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { NameForm } from '@/components/people/NameForm'
import { student } from '@/demo/data'
import { studentArea } from '@/lib/academic/student'
import { getAuth } from '@/lib/auth/session'
import { PRIVACY_NOTES, VISIBILITY } from '@/lib/privacy/access'
import { monthLong, year } from '@/lib/dates'
import { ExitSimulationButton } from '@/components/simulation/SimulationBanner'
import { getSimulation } from '@/lib/simulation/session'
import { SIM_STUDENT_NAME } from '@/lib/simulation/labels'
import { guardStudentPage } from '@/lib/simulation/guard'

export const metadata: Metadata = { title: 'Meu perfil' }

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-[22px] p-6 sm:p-7">
      <h2 className="eyebrow">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default async function ProfilePage() {
  await guardStudentPage({ ownProfile: true })
  const [auth, area, sim] = await Promise.all([getAuth(), studentArea(), getSimulation()])
  const account = auth && auth !== 'previa' ? auth : null
  const name = sim ? SIM_STUDENT_NAME : account ? account.displayName || account.fullName : student.name
  const initials = account
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : student.initials
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="sr-only">Meu perfil</h1>
      <div className="flex flex-col items-center pb-6 text-center">
        <span className="num relative flex size-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#2a2a2a,#0f0f0f)] text-4xl font-extralight ring-1 ring-white/15">
          {initials}
          <span className="absolute right-1.5 bottom-1.5 glow-dot" />
        </span>
        <p className="mt-5 text-3xl font-light tracking-tight">{name}</p>
        {area ? (
          <p className="mt-1 text-sm text-muted">
            {area.cohort.name}
            {area.month.current > 0 ? ` · mês ${area.month.current} de ${area.month.total}` : ''}
          </p>
        ) : account ? null : (
          <p className="mt-1 text-sm text-muted">{student.cohort} · mês {student.monthOfCourse} de {student.totalMonths}</p>
        )}
      </div>

      <Group title="Dados">
        {sim ? (
          <p className="text-sm text-muted" data-simulacao>
            Simulação: aqui o aluno vê e corrige o próprio nome e o e-mail da conta. Na simulação, nenhum dado da conta é mostrado ou alterado.
          </p>
        ) : account ? (
          <NameForm fullName={account.fullName} displayName={account.displayName} email={account.email} />
        ) : (
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">E-mail</dt>
              <dd className="mt-0.5 text-[15px]">ana.lima@email.com</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Nome de exibição</dt>
              <dd className="mt-0.5 text-[15px]">Ana Lima</dd>
            </div>
          </dl>
        )}
      </Group>

      {area ? (
        <Group title="Especialização">
          <dl className="grid gap-5 sm:grid-cols-3">
            {[
              ['Turma', area.cohort.name],
              ['Início', `${monthLong(area.cohort.startsOn)} de ${year(area.cohort.startsOn)}`],
              [area.cohort.status === 'encerrada' ? 'Conclusão' : 'Previsão de conclusão', `${monthLong(area.cohort.endsOn)} de ${year(area.cohort.endsOn)}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
          {area.month.current > 0 ? (
            <p className="mt-4 text-sm text-muted">
              Mês <span className="num text-ink">{area.month.current}</span> de <span className="num">{area.month.total}</span>
            </p>
          ) : null}
        </Group>
      ) : null}

      <section id="privacidade" aria-labelledby="privacidade-t" className="glass scroll-mt-24 rounded-[22px] p-6 sm:p-7" data-privacidade>
        <h2 id="privacidade-t" className="eyebrow">
          Quem vê o quê
        </h2>
        <p className="mt-4 text-sm text-ink-2">
          Estas regras valem para todos os alunos e são garantidas pelo próprio banco de dados. Não há opção a ligar ou desligar.
        </p>
        <ul className="mt-5 space-y-3" data-quem-ve-lista>
          {VISIBILITY.map((r) => (
            <li key={r.id} className="rounded-2xl border border-rule p-4" data-quem-ve={r.id}>
              <p className="text-[15px] font-semibold">{r.what}</p>
              {r.detail ? <p className="mt-0.5 text-xs text-muted">{r.detail}</p> : null}
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                {(
                  [
                    ['voce', 'Você', r.you],
                    ['colegas', 'Colegas', r.colleagues],
                    ['coordenacao', 'Coordenação', r.coordination],
                    ['admin', 'Admin', r.admin],
                  ] as const
                ).map(([k, label, v]) => (
                  <div key={k} data-pessoa={k} data-ve={v.yes ? 'sim' : 'nao'}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className={v.yes ? 'text-sm text-ink' : 'text-sm text-muted'}>
                      {v.yes ? 'Vê' : 'Não vê'}
                      {v.note ? <span className="block text-xs text-muted">{v.note}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-ink-2" data-privacidade-notas>
          {PRIVACY_NOTES.map((x) => (
            <li key={x.id} data-nota={x.id}>
              {x.text}
            </li>
          ))}
        </ul>
      </section>

      <Group title="Conta">
        {sim ? (
          <div className="flex flex-wrap gap-3">
            <ExitSimulationButton />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/definir-senha" variant="secondary">
              Alterar senha
            </ButtonLink>
            <SignOutButton />
          </div>
        )}
        <p className="mt-4 text-sm">
          <Link href="/termo?next=/perfil" className="underline underline-offset-2">
            Termo de uso
          </Link>{' '}
          ·{' '}
          <Link href="#privacidade" className="underline underline-offset-2">
            Quem vê o quê
          </Link>
        </p>
      </Group>
    </div>
  )
}
