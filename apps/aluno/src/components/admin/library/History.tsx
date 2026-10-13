import type { HistoryEntry } from '@/lib/admin/academic'

const dateTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const LABEL: Record<string, string> = {
  title: 'título', kind: 'tipo', description: 'descrição', category_id: 'área', citation: 'referência', url: 'link', file_path: 'arquivo',
  file_name: 'nome do arquivo', duration_seconds: 'duração', available_from: 'liberação', status: 'situação', phase: 'quando',
  requirement: 'obrigatoriedade', note: 'nota', position: 'ordem', name: 'nome', synonyms: 'sinônimos', origin: 'origem',
  body: 'texto', signature: 'assinatura', link_url: 'link', link_label: 'texto do link', important: 'importante',
  visible_from: 'exibir de', visible_until: 'exibir até', cohort_id: 'turma',
}

function describe(e: HistoryEntry): string {
  if (e.action === 'insert') return 'adicionou'
  if (e.action === 'delete') return 'removeu'
  const fmt = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'sim' : 'não') : Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? (v.length > 40 ? `${v.slice(0, 40)}…` : v) : String(v)
  return Object.keys(e.changes)
    .map((k) => {
      if (k === 'cohort_id') return 'turma alterada'
      const c = e.changes[k] as { de?: unknown; para?: unknown }
      return `${LABEL[k] ?? k}: ${fmt(c?.de)} → ${fmt(c?.para)}`
    })
    .join(' · ')
}

export function HistoryList({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return <p className="text-sm text-muted">Sem alterações registradas.</p>
  return (
    <ol className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
      {history.map((h) => (
        <li key={h.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr]">
          <span className="num text-xs text-muted">{dateTime.format(new Date(h.at))}</span>
          <span className="min-w-0">
            <span className="font-semibold">{h.actor}</span> · {h.table} · <span className="text-ink-2">{describe(h)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
