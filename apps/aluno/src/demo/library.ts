/** Biblioteca FICTÍCIA (prévia). Títulos, docentes e durações inventados. */

export type LibraryKind = 'Videoaula' | 'Artigo' | 'PDF' | 'Capítulo'

export type LibraryItem = {
  slug: string
  title: string
  teacher: string
  category: string
  topics: string[]
  minutes: number
  kind: LibraryKind
  description: string
  modules: number[]
  /** Progresso do aluno na demonstração (0–100). */
  progress?: number
  attachments?: string[]
  workflow?: { slug: string; path: string; label: string }
}

export const categories = ['Dentística', 'Prótese', 'Planejamento', 'Oclusão', 'Fotografia', 'Materiais', 'Periodontia']

export const library: LibraryItem[] = [
  {
    slug: 'selecao-de-cor-e-substrato',
    title: 'Seleção de cor e leitura do substrato',
    teacher: 'Profa. Carolina Duarte',
    category: 'Dentística',
    topics: ['Cor', 'Substrato escurecido'],
    minutes: 24,
    kind: 'Videoaula',
    description:
      'Como registrar a cor do dente e do substrato antes do preparo, e por que o substrato muda a escolha do material e da espessura.',
    modules: [12, 14],
    progress: 40,
    attachments: ['Escala de cor — guia de registro (PDF)'],
    workflow: { slug: 'dente-escurecido', path: '', label: 'Dente escurecido' },
  },
  {
    slug: 'manejo-de-substratos-escurecidos',
    title: 'Manejo de substratos escurecidos',
    teacher: 'Prof. Rafael Mendes',
    category: 'Dentística',
    topics: ['Substrato escurecido', 'Clareamento'],
    minutes: 22,
    kind: 'Videoaula',
    description:
      'Clareamento prévio, controle de opacidade e escolha do material quando o fundo é escuro. Casos com e sem tratamento endodôntico.',
    modules: [18],
    workflow: { slug: 'abordagem-anterior', path: 'cor/sim', label: 'Abordagem estética anterior' },
  },
  {
    slug: 'controle-de-profundidade-termino-cervical',
    title: 'Controle de profundidade no término cervical',
    teacher: 'Prof. Bruno Saldanha',
    category: 'Prótese',
    topics: ['Término cervical', 'Preparo'],
    minutes: 18,
    kind: 'Videoaula',
    description: 'Pontas guia, sulcos de orientação e checagem com guia de silicone para controlar a profundidade na cervical.',
    modules: [11, 14],
    workflow: { slug: 'direta-ou-indireta', path: '', label: 'Direta ou indireta?' },
  },
  {
    slug: 'preparos-minimamente-invasivos',
    title: 'Preparos minimamente invasivos para laminados',
    teacher: 'Prof. Rafael Mendes',
    category: 'Prótese',
    topics: ['Preparo', 'Laminados'],
    minutes: 32,
    kind: 'Videoaula',
    description: 'Preparo guiado pelo mock-up, espessuras mínimas por material e preservação de esmalte.',
    modules: [14],
    progress: 100,
  },
  {
    slug: 'mock-up-do-enceramento-a-boca',
    title: 'Mock-up: do enceramento à boca',
    teacher: 'Prof. Rafael Mendes',
    category: 'Planejamento',
    topics: ['Mock-up', 'Planejamento estético'],
    minutes: 18,
    kind: 'Videoaula',
    description: 'Transferir o enceramento para a boca, validar com o paciente e usar o mock-up como guia de preparo.',
    modules: [10, 14],
  },
  {
    slug: 'protocolo-de-cimentacao-adesiva',
    title: 'Protocolo de cimentação adesiva',
    teacher: 'Prof. Bruno Saldanha',
    category: 'Materiais',
    topics: ['Cimentação', 'Isolamento'],
    minutes: 5,
    kind: 'PDF',
    description: 'Checklist de bancada: tratamento da peça, do dente, sequência de cimentação e remoção de excessos.',
    modules: [13, 14],
  },
  {
    slug: 'onlays-e-overlays-indicacoes',
    title: 'Onlays e overlays: indicações e limites',
    teacher: 'Prof. Marcos Teixeira',
    category: 'Prótese',
    topics: ['Restauração indireta', 'Cúspides'],
    minutes: 28,
    kind: 'Videoaula',
    description: 'Quando a restauração direta deixa de ser previsível e como decidir entre onlay, overlay e coroa.',
    modules: [15],
    workflow: { slug: 'direta-ou-indireta', path: '', label: 'Direta ou indireta?' },
  },
  {
    slug: 'isolamento-absoluto-em-anteriores',
    title: 'Isolamento absoluto em anteriores',
    teacher: 'Prof. Bruno Saldanha',
    category: 'Dentística',
    topics: ['Isolamento'],
    minutes: 16,
    kind: 'Videoaula',
    description: 'Grampos, amarrias e inversão do dique para restaurações e cimentações na região anterior.',
    modules: [3],
    progress: 100,
  },
  {
    slug: 'analise-de-guia-anterior',
    title: 'Análise da guia anterior antes de restaurar',
    teacher: 'Prof. Marcos Teixeira',
    category: 'Oclusão',
    topics: ['Oclusão', 'Guia anterior'],
    minutes: 26,
    kind: 'Videoaula',
    description: 'O que observar na guia anterior e nos movimentos excursivos antes de alterar comprimento ou forma.',
    modules: [6, 23],
  },
  {
    slug: 'protocolo-fotografico-essencial',
    title: 'Protocolo fotográfico essencial',
    teacher: 'Profa. Helena Prado',
    category: 'Fotografia',
    topics: ['Fotografia', 'Documentação'],
    minutes: 35,
    kind: 'Videoaula',
    description: 'As fotos mínimas de cada caso, configuração da câmera e organização no Smile Cloud.',
    modules: [1],
    progress: 100,
  },
  {
    slug: 'clareamento-interno-indicacoes',
    title: 'Clareamento interno: indicações e cuidados',
    teacher: 'Profa. Helena Prado',
    category: 'Dentística',
    topics: ['Clareamento', 'Substrato escurecido'],
    minutes: 20,
    kind: 'Videoaula',
    description: 'Avaliação prévia, barreira cervical, agentes clareadores e acompanhamento.',
    modules: [7, 18],
  },
  {
    slug: 'espessura-de-preparo-revisao',
    title: 'Espessura de preparo e longevidade de laminados',
    teacher: 'Leitura indicada pela coordenação',
    category: 'Prótese',
    topics: ['Laminados', 'Preparo'],
    minutes: 25,
    kind: 'Artigo',
    description: 'Revisão sobre a relação entre espessura de preparo, substrato (esmalte × dentina) e longevidade.',
    modules: [14],
  },
]

export function librarySlug(slug: string) {
  return library.find((i) => i.slug === slug) ?? null
}

export function related(item: LibraryItem, n = 3) {
  return library
    .filter((i) => i.slug !== item.slug)
    .map((i) => ({ i, score: i.topics.filter((t) => item.topics.includes(t)).length * 2 + (i.category === item.category ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.i)
}
