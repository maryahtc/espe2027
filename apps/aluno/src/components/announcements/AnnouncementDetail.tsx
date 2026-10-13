import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Block } from '@/components/admin/academic/ui'
import { HistoryList } from '@/components/admin/library/History'
import type { HistoryEntry } from '@/lib/admin/academic'
import { today } from '@/lib/academic/load'
import type { CohortVM } from '@/lib/academic/model'
import { deleteAnnouncement, setAnnouncementStatus } from '@/lib/announcements/actions'
import { type AnnouncementVM, situation, SITUATION_LABEL } from '@/lib/announcements/model'
import { AnnouncementCard } from './AnnouncementCard'
import { AnnouncementForm } from './AnnouncementForm'
import { periodLabel } from './AnnouncementsPanel'

/** Página de um aviso: situação e ações (publicar, arquivar…), edição, prévia "como o aluno vê" e histórico. */
export function AnnouncementDetail({
  base,
  item,
  cohorts,
  allowAll,
  history,
  created,
}: {
  base: string
  item: AnnouncementVM
  cohorts: CohortVM[]
  allowAll: boolean
  history: HistoryEntry[]
  created: boolean
}) {
  const day = today()
  const s = situation(item, day)
  const status = (para: string, label: string, confirmText?: string, variant: 'primary' | 'secondary' = 'secondary') => (
    <ActionForm action={setAnnouncementStatus} submit={label} variant={variant} confirmText={confirmText} row>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="para" value={para} />
    </ActionForm>
  )
  const audience = item.cohortId ? `a ${item.cohortName}` : 'todas as turmas'
  return (
    <>
      <Link href={base} className="text-sm text-muted hover:text-ink">
        ← Avisos
      </Link>
      <PageTitle eyebrow={item.cohortId ? (item.cohortName ?? 'Turma') : 'Todas as turmas'} title={item.title} lead={periodLabel(item)} />

      {created ? (
        <p role="status" className="mb-6 rounded-2xl border border-rule bg-surface px-4 py-3 text-sm">
          ✓ Rascunho criado. Confira a prévia e publique quando estiver pronto.
        </p>
      ) : null}

      <div className="glass-strong mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={item.status} />
          <span data-situacao={s} className="font-semibold">
            {SITUATION_LABEL[s]}
          </span>
          <span className="text-muted">
            {s === 'no-ar'
              ? 'aparece agora no Início dos alunos.'
              : s === 'programado'
                ? 'publicado; começa a aparecer na data de início.'
                : s === 'encerrado'
                  ? 'o período terminou; não aparece mais.'
                  : s === 'rascunho'
                    ? 'invisível aos alunos.'
                    : 'fora da vista dos alunos; histórico mantido.'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {item.status === 'rascunho'
            ? status('publicar', 'Publicar', `Publicar este aviso para ${audience}? Ele aparece no Início dentro do período.`, 'primary')
            : null}
          {item.status === 'publicado' ? status('arquivar', 'Arquivar', 'Arquivar? O aviso sai do Início dos alunos na hora; o histórico fica.') : null}
          {item.status === 'arquivado' ? status('rascunho', 'Restaurar como rascunho') : null}
          {item.status === 'rascunho' && !item.publishedAt ? (
            <ActionForm action={deleteAnnouncement} submit="Excluir rascunho" quiet confirmText="Excluir este rascunho? Não dá para desfazer.">
              <input type="hidden" name="id" value={item.id} />
            </ActionForm>
          ) : null}
        </div>
      </div>

      <Block index="01" title="Como o aluno vê" hint="No Início, os importantes ficam no topo e não têm “Entendi”.">
        <AnnouncementCard item={item} />
      </Block>

      <Block
        index="02"
        title="Editar"
        hint={item.status === 'publicado' ? 'As alterações de um aviso publicado aparecem na hora para os alunos.' : 'Rascunho: os alunos não veem nada até publicar.'}
      >
        <AnnouncementForm item={item} cohorts={cohorts} allowAll={allowAll} defaultFrom={day} />
      </Block>

      <Block index="03" title="Histórico" hint="Quem alterou, quando e o que mudou.">
        <HistoryList history={history} />
      </Block>
    </>
  )
}
