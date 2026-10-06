import { Button } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { RequirementTag } from '@portal/ui/tag'
import type { Lifecycle } from '@portal/ui/tag'
import Link from 'next/link'
import { type DemoModule, materialsFor, preparation, scheduleFor, teachers } from '@/demo/data'
import { library } from '@/demo/library'
import { formatRange } from '@/lib/dates'
import { ConfirmDialog, LifecycleBar } from './Lifecycle'

const input = 'field mt-1.5 block min-h-11 w-full px-3 text-[15px]'
const label = 'block text-sm font-semibold'

function Block({ index, title, hint, children }: { index: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-rule py-8 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <span className="num block text-sm font-semibold text-signal">{index}</span>
        <h2 className="text-xl font-light tracking-tight">{title}</h2>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="min-w-0 space-y-4 lg:col-span-9">{children}</div>
    </section>
  )
}

/** Editor de módulo (estrutura do MVP 1). Nada é gravado na prévia. */
export function ModuleEditor({ m, status, previewHref }: { m: DemoModule; status: Lifecycle; previewHref: string }) {
  const schedule = scheduleFor(m)
  const materials = materialsFor(m)
  const prep = m.number === 14 ? preparation : library.filter((l) => l.modules.includes(m.number)).map((l) => ({ title: l.title, requirement: 'recomendado' as const }))
  const confirmId = 'confirmar-publicacao'
  return (
    <div>
      <Link href="/admin/modulos" className="text-sm text-muted hover:text-ink">
        ← Módulos e cronograma
      </Link>
      <div className="mt-4 mb-6">
        <p className="eyebrow">Turma 2027 · {status === 'rascunho' ? 'novo módulo' : `módulo ${m.slug}`}</p>
        <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">{m.title}</h1>
        <p className="num mt-1 text-sm text-muted">{formatRange(m.start, m.end)}</p>
      </div>
      <div className="sticky top-14 z-20 lg:top-4">
        <LifecycleBar
          status={status}
          previewHref={previewHref}
          edited={status === 'publicado' ? 'você tem alterações ainda não publicadas' : 'rascunho salvo automaticamente'}
          confirmId={status === 'publicado' ? confirmId : undefined}
        />
      </div>
      {status === 'publicado' ? (
        <ConfirmDialog
          id={confirmId}
          title={`Publicar alterações no Módulo ${m.slug}?`}
          impact={[
            `Datas: de ${formatRange(m.start, m.end, false)} para uma semana depois. O cronograma de 18 alunos muda.`,
            'Uma atividade da programação muda de horário.',
            'Um conteúdo passa de recomendado para obrigatório: entra nas pendências de preparação dos alunos.',
          ]}
          note="Publicar também um aviso no Início da turma explicando a mudança"
          confirmLabel="Publicar alterações"
        />
      ) : null}

      <Block index="01" title="Informações" hint="O que o aluno vê no topo da página do módulo.">
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <div>
            <label htmlFor="m-num" className={label}>
              Número
            </label>
            <input id="m-num" defaultValue={m.slug} className={input} />
          </div>
          <div>
            <label htmlFor="m-tema" className={label}>
              Tema principal
            </label>
            <input id="m-tema" defaultValue={m.title} className={input} />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="m-ini" className={label}>
              Primeiro dia
            </label>
            <input id="m-ini" type="date" defaultValue={m.start} className={input} />
          </div>
          <div>
            <label htmlFor="m-fim" className={label}>
              Último dia
            </label>
            <input id="m-fim" type="date" defaultValue={m.end} className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="m-desc" className={label}>
            Descrição para os alunos
          </label>
          <textarea id="m-desc" rows={3} defaultValue={`${m.title}: fundamentos, demonstração, hands-on e clínica supervisionada.`} className="field mt-1.5 block w-full px-3 py-2.5 text-[15px]" />
        </div>
        <div>
          <p className={label}>Docentes</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {m.teachers.map((t) => (
              <li key={t.slug} className="inline-flex items-center gap-2 rounded-full border border-rule-strong py-1 pr-2 pl-3 text-sm">
                {t.name} <span className="text-muted">×</span>
              </li>
            ))}
            <li>
              <select aria-label="Adicionar docente" defaultValue="" className="field min-h-9 rounded-full px-3 text-sm">
                <option value="">+ Adicionar docente</option>
                {teachers.map((t) => (
                  <option key={t.slug}>{t.name}</option>
                ))}
              </select>
            </li>
          </ul>
        </div>
      </Block>

      <Block index="02" title="Programação" hint="Uma linha por atividade. O aluno vê dia a dia, com horário, docente e tipo.">
        {schedule.map((d, di) => (
          <div key={d.date} className="glass rounded-2xl p-4">
            <p className="eyebrow">Dia {di + 1}</p>
            <ul className="mt-3 space-y-2">
              {d.items.map((it, i) => (
                <li key={it.title} className="grid gap-2 sm:grid-cols-[6rem_6rem_1fr_9rem]">
                  <input aria-label="Início" defaultValue={it.start} className="field min-h-10 px-2 text-sm" />
                  <input aria-label="Fim" defaultValue={it.end} className="field min-h-10 px-2 text-sm" />
                  <input aria-label="Assunto" defaultValue={it.title} className="field min-h-10 px-3 text-sm" />
                  <select aria-label={`Tipo da atividade ${i + 1}`} defaultValue={it.type} className="field min-h-10 px-2 text-sm">
                    {['Teórica', 'Demonstração', 'Hands-on', 'Clínica', 'Discussão de caso'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              <IconPlus size={15} /> Adicionar atividade
            </p>
          </div>
        ))}
      </Block>

      <Block index="03" title="Antes do módulo" hint="Conteúdos da biblioteca. Rascunhos da biblioteca não aparecem para o aluno até serem publicados.">
        <ul className="divide-y divide-rule rounded-2xl border border-rule">
          {prep.map((p) => (
            <li key={p.title} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-semibold">{p.title}</span>
              <span className="flex items-center gap-3">
                <RequirementTag level={p.requirement} />
                <select aria-label="Obrigatoriedade" defaultValue={p.requirement} className="field min-h-9 px-2 text-sm">
                  <option value="obrigatorio">Obrigatório</option>
                  <option value="recomendado">Recomendado</option>
                  <option value="complementar">Complementar</option>
                </select>
                <span className="text-xs text-muted underline underline-offset-2">Remover do módulo</span>
              </span>
            </li>
          ))}
        </ul>
        <input aria-label="Vincular conteúdo" placeholder="+ Vincular conteúdo da biblioteca…" className="field block min-h-11 w-full px-3 text-[15px]" />
      </Block>

      <Block index="04" title="Materiais necessários" hint="Lista que o aluno marca ao separar o material. Grupos livres.">
        {materials.groups.map((g) => (
          <div key={g.title} className="glass rounded-2xl p-4">
            <input aria-label="Nome do grupo" defaultValue={g.title} className="field min-h-10 w-full px-3 text-sm font-semibold" />
            <ul className="mt-2 space-y-1.5">
              {g.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <input aria-label="Item" defaultValue={item} className="field min-h-10 flex-1 px-3 text-sm" />
                  <span className="text-xs text-muted underline underline-offset-2">Remover</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              <IconPlus size={15} /> Adicionar item
            </p>
          </div>
        ))}
        <div>
          <label htmlFor="m-obs" className={label}>
            Observações da coordenação
          </label>
          <textarea id="m-obs" rows={2} defaultValue={materials.notes.join('\n')} className="field mt-1.5 block w-full px-3 py-2.5 text-[15px]" />
        </div>
      </Block>

      <Block index="05" title="Durante e depois" hint="Slides, PDFs e gravações. Ficam visíveis a partir da data que você escolher.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="m-liberar" className={label}>
              Liberar para os alunos em
            </label>
            <input id="m-liberar" type="date" defaultValue={m.start} className={input} />
          </div>
        </div>
        <Button type="button" variant="secondary">
          <IconPlus size={16} /> Adicionar material
        </Button>
      </Block>
    </div>
  )
}
