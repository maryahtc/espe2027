/**
 * Área de edição (/coordenacao): o que pode ser editado e como.
 *
 * Só colunas listadas aqui podem ser gravadas pelo portal. Colunas internas
 * (cachê, contatos, passagem, observações internas…) nunca são lidas nem gravadas.
 * O cabeçalho usado na planilha é o primeiro nome de `SHEET_TABS[tab].columns[campo].headers`.
 */
import { CLASS_TYPES, PERIODS } from '@/config/vocab'
import type { TabKey } from '@/config/sheets'

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'date' //       DD/MM/AAAA
  | 'time' //       HH:mm
  | 'month' //      mês previsto (texto livre: "ago/2027", "AGO")
  | 'number'
  | 'module' //     escolhe um módulo existente
  | 'modules' //    lista de números de módulos ("2, 5")
  | 'professors' // escolhe um ou mais professores
  | 'professor' //  escolhe um professor
  | 'select'

export type FieldDef = {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
  help?: string
  /** Opções fixas (kind "select"): o texto gravado na planilha. */
  options?: string[]
  /** Aparece na lista de registros. */
  inList?: boolean
}

export type EntityDef = {
  tab: TabKey
  slug: string
  label: string
  singular: string
  /** Rótulo do botão de criação ("Nova aula"). */
  newLabel: string
  /** Prefixo do ID gerado para linhas novas (ex.: AUL-7K2Q9M). */
  idPrefix: string
  fields: FieldDef[]
  /** Remover = marcar Status "Rascunho" (esconde do portal) em vez de apagar a linha. */
  archiveByStatus?: boolean
}

const STATUS_MODULO = ['Confirmado', 'A confirmar', 'Rascunho']
const STATUS_AULA = ['Confirmada', 'A confirmar', 'Rascunho']

/**
 * Todas as abas que a máquina de edição sabe ler e gravar.
 * MÓDULOS, AULAS e PROFESSORES ficam aqui só como definição da planilha antiga (prévia/demonstração):
 * desde a Etapa 3 o cronograma é editado SOMENTE no Admin do Portal do Aluno.
 */
export const SHEET_ENTITIES: EntityDef[] = [
  {
    tab: 'modules',
    slug: 'modulos',
    newLabel: 'Novo módulo',
    label: 'Módulos',
    singular: 'módulo',
    idPrefix: 'MOD',
    archiveByStatus: true,
    fields: [
      { key: 'number', label: 'Módulo (número)', kind: 'number', required: true, inList: true },
      { key: 'plannedMonth', label: 'Mês previsto', kind: 'month', help: 'Ex.: ago/2027 ou só AGO', inList: true },
      { key: 'startDate', label: 'Data início', kind: 'date', inList: true },
      { key: 'endDate', label: 'Data fim', kind: 'date' },
      { key: 'title', label: 'Tema principal', kind: 'text', inList: true },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
      { key: 'status', label: 'Status', kind: 'select', options: STATUS_MODULO, inList: true },
    ],
  },
  {
    tab: 'classes',
    slug: 'aulas',
    newLabel: 'Nova aula',
    label: 'Aulas',
    singular: 'aula',
    idPrefix: 'AUL',
    archiveByStatus: true,
    fields: [
      { key: 'module', label: 'Módulo', kind: 'module', required: true, inList: true },
      { key: 'day', label: 'Dia do módulo', kind: 'number', help: '1, 2, 3… (útil enquanto não há data)' },
      { key: 'date', label: 'Data', kind: 'date', inList: true },
      { key: 'start', label: 'Início', kind: 'time' },
      { key: 'end', label: 'Fim', kind: 'time' },
      { key: 'period', label: 'Período', kind: 'select', options: Object.values(PERIODS).map((p) => p.label) },
      { key: 'title', label: 'Tema da aula', kind: 'text', required: true, inList: true },
      { key: 'description', label: 'Descrição', kind: 'textarea' },
      { key: 'type', label: 'Tipo', kind: 'select', options: Object.values(CLASS_TYPES).map((t) => t.label) },
      { key: 'professors', label: 'Professor(es)', kind: 'professors', inList: true },
      { key: 'publicNotes', label: 'Observações públicas', kind: 'textarea', help: 'Aparece no portal.' },
      { key: 'status', label: 'Status', kind: 'select', options: STATUS_AULA, inList: true },
    ],
  },
  {
    tab: 'professors',
    slug: 'professores',
    newLabel: 'Novo professor',
    label: 'Professores',
    singular: 'professor',
    idPrefix: 'PRO',
    fields: [
      {
        key: 'name',
        label: 'Nome',
        kind: 'text',
        required: true,
        inList: true,
        help: 'Mudar o nome não atualiza as aulas: mantenha o nome antigo em Apelidos.',
      },
      { key: 'aliases', label: 'Apelidos', kind: 'text', help: 'Como o nome aparece nas aulas, separado por vírgula.' },
      { key: 'specialty', label: 'Especialidade', kind: 'text', inList: true },
      { key: 'bio', label: 'Bio curta', kind: 'textarea' },
    ],
  },
  {
    tab: 'materials',
    slug: 'materiais',
    newLabel: 'Novo material',
    label: 'Materiais por módulo',
    singular: 'material',
    idPrefix: 'MAT',
    fields: [
      { key: 'module', label: 'Módulo', kind: 'module', required: true, inList: true },
      { key: 'classTitle', label: 'Tema / Aula', kind: 'text' },
      { key: 'professor', label: 'Professor', kind: 'professor' },
      { key: 'material', label: 'Material', kind: 'text', required: true, inList: true, help: 'Use o mesmo nome do Estoque.' },
      { key: 'brandSpec', label: 'Marca / especificação', kind: 'text', inList: true },
      { key: 'required', label: 'Quantidade necessária', kind: 'number', inList: true },
    ],
  },
  {
    tab: 'inventory',
    slug: 'estoque',
    newLabel: 'Novo item de estoque',
    label: 'Estoque',
    singular: 'item de estoque',
    idPrefix: 'EST',
    fields: [
      { key: 'material', label: 'Material', kind: 'text', required: true, inList: true },
      { key: 'category', label: 'Categoria', kind: 'text', inList: true },
      { key: 'brandSpec', label: 'Marca / especificação', kind: 'text' },
      { key: 'unit', label: 'Unidade', kind: 'text' },
      { key: 'current', label: 'Estoque atual', kind: 'number', inList: true },
      { key: 'minimum', label: 'Estoque mínimo', kind: 'number', inList: true },
      { key: 'updatedAt', label: 'Última atualização', kind: 'date', help: 'Preenchida automaticamente quando o estoque atual muda.' },
    ],
  },
  {
    tab: 'equipment',
    slug: 'equipamentos',
    newLabel: 'Novo equipamento',
    label: 'Equipamentos',
    singular: 'equipamento',
    idPrefix: 'EQP',
    fields: [
      { key: 'name', label: 'Equipamento', kind: 'text', required: true, inList: true },
      { key: 'category', label: 'Categoria', kind: 'text', inList: true },
      { key: 'modules', label: 'Módulos', kind: 'modules', help: 'Números separados por vírgula. Ex.: 2, 5', inList: true },
      { key: 'required', label: 'Quantidade necessária', kind: 'number', inList: true },
      { key: 'available', label: 'Quantidade disponível', kind: 'number', inList: true },
    ],
  },
]

/** Abas acadêmicas: nunca editáveis por aqui (Admin do Portal do Aluno é a fonte única). */
export const READ_ONLY_TABS: readonly TabKey[] = ['modules', 'classes', 'professors']

/** O que a área /coordenacao edita: só logística (materiais, estoque, equipamentos). */
export const EDITABLE_ENTITIES: EntityDef[] = SHEET_ENTITIES.filter((e) => !READ_ONLY_TABS.includes(e.tab))

export const ID_HEADER = 'ID'
export const HISTORY_TAB = 'HISTÓRICO'
export const HISTORY_HEADER = ['Data e hora', 'Pessoa', 'Perfil', 'Ação', 'Aba', 'ID', 'Linha', 'Alterações']

export type EditorRole = 'coordenacao' | 'professor'

/**
 * Quem pode editar o quê. Decisão atual: todos os professores e a coordenação editam tudo.
 * Para restringir no futuro, altere só esta função.
 */
export function canEdit(_role: EditorRole, _entity: EntityDef): boolean {
  return true
}

/** Entidade editável pela área /coordenacao (cronograma, módulos e professores nunca). */
export function getEntity(slug: string): EntityDef | undefined {
  return EDITABLE_ENTITIES.find((e) => e.slug === slug)
}

/** Definição de qualquer aba conhecida (inclusive as acadêmicas, só leitura). Não usar para autorizar gravação. */
export function sheetEntity(slug: string): EntityDef | undefined {
  return SHEET_ENTITIES.find((e) => e.slug === slug)
}
