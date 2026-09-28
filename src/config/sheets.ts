/**
 * Mapeamento planilha → portal.
 *
 * Esta é a WHITELIST de colunas públicas. Qualquer coluna que não esteja listada
 * aqui é ignorada na leitura e nunca entra na memória da aplicação — inclusive
 * colunas novas que a coordenação criar no futuro.
 *
 * Para publicar uma coluna nova:
 *   1. adicione-a aqui (com os nomes de cabeçalho aceitos);
 *   2. adicione o campo ao schema da linha (src/schemas/rows.ts);
 *   3. adicione o campo ao DTO público (src/schemas/public.ts) e ao mapeador.
 *
 * As colunas são encontradas pelo NOME do cabeçalho (sem diferenciar maiúsculas,
 * acentos ou pontuação), então a ordem das colunas na planilha pode mudar.
 */

export type ColumnDef = {
  /** Nomes de cabeçalho aceitos. O primeiro é o nome "oficial". */
  headers: readonly string[]
  /** Se ausente na planilha, a aba inteira é considerada inválida. */
  required?: boolean
}

export type TabDef = {
  /** Nome da aba na planilha. */
  name: string
  /** Aba crítica: se falhar, preferimos manter os dados anteriores a publicar vazio. */
  critical: boolean
  /** Linha do cabeçalho (1 = primeira linha). */
  headerRow: number
  columns: Record<string, ColumnDef>
}

export const SHEET_TABS = {
  modules: {
    name: 'MÓDULOS',
    critical: true,
    headerRow: 1,
    columns: {
      number: { headers: ['Módulo', 'Modulo', 'Nº', 'Número'], required: true },
      plannedMonth: { headers: ['Mês previsto', 'Mês', 'Mes'] },
      startDate: { headers: ['Data início', 'Data inicial', 'Início'] },
      endDate: { headers: ['Data fim', 'Data final', 'Fim'] },
      title: { headers: ['Tema principal', 'Tema'] },
      description: { headers: ['Descrição', 'Descricao'] },
      status: { headers: ['Status'] },
    },
  },
  classes: {
    name: 'AULAS',
    critical: true,
    headerRow: 1,
    columns: {
      module: { headers: ['Módulo', 'Modulo'], required: true },
      /** Mesmo texto da coluna Módulo, usado só para desempatar números repetidos (ex.: "9 (NOV)"). */
      moduleLabel: { headers: ['Módulo', 'Modulo'] },
      day: { headers: ['Dia do módulo', 'Dia'] },
      date: { headers: ['Data'] },
      start: { headers: ['Início', 'Inicio', 'Hora início', 'Horário início'] },
      end: { headers: ['Fim', 'Término', 'Hora fim', 'Horário fim'] },
      period: { headers: ['Período', 'Periodo', 'Turno'] },
      title: { headers: ['Tema da aula', 'Tema', 'Aula'], required: true },
      description: { headers: ['Descrição', 'Descricao'] },
      type: { headers: ['Tipo', 'Tipo de aula'] },
      professors: { headers: ['Professor(es)', 'Professores', 'Professor'] },
      publicNotes: { headers: ['Observações públicas', 'Observacoes publicas'] },
      status: { headers: ['Status'] },
    },
  },
  professors: {
    name: 'PROFESSORES',
    critical: false,
    headerRow: 1,
    columns: {
      name: { headers: ['Professor', 'Nome'], required: true },
      /** Usado só para vincular nomes curtos das AULAS ("Thiago") ao nome completo. Não é publicado. */
      aliases: { headers: ['Apelidos', 'Nome curto', 'Apelidos (para vincular)'] },
      specialty: { headers: ['Especialidade / tema', 'Especialidade'] },
      bio: { headers: ['Bio curta', 'Bio', 'Minibio'] },
    },
  },
  materials: {
    name: 'MATERIAIS POR MÓDULO',
    critical: false,
    headerRow: 1,
    columns: {
      module: { headers: ['Módulo', 'Modulo'], required: true },
      classTitle: { headers: ['Tema / Aula', 'Aula'] },
      professor: { headers: ['Professor'] },
      material: { headers: ['Material'], required: true },
      brandSpec: { headers: ['Marca / Especificação', 'Marca'] },
      required: { headers: ['Qtd. necessária', 'Quantidade necessária'] },
    },
  },
  inventory: {
    name: 'ESTOQUE',
    critical: false,
    headerRow: 1,
    columns: {
      material: { headers: ['Material'], required: true },
      category: { headers: ['Categoria'] },
      brandSpec: { headers: ['Marca / Especificação', 'Marca'] },
      unit: { headers: ['Unidade'] },
      current: { headers: ['Estoque atual', 'Quantidade atual'] },
      minimum: { headers: ['Estoque mínimo'] },
      updatedAt: { headers: ['Última atualização'] },
    },
  },
  equipment: {
    name: 'EQUIPAMENTOS',
    critical: false,
    headerRow: 1,
    columns: {
      name: { headers: ['Equipamento'], required: true },
      category: { headers: ['Categoria'] },
      modules: { headers: ['Módulo', 'Módulos', 'Modulo'] },
      required: { headers: ['Qtd. necessária', 'Quantidade necessária'] },
      available: { headers: ['Qtd. disponível', 'Quantidade disponível'] },
    },
  },
} as const satisfies Record<string, TabDef>

export type TabKey = keyof typeof SHEET_TABS
export type ColumnKey<K extends TabKey> = keyof (typeof SHEET_TABS)[K]['columns'] & string
