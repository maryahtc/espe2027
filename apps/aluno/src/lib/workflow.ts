/**
 * Formato do workflow clínico (arquitetura, seção G.1) e funções puras do "motor".
 * O caminho percorrido pelo aluno vive na URL: cada segmento é a chave de uma resposta.
 * Ex.: /workflows/abordagem-anterior/cor/escurecido-sim/seguir
 */
export type NodeKey = string

export type ContentRef = { slug: string }

type Common = {
  title: string
  body?: string
  topics?: string[]
  contents?: ContentRef[]
}

export type WorkflowNode =
  | (Common & { type: 'pergunta'; options: Array<{ key: string; label: string; hint?: string; next: NodeKey }> })
  | (Common & { type: 'orientacao'; points?: string[]; next: NodeKey })
  | (Common & { type: 'alerta'; next: NodeKey })
  | (Common & { type: 'conteudo'; next: NodeKey })
  | (Common & {
      type: 'resultado'
      paths: Array<{ name: string; criteria: string[] }>
      reminder?: string
    })

export type WorkflowGraph = { start: NodeKey; nodes: Record<NodeKey, WorkflowNode> }

/** Chave usada na URL para "continuar" em nós sem escolha (orientação, alerta, conteúdo). */
export const CONTINUE = 'seguir'

export type TrailStep = { nodeKey: NodeKey; node: WorkflowNode; choiceKey: string; choiceLabel: string; path: string[] }

export type Resolved = { node: WorkflowNode; nodeKey: NodeKey; trail: TrailStep[]; path: string[] }

/** Percorre o grafo a partir do início seguindo as chaves do caminho. null = caminho inválido. */
export function resolvePath(graph: WorkflowGraph, path: string[]): Resolved | null {
  let key = graph.start
  const trail: TrailStep[] = []
  for (let i = 0; i < path.length; i++) {
    const node = graph.nodes[key]
    if (!node) return null
    const step = path[i]!
    let next: NodeKey | undefined
    let label = 'Continuar'
    if (node.type === 'pergunta') {
      const opt = node.options.find((o) => o.key === step)
      next = opt?.next
      label = opt?.label ?? ''
    } else if (node.type !== 'resultado' && step === CONTINUE) {
      next = node.next
    }
    if (!next) return null
    trail.push({ nodeKey: key, node, choiceKey: step, choiceLabel: label, path: path.slice(0, i) })
    key = next
  }
  const node = graph.nodes[key]
  return node ? { node, nodeKey: key, trail, path } : null
}

/** Todos os caminhos possíveis a partir do início (para gerar as páginas estáticas). */
export function enumeratePaths(graph: WorkflowGraph, limit = 500): string[][] {
  const out: string[][] = []
  const walk = (key: NodeKey, path: string[], seen: Set<NodeKey>) => {
    if (out.length >= limit || seen.has(key)) return
    const node = graph.nodes[key]
    if (!node) return
    out.push(path)
    const nextSeen = new Set(seen).add(key)
    if (node.type === 'pergunta') for (const o of node.options) walk(o.next, [...path, o.key], nextSeen)
    else if (node.type !== 'resultado') walk(node.next, [...path, CONTINUE], nextSeen)
  }
  walk(graph.start, [], new Set())
  return out
}

/** Ordem de exibição das etapas no editor: busca em largura a partir do início. */
export function stepOrder(graph: WorkflowGraph): NodeKey[] {
  const order: NodeKey[] = []
  const queue = [graph.start]
  while (queue.length) {
    const key = queue.shift()!
    if (order.includes(key) || !graph.nodes[key]) continue
    order.push(key)
    for (const n of successors(graph.nodes[key]!)) queue.push(n)
  }
  // Etapas soltas (não alcançáveis) vão para o fim, para o editor apontá-las.
  for (const key of Object.keys(graph.nodes)) if (!order.includes(key)) order.push(key)
  return order
}

export function successors(node: WorkflowNode): NodeKey[] {
  if (node.type === 'pergunta') return node.options.map((o) => o.next)
  if (node.type === 'resultado') return []
  return [node.next]
}

export type GraphIssue = { nodeKey?: NodeKey; message: string }

/** Validação feita antes de publicar (arquitetura, G.3). */
export function validateGraph(graph: WorkflowGraph, knownContent: Set<string>): GraphIssue[] {
  const issues: GraphIssue[] = []
  if (!graph.nodes[graph.start]) issues.push({ message: 'A etapa inicial não existe.' })
  const reachable = new Set<NodeKey>()
  const visit = (k: NodeKey, stack: Set<NodeKey>) => {
    if (stack.has(k)) {
      issues.push({ nodeKey: k, message: 'Há um caminho que volta para uma etapa anterior (ciclo).' })
      return
    }
    if (reachable.has(k)) return
    reachable.add(k)
    const node = graph.nodes[k]
    if (!node) return
    const next = new Set(stack).add(k)
    for (const s of successors(node)) {
      if (!graph.nodes[s]) issues.push({ nodeKey: k, message: `Uma resposta aponta para uma etapa que não existe.` })
      else visit(s, next)
    }
  }
  visit(graph.start, new Set())
  for (const [key, node] of Object.entries(graph.nodes)) {
    if (!reachable.has(key)) issues.push({ nodeKey: key, message: 'Etapa solta: nenhuma resposta leva até ela.' })
    if (node.type === 'pergunta' && node.options.length < 2)
      issues.push({ nodeKey: key, message: 'Pergunta com menos de duas respostas.' })
    for (const c of node.contents ?? [])
      if (!knownContent.has(c.slug)) issues.push({ nodeKey: key, message: 'Conteúdo vinculado não está na biblioteca.' })
  }
  return issues
}
