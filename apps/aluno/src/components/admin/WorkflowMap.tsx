import { stepOrder, successors, type WorkflowGraph, type WorkflowNode } from '@/lib/workflow'

const TYPE_LABEL: Record<WorkflowNode['type'], string> = {
  pergunta: 'Pergunta',
  orientacao: 'Orientação',
  alerta: 'Alerta',
  conteudo: 'Conteúdo',
  resultado: 'Resultado',
}

const W = 166
const H = 58
const COL = 206
const ROW = 84

/**
 * Mapa automático da árvore (somente leitura): colunas por profundidade, a partir do início.
 * Cada caixa leva à etapa correspondente no editor.
 */
export function WorkflowMap({ graph }: { graph: WorkflowGraph }) {
  const order = stepOrder(graph)
  const num = new Map(order.map((k, i) => [k, String(i + 1).padStart(2, '0')]))
  // Profundidade = maior distância a partir do início (as setas sempre vão para a direita).
  const depth = new Map<string, number>([[graph.start, 0]])
  for (let pass = 0; pass < order.length; pass++) {
    for (const k of order) {
      const d = depth.get(k)
      const node = graph.nodes[k]
      if (d === undefined || !node) continue
      for (const s of successors(node)) if ((depth.get(s) ?? -1) < d + 1 && graph.nodes[s]) depth.set(s, d + 1)
    }
  }
  const orphanCol = Math.max(0, ...depth.values()) + 1
  const cols = new Map<number, string[]>()
  for (const k of order) {
    const d = depth.get(k) ?? orphanCol
    cols.set(d, [...(cols.get(d) ?? []), k])
  }
  const pos = new Map<string, { x: number; y: number }>()
  const maxRows = Math.max(...[...cols.values()].map((c) => c.length))
  for (const [d, keys] of cols) {
    const offset = ((maxRows - keys.length) * ROW) / 2
    keys.forEach((k, i) => pos.set(k, { x: 12 + d * COL, y: 12 + offset + i * ROW }))
  }
  const width = 24 + Math.max(...[...cols.keys()]) * COL + W
  const height = 24 + maxRows * ROW - (ROW - H)

  const edges: Array<{ from: string; to: string; label: string }> = []
  for (const k of order) {
    const n = graph.nodes[k]!
    if (n.type === 'pergunta') for (const o of n.options) edges.push({ from: k, to: o.next, label: o.label })
    else if (n.type !== 'resultado') edges.push({ from: k, to: n.next, label: '' })
  }

  return (
    <div className="overflow-x-auto glass rounded-2xl p-3">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa do workflow" className="block">
        {edges.map((e, i) => {
          const a = pos.get(e.from)
          const b = pos.get(e.to)
          if (!a || !b) return null
          const x1 = a.x + W
          const y1 = a.y + H / 2
          const x2 = b.x
          const y2 = b.y + H / 2
          const mx = (x1 + x2) / 2
          return (
            <g key={i}>
              <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}`} fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
              <path d={`M${x2 - 7},${y2 - 4} L${x2},${y2} L${x2 - 7},${y2 + 4}`} fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
              {e.label ? (
                <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize="10.5" fill="var(--muted)" style={{ fontFamily: 'var(--font-sans)' }}>
                  {e.label.length > 18 ? `${e.label.slice(0, 17)}…` : e.label}
                </text>
              ) : null}
            </g>
          )
        })}
        {order.map((k) => {
          const p = pos.get(k)!
          const n = graph.nodes[k]!
          const orphan = !depth.has(k)
          const start = k === graph.start
          return (
            <a key={k} href={`#etapa-${num.get(k)}`}>
              <rect
                x={p.x}
                y={p.y}
                width={W}
                height={H}
                rx="6"
                fill={start ? 'rgba(202,44,44,0.16)' : 'var(--surface)'}
                stroke={orphan ? 'var(--danger)' : start ? 'var(--brand)' : n.type === 'resultado' ? 'rgba(255,255,255,0.45)' : 'var(--rule-strong)'}
                strokeDasharray={orphan ? '4 3' : undefined}
                strokeWidth={n.type === 'resultado' ? 1.5 : 1}
              />
              <text x={p.x + 10} y={p.y + 19} fontSize="10" fontWeight="600" fill={start ? 'var(--signal)' : 'var(--muted)'} style={{ fontFamily: 'var(--font-num)', letterSpacing: '0.04em' }}>
                {num.get(k)} · {TYPE_LABEL[n.type].toUpperCase()}
                {orphan ? ' · SOLTA' : ''}
              </text>
              <text x={p.x + 10} y={p.y + 39} fontSize="12" fontWeight="600" fill="var(--ink)" style={{ fontFamily: 'var(--font-sans)' }}>
                {n.title.length > 23 ? `${n.title.slice(0, 22)}…` : n.title}
              </text>
            </a>
          )
        })}
      </svg>
    </div>
  )
}
