import { ButtonLink } from '@portal/ui/button'
import { RequirementTag, StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Check, Editable, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { HistoryList } from '@/components/admin/library/History'
import { LibraryUpload } from '@/components/admin/library/LibraryUpload'
import { VideoUpload } from '@/components/admin/library/VideoUpload'
import { videoConfig } from '@/lib/video/bunny'
import { requireUser } from '@/lib/auth/session'
import { moduleLabel } from '@/lib/academic/model'
import { loadAdminContent } from '@/lib/admin/library'
import {
  deleteDraftContent,
  linkModule,
  removeAttachment,
  setContentCohorts,
  setContentFaculty,
  setContentStatus,
  setContentTopics,
  setMainFile,
  unlinkModule,
  updateContent,
} from '@/lib/admin/library-actions'
import { KIND_LABEL, KINDS, PHASE_LABEL, REQUIREMENT_LABEL } from '@/lib/library/model'

export const metadata: Metadata = { title: 'Editar conteúdo' }

const PHASES = Object.entries(PHASE_LABEL) as Array<[string, string]>
const LEVELS = Object.entries(REQUIREMENT_LABEL) as Array<[string, string]>

function splitRelease(iso: string | null) {
  if (!iso) return { d: '', t: '' }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso))
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  return { d: `${g('year')}-${g('month')}-${g('day')}`, t: `${g('hour')}:${g('minute')}` }
}

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(['admin'])
  const page = await loadAdminContent((await params).id)
  if (!page) notFound()
  const { content: c, attachments, categories, topics, faculty, cohorts, modules, history } = page
  const release = splitRelease(c.availableFrom)
  const chosenTopics = new Set(c.topics.map((t) => t.id))
  const chosenFaculty = new Set(c.faculty.map((f) => f.id))
  const linked = new Set(c.modules.map((m) => m.moduleId))
  const hasFile = c.kind !== 'link' && c.kind !== 'video'
  const cohortsOfModules = [...new Map(modules.map((m) => [m.cohortId, m.cohortName])).entries()]

  return (
    <div>
      <Link href="/admin/conteudos" className="text-sm text-muted hover:text-ink">
        ← Aulas e conteúdos
      </Link>
      <div className="mt-4">
        <p className="eyebrow">
          {KIND_LABEL[c.kind]} · {c.category}
        </p>
        <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">{c.title}</h1>
      </div>

      <div className="glass-strong sticky top-14 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 lg:top-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={c.status} />
          <span className="text-muted">
            {c.status === 'publicado' ? 'na biblioteca · alterações valem na hora' : c.status === 'rascunho' ? 'invisível para os alunos' : 'fora da biblioteca; nada foi apagado'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.status !== 'arquivado' ? (
            <ActionForm action={setContentStatus} submit="Arquivar" quiet confirmText="Arquivar este conteúdo? Ele sai da biblioteca e dos módulos; nada é apagado e dá para restaurar.">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="arquivado" />
            </ActionForm>
          ) : null}
          {!c.publishedAt && c.status === 'rascunho' ? (
            <ActionForm action={deleteDraftContent} submit="Excluir rascunho" quiet confirmText="Excluir de vez este rascunho (nunca publicado)?">
              <input type="hidden" name="id" value={c.id} />
            </ActionForm>
          ) : null}
          <ButtonLink href={`/admin/conteudos/${c.id}/previa`} variant="secondary">
            Pré-visualizar como aluno
          </ButtonLink>
          {c.status === 'publicado' ? (
            <ActionForm action={setContentStatus} submit="Voltar a rascunho" confirmText="Tirar este conteúdo da biblioteca (voltar a rascunho)?">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="rascunho" />
            </ActionForm>
          ) : (
            <ActionForm action={setContentStatus} submit={c.status === 'arquivado' ? 'Restaurar como rascunho' : 'Publicar'} variant="primary">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value={c.status === 'arquivado' ? 'rascunho' : 'publicado'} />
            </ActionForm>
          )}
        </div>
      </div>

      <Block index="01" title="Dados" hint="Título, descrição e referência aparecem para o aluno e entram na busca.">
        <ActionForm action={updateContent}>
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Tipo" name="tipo" defaultValue={c.kind} options={KINDS.map((k) => [k, KIND_LABEL[k]])} />
            <Select label="Área" name="area" defaultValue={c.categoryId} options={categories.map((x) => [x.id, x.name])} />
          </div>
          <Input label="Título" name="titulo" required maxLength={200} defaultValue={c.title} />
          <TextArea label="Descrição" name="descricao" rows={4} defaultValue={c.description ?? ''} />
          <TextArea label="Referência bibliográfica (opcional)" name="referencia" rows={2} defaultValue={c.citation ?? ''} hint="Para artigos, capítulos e livros." />
          <Input label="Link externo (opcional)" name="link" type="url" placeholder="https://…" defaultValue={c.url ?? ''} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Duração em minutos (opcional)" name="duracao" type="number" min={1} max={1440} defaultValue={c.durationSeconds ? Math.round(c.durationSeconds / 60) : ''} />
            <Input label="Liberar a partir de (opcional)" name="liberar_data" type="date" defaultValue={release.d} />
            <Input label="Horário" name="liberar_hora" type="time" defaultValue={release.t} />
          </div>
        </ActionForm>
      </Block>

      {c.kind === 'video' ? (
        <Block index="02" title="Vídeo" hint="Vai direto do seu navegador para o Bunny. Duração e capa chegam sozinhas quando o processamento termina. O aluno assiste por link assinado, com marca d'água do e-mail.">
          {c.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- capa vinda do Bunny (CDN próprio)
            <img src={c.thumbnailUrl} alt="" className="aspect-video w-full max-w-sm rounded-xl object-cover ring-1 ring-white/10" />
          ) : null}
          {c.durationSeconds ? <p className="num text-sm text-muted">Duração: {Math.round(c.durationSeconds / 60)} min</p> : null}
          <VideoUpload contentId={c.id} status={c.videoStatus} configured={Boolean(videoConfig())} />
        </Block>
      ) : null}

      {hasFile ? (
        <Block index="02" title="Arquivo principal" hint="PDF ou slides. Vai direto para o armazenamento privado; o aluno abre por link temporário e pode baixar.">
          {c.filePath ? (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-rule bg-surface px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{c.fileName ?? 'Arquivo enviado'}</span>
              <a href={`/biblioteca/arquivo/${c.id}`} target="_blank" rel="noopener" className="font-semibold hover:underline">
                Abrir
              </a>
              <ActionForm action={setMainFile} submit="Retirar" quiet confirmText="Retirar o arquivo deste conteúdo? (O arquivo continua guardado.)">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="remover" value="sim" />
              </ActionForm>
            </div>
          ) : null}
          <AddPanel label={c.filePath ? 'Trocar arquivo' : 'Enviar arquivo'}>
            <LibraryUpload contentId={c.id} mode="principal" />
          </AddPanel>
        </Block>
      ) : null}

      <Block index="03" title="Temas" hint="Ligam o conteúdo à página do tema, à busca e aos relacionados. Crie temas novos em Admin → Temas.">
        <ActionForm action={setContentTopics} submit="Salvar temas">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-6 sm:grid-cols-2">
            {categories.map((cat) => {
              const list = topics.filter((t) => t.categoryId === cat.id)
              if (!list.length) return null
              return (
                <fieldset key={cat.id}>
                  <legend className="eyebrow text-[10px]">{cat.name}</legend>
                  <div className="mt-1 flex flex-col">
                    {list.map((t) => (
                      <Check key={t.id} label={t.name} name="temas" value={t.id} defaultChecked={chosenTopics.has(t.id)} className="min-h-9" />
                    ))}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </ActionForm>
      </Block>

      <Block index="04" title="Professores" hint="Escolhidos entre os docentes cadastrados (Docentes e coordenação).">
        <ActionForm action={setContentFaculty} submit="Salvar professores">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-x-6 sm:grid-cols-3">
            {faculty
              .filter((f) => f.active || chosenFaculty.has(f.id))
              .map((f) => (
                <Check key={f.id} label={f.honorific ? `${f.honorific} ${f.name}` : f.name} name="docentes" value={f.id} defaultChecked={chosenFaculty.has(f.id)} className="min-h-9" />
              ))}
          </div>
        </ActionForm>
      </Block>

      <Block index="05" title="Materiais complementares" hint="PDFs ou links extras. O aluno pode abrir e baixar.">
        {attachments.length ? (
          <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {attachments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{a.title}</span>
                  <span className="ml-2 text-xs text-muted">{a.url ? 'link' : (a.fileName ?? 'arquivo')}</span>
                </span>
                <a href={a.url ? `/biblioteca/abrir/${c.id}?anexo=${a.id}` : `/biblioteca/arquivo/${c.id}?anexo=${a.id}`} target="_blank" rel="noopener" className="text-xs font-semibold hover:underline">
                  Abrir
                </a>
                <ActionForm action={removeAttachment} submit="Retirar" quiet confirmText={`Retirar "${a.title}"?`}>
                  <input type="hidden" name="id" value={a.id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum material complementar.</p>
        )}
        <AddPanel label="Adicionar material">
          <LibraryUpload contentId={c.id} mode="anexo" />
        </AddPanel>
      </Block>

      <Block index="06" title="Disponível para" hint="Padrão: todas as turmas (inclusive as futuras). Restrinja só quando o conteúdo for de uma turma específica.">
        <ActionForm action={setContentCohorts}>
          <input type="hidden" name="id" value={c.id} />
          <fieldset className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="disponivel" value="todas" defaultChecked={!c.cohortIds.length} className="accent-[var(--brand)]" /> Todas as turmas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="disponivel" value="turmas" defaultChecked={c.cohortIds.length > 0} className="accent-[var(--brand)]" /> Só as turmas marcadas:
            </label>
            <div className="flex flex-wrap gap-x-6 pl-6">
              {cohorts.map((t) => (
                <Check key={t.id} label={t.name} name="turmas" value={t.id} defaultChecked={c.cohortIds.includes(t.id)} />
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </Block>

      <Block index="07" title="Módulos" hint="Aparece no módulo do aluno em Antes, Durante ou Depois, com a obrigatoriedade.">
        {c.modules.length ? (
          <ul className="space-y-2">
            {c.modules.map((m) => {
              const cohortName = modules.find((x) => x.id === m.moduleId)?.cohortName ?? ''
              return (
                <li key={m.moduleId}>
                  <Editable
                    summary={
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="num font-semibold text-muted">{moduleLabel(m.number)}</span>
                        <span className="font-semibold">{m.theme || m.title}</span>
                        <span className="text-xs text-muted">{cohortName}</span>
                        <span className="text-xs text-muted">{PHASE_LABEL[m.phase]}</span>
                        <RequirementTag level={m.requirement} />
                      </span>
                    }
                  >
                    <ActionForm action={linkModule} row>
                      <input type="hidden" name="conteudo" value={c.id} />
                      <input type="hidden" name="modulo" value={m.moduleId} />
                      <Select label="Quando" name="fase" defaultValue={m.phase} options={PHASES} />
                      <Select label="Obrigatoriedade" name="obrigatoriedade" defaultValue={m.requirement} options={LEVELS} />
                      <Input label="Nota (opcional)" name="nota" defaultValue={m.note ?? ''} className="min-w-[14rem] flex-1" />
                    </ActionForm>
                    <ActionForm action={unlinkModule} submit="Retirar do módulo" quiet className="mt-3">
                      <input type="hidden" name="conteudo" value={c.id} />
                      <input type="hidden" name="modulo" value={m.moduleId} />
                    </ActionForm>
                  </Editable>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Ainda não ligado a nenhum módulo.</p>
        )}
        <AddPanel label="Ligar a um módulo">
          <ActionForm action={linkModule} submit="Ligar" row>
            <input type="hidden" name="conteudo" value={c.id} />
            <input type="hidden" name="novo" value="1" />
            <label className="block min-w-[18rem] flex-1">
              <span className="block text-sm font-semibold">Módulo</span>
              <select name="modulo" className="field mt-1.5 block min-h-11 w-full px-3 text-[15px]">
                {cohortsOfModules.map(([cid, cname]) => (
                  <optgroup key={cid} label={cname}>
                    {modules
                      .filter((m) => m.cohortId === cid && !linked.has(m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {`Módulo ${moduleLabel(m.number)}${m.theme ? ` · ${m.theme}` : ''}${m.status === 'rascunho' ? ' (rascunho)' : ''}`}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <Select label="Quando" name="fase" defaultValue="antes" options={PHASES} />
            <Select label="Obrigatoriedade" name="obrigatoriedade" defaultValue="recomendado" options={LEVELS} />
          </ActionForm>
        </AddPanel>
      </Block>

      <Block index="08" title="Histórico" hint="Quem alterou, quando e o que mudou (últimas 40 alterações).">
        <HistoryList history={history} />
      </Block>
    </div>
  )
}
