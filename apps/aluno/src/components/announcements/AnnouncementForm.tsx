import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Check, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { saveAnnouncement } from '@/lib/announcements/actions'
import type { AnnouncementVM } from '@/lib/announcements/model'

/**
 * Campos do aviso. Admin escolhe qualquer turma ou "Todas as turmas"; a coordenação só vê as próprias turmas.
 * Um aviso novo nasce como rascunho.
 */
export function AnnouncementForm({
  item,
  cohorts,
  allowAll,
  defaultFrom,
  defaultCohortId,
}: {
  item?: AnnouncementVM
  cohorts: Array<{ id: string; name: string }>
  allowAll: boolean
  defaultFrom: string
  /** Turma sugerida num aviso novo (a em andamento, senão a próxima a começar). */
  defaultCohortId?: string | null
}) {
  const options: Array<[string, string]> = [...(allowAll ? [['todas', 'Todas as turmas'] as [string, string]] : []), ...cohorts.map((c) => [c.id, c.name] as [string, string])]
  return (
    <ActionForm action={saveAnnouncement} submit={item ? 'Salvar alterações' : 'Criar rascunho'} variant={item ? 'secondary' : 'primary'}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Select label="Turma" name="turma" required defaultValue={item ? (item.cohortId ?? 'todas') : (defaultCohortId ?? options[0]?.[0] ?? '')} options={options} />
      <Input label="Título" name="titulo" required maxLength={120} placeholder="Ex.: Clínica de sábado começa às 8h" defaultValue={item?.title} />
      <TextArea label="Texto" name="texto" required maxLength={1000} rows={3} hint="Curto e direto. Não inclua dados que identifiquem pacientes." defaultValue={item?.body} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Exibir de" name="de" type="date" required defaultValue={item?.visibleFrom ?? defaultFrom} />
        <Input label="Exibir até" name="ate" type="date" required defaultValue={item?.visibleUntil ?? defaultFrom} />
      </div>
      <Input label="Assinatura (opcional)" name="assinatura" maxLength={80} placeholder="Ex.: Coordenação clínica" defaultValue={item?.signature ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Link (opcional)" name="link" maxLength={500} placeholder="/cronograma ou https://…" defaultValue={item?.linkUrl ?? ''} />
        <Input label="Texto do link" name="link_texto" maxLength={60} placeholder="Ex.: Ver no cronograma" defaultValue={item?.linkLabel ?? ''} />
      </div>
      <div>
        <Check label="Importante (fica no topo e o aluno não pode dispensar até a data final)" name="importante" defaultChecked={item?.important ?? false} />
      </div>
    </ActionForm>
  )
}
