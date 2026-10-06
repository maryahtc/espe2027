import { Button } from '@portal/ui/button'
import type { Metadata } from 'next'
import { student } from '@/demo/data'

export const metadata: Metadata = { title: 'Meu perfil' }

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-[22px] p-6 sm:p-7">
      <h2 className="eyebrow">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="sr-only">Meu perfil</h1>
      <div className="flex flex-col items-center pb-6 text-center">
        <span className="num relative flex size-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#2a2a2a,#0f0f0f)] text-4xl font-extralight ring-1 ring-white/15">
          {student.initials}
          <span className="absolute right-1.5 bottom-1.5 glow-dot" />
        </span>
        <p className="mt-5 text-3xl font-light tracking-tight">{student.name}</p>
        <p className="mt-1 text-sm text-muted">{student.cohort} · mês {student.monthOfCourse} de {student.totalMonths}</p>
        <span className="mt-4 text-xs text-muted underline underline-offset-2">Trocar foto</span>
      </div>

      <Group title="Dados">
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
      </Group>

      <Group title="Especialização">
        <dl className="grid gap-5 sm:grid-cols-3">
          {[
            ['Turma', '2027'],
            ['Início', 'fevereiro de 2027'],
            ['Previsão de conclusão', 'julho de 2029'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          Mês <span className="num text-ink">{student.monthOfCourse}</span> de <span className="num">{student.totalMonths}</span>
        </p>
      </Group>

      <Group title="Privacidade da produção">
        <fieldset>
          <legend className="text-[15px] font-semibold">Quem vê a minha produção</legend>
          <div className="mt-3 space-y-2">
            <label htmlFor="priv-privada" className="flex cursor-pointer gap-3 glass rounded-2xl p-4 has-[:checked]:border-[rgba(202,44,44,0.7)] has-[:checked]:bg-brand-tint">
              <input id="priv-privada" type="radio" name="privacidade" defaultChecked className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="block text-[15px] font-semibold">Minha produção é privada</span>
                <span className="mt-0.5 block text-sm text-muted">Colegas não veem seus números. Esta é a opção padrão.</span>
              </span>
            </label>
            <label htmlFor="priv-turma" className="flex cursor-pointer gap-3 glass rounded-2xl p-4 has-[:checked]:border-[rgba(202,44,44,0.7)] has-[:checked]:bg-brand-tint">
              <input id="priv-turma" type="radio" name="privacidade" className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="block text-[15px] font-semibold">Quero participar da visualização da turma</span>
                <span className="mt-0.5 block text-sm text-muted">
                  Aparecem só números agregados: total de procedimentos, casos e categorias. Você pode mudar quando quiser.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
        <div className="mt-5 rounded-md bg-sunken p-4 text-sm leading-relaxed">
          <p className="font-semibold">Em qualquer opção</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
            <li>Colegas nunca veem iniciais de pacientes, links do Smile Cloud ou suas dificuldades.</li>
            <li>A coordenação acompanha a produção e os casos da turma para orientar a sua formação.</li>
          </ul>
        </div>
      </Group>

      <Group title="Conta">
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary">
            Alterar senha
          </Button>
          <Button type="button" variant="secondary">
            Sair
          </Button>
        </div>
        <p className="mt-4 text-sm">
          <span className="underline underline-offset-2">Termo de uso</span> ·{' '}
          <span className="underline underline-offset-2">Aviso de privacidade</span>
        </p>
      </Group>
    </div>
  )
}
