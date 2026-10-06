import { IconArrowRight, IconBranch } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { workflows } from '@/demo/workflows'

export const metadata: Metadata = { title: 'Workflow clínico' }

export default function WorkflowsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Pensar"
        title="Workflow clínico"
        lead="Escolha uma situação clínica para começar. Você responde uma pergunta por vez e, no fim, compara os caminhos possíveis e os critérios de cada um."
      />
      <ul className="grid gap-3 md:grid-cols-3">
        {workflows.map((w) => {
          const steps = Object.keys(w.graph.nodes).length
          return (
            <li key={w.slug}>
              <Link
                href={`/workflows/${w.slug}`}
                className="group flex h-full flex-col rounded-lg border border-rule bg-surface p-6 transition-colors hover:border-ink"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-sunken">
                  <IconBranch size={20} />
                </span>
                <span className="eyebrow mt-5 text-[10px]">{w.category}</span>
                <span className="mt-1 text-xl leading-tight font-light tracking-tight">{w.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{w.summary}</span>
                <span className="mt-5 flex items-center justify-between border-t border-rule pt-4 text-sm font-semibold">
                  Começar
                  <span className="num text-xs font-normal text-muted">{steps} etapas possíveis</span>
                  <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-12 grid gap-6 border-t border-rule pt-8 md:grid-cols-3">
        {[
          ['Uma pergunta por vez', 'Cada etapa pede que você observe algo antes de escolher.'],
          ['Volte quando quiser', 'A trilha à esquerda mostra suas escolhas; mude qualquer uma delas.'],
          ['Caminhos, não respostas', 'No fim, você compara caminhos possíveis e os critérios que sustentam cada um.'],
        ].map(([t, d]) => (
          <div key={t}>
            <p className="text-[15px] font-semibold">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
    </>
  )
}
