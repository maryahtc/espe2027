/**
 * ⚠️ DADOS FICTÍCIOS — somente desenvolvimento e testes.
 *
 * Reproduz a planilha no formato proposto (abas MÓDULOS e AULAS + abas existentes),
 * no mesmo formato bruto que a API do Google devolve (linhas × colunas).
 * Pessoas, temas e quantidades são inventados.
 *
 * Todas as colunas PRIVADAS contêm o marcador "SENTINELA". O teste de privacidade
 * garante que esse marcador nunca aparece nos dados públicos.
 */
import type { CellValue } from '@/lib/normalize'

type Row = CellValue[]

// ── MÓDULOS ──────────────────────────────────────────────────────────────────
const modulesHeader = [
  'Módulo', 'Mês previsto', 'Data início', 'Data fim', 'Tema principal', 'Descrição', 'Status',
  'Equipe', 'Observações internas',
]
const modules: Row[] = [
  [1, 'fev/2027', '11/02/2027', '13/02/2027', 'Diagnóstico e documentação', 'Da primeira consulta à documentação completa do caso.', 'Confirmado', 'SENTINELA_EQUIPE', 'SENTINELA_MOD_OBS'],
  [2, 'mar/2027', '18/03/2027', '20/03/2027', 'Fluxo digital e oclusão', null, 'Confirmado', 'SENTINELA_EQUIPE', null],
  [3, 'abr/2027', '22/04/2027', '24/04/2027', 'Materiais restauradores', 'Resinas compostas e cerâmicas: composição, indicações e manipulação.', 'Confirmado', null, null],
  [4, 'mai/2027', 46527, 46529, 'Planejamento restaurador', null, 'Confirmado', null, 'SENTINELA_MOD_OBS'],
  [5, 'jun/2027', '17/06/2027', '19/06/2027', 'Restaurações diretas posteriores', null, 'Confirmado', null, null],
  [6, 'jul/2027', '15/07/2027', '17/07/2027', 'Impressão 3D e resina anterior', null, 'Confirmado', null, null],
  [7, 'ago/2027', '18/08/2027', '20/08/2027', 'Reabilitação estética', 'Planejamento, preparos e provisórios em reabilitações anteriores.', 'Confirmado', null, null],
  [8, 'set/2027', '16/09/2027', '18/09/2027', 'Cirurgia guiada pelo design', null, 'A confirmar', null, null],
  [9, 'out/2027', '14/10/2027', '16/10/2027', 'Endodontia e retentores', null, 'Confirmado', null, null],
  [10, 'nov/2027', '11/11/2027', '13/11/2027', 'Cerâmicas', 'Seleção, preparo e cimentação de restaurações cerâmicas.', 'Confirmado', null, null],
  [11, '02/2028', null, null, 'Clareamento e estética gengival', null, 'A confirmar', null, null],
  [12, '03/2028', null, null, 'SENTINELA_TEMA_RASCUNHO', null, 'Rascunho', null, null],
]

// ── AULAS ────────────────────────────────────────────────────────────────────
const classesHeader = [
  'Módulo', 'Dia do módulo', 'Data', 'Início', 'Fim', 'Período', 'Tema da aula', 'Descrição', 'Tipo',
  'Professor(es)', 'Observações públicas', 'Status', 'Observações internas',
]
type C = [module: number, day: number | null, date: CellValue, start: CellValue, end: CellValue, period: string | null,
  title: string, description: string | null, type: string | null, professors: string | null, notes?: string | null, status?: string | null]
const c = (...r: C): Row => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10] ?? null, r[11] ?? null, 'SENTINELA_AULA_OBS']
const classes: Row[] = [
  c(1, 1, '11/02/2027', '08:00', '12:00', null, 'Primeira consulta e anamnese', 'Entrevista, expectativas do paciente e inteligência clínica.', 'Teórica', 'João Silva; Juliana Rocha'),
  c(1, 1, '11/02/2027', '14:00', '18:00', null, 'Fotografia odontológica', 'Protocolo fotográfico extra e intraoral.', 'Teórica', 'Maria Souza'),
  c(1, 2, '12/02/2027', '08:00', '12:00', null, 'Documentação complementar', 'Tomografia, radiografias e escaneamento.', 'Clínica', 'Rafa, Maria Souza'),
  c(1, 2, '12/02/2027', '14:00', '18:00', null, 'Fotografia e anamnese na clínica', null, 'Clínica', 'Maria Souza'),
  c(1, 3, '13/02/2027', null, null, 'Integral', 'Prática clínica supervisionada', null, 'Clínica', 'João Silva + Maria Souza'),

  c(2, 1, '18/03/2027', '08:00', '12:00', null, 'Inteligência artificial em exames de imagem', null, 'Teórica', 'Rafael Duarte'),
  c(2, 1, '18/03/2027', '14:00', '18:00', null, 'Smilecloud básico', null, 'Demonstração', 'Rafael Duarte'),
  c(2, 2, '19/03/2027', '08:00', '12:00', null, 'Smilecloud 2D', null, 'Hands on', 'Rafael Duarte'),
  c(2, 2, '19/03/2027', '14:00', '18:00', null, 'Adesão e montagem em articulador', null, 'Teórica', 'Carlos Mendes'),
  c(2, 3, '20/03/2027', '08:00', '17:00', null, 'Prática de JIG e articulador', null, 'Laboratorial', 'Carlos Mendes', 'Trazer modelos de estudo.'),

  c(3, 1, '22/04/2027', '08:00', '12:00', null, 'Placas oclusais', null, 'Teórica', 'Carlos Mendes'),
  c(3, 1, '22/04/2027', '14:00', '18:00', null, 'Ajuste de placa', null, 'Clínica', 'Carlos Mendes', 'Cada aluno traz uma placa da dupla.'),
  c(3, 2, '23/04/2027', '08:00', '12:00', null, 'Resina composta: composição e indicações', null, 'Teórica', 'João'),
  c(3, 2, '23/04/2027', '14:00', '18:00', null, 'Manipulação de resina', null, 'Hands-on', 'João Silva'),
  c(3, 3, '24/04/2027', '08:00', '12:00', null, 'Cerâmicas: composição e indicações', null, 'Teórica', 'Ana Beatriz Costa'),

  c(4, 1, 46527, 0.3333333, 0.5, null, 'Marketing e gestão do consultório', null, 'Teórica', 'Juliana Rocha'),
  c(4, 2, 46528, '08:00', '12:00', null, 'Fundamentos do planejamento', null, 'Teórica', 'João Silva'),
  c(4, 2, 46528, '14:00', '18:00', null, 'Preparo de facetas', null, 'Hands-on', 'João Silva e Maria Souza'),
  c(4, 3, 46529, '08:00', '12:00', null, 'Isolamento absoluto', null, 'Demonstração', 'Fernanda Lima'),

  c(5, 1, '17/06/2027', '08:00', '18:00', null, 'Classes I e II', 'Teoria e hands-on de restaurações diretas posteriores.', 'Hands-on', 'João Silva; Fernanda Lima'),
  c(5, 2, '18/06/2027', '08:00', '12:00', null, 'Smilecloud 3D', null, 'Demonstração', 'Rafael Duarte'),
  c(5, 3, '19/06/2027', '08:00', '12:00', null, 'Prótese total e PPR', null, 'Teórica', 'Ana Beatriz Costa'),

  c(6, 1, '15/07/2027', '08:00', '18:00', null, 'Impressão 3D', 'Teórica e hands-on.', 'Hands-on', 'Rafael Duarte; Marcos Teixeira'),
  c(6, 2, '16/07/2027', null, null, 'Integral', 'Clínica', null, 'Clínica', null),
  c(6, 3, '17/07/2027', '08:00', '12:00', null, 'Resina anterior', null, 'Hands-on', 'João Silva'),

  c(7, 1, '18/08/2027', '08:00', '10:00', null, 'Fundamentos do planejamento estético', null, 'Teórica', 'João Silva'),
  c(7, 1, '18/08/2027', '10:30', '12:00', null, 'Fotografia e análise facial', null, 'Demonstração', 'Maria Souza'),
  c(7, 1, '18/08/2027', '14:00', '18:00', null, 'Planejamento digital', null, 'Hands-on', 'João Silva + Maria Souza'),
  c(7, 2, '19/08/2027', null, null, 'Manhã', 'Clínica', null, 'Clínica', 'Luísa Martins'),
  c(7, 2, '19/08/2027', '14:00', '18:00', null, 'Preparos para restaurações indiretas', null, 'Hands-on', 'Prof. João Silva'),
  c(7, 3, '20/08/2027', '08:00', '12:00', null, 'Provisórios e mock-up', 'Mock-up diagnóstico e provisórios.', 'Hands-on', 'Luísa Martins'),
  c(7, 3, '20/08/2027', '14:00', '16:00', null, 'Discussão de casos', null, 'Discussão de caso', 'João Silva; Luísa Martins; Maria Souza'),

  c(8, 1, '16/09/2027', '08:00', '12:00', null, 'Cirurgia guiada pelo design', null, 'Teórica', 'Pedro Almeida'),
  c(8, 2, '17/09/2027', null, null, 'Integral', 'Clínica', null, 'Clínica', 'Pedro Almeida'),
  c(8, 3, '18/09/2027', '08:00', '12:00', null, 'Fluxo digital Sirona', null, 'Hands-on', 'Rafael Duarte', null, 'A confirmar'),

  c(9, 1, '14/10/2027', '08:00', '12:00', null, 'Pinos de fibra e retentores', null, 'Teórica', 'Bruno Carvalho'),
  c(9, 2, '15/10/2027', null, null, 'Integral', 'Clínica', null, 'Clínica', 'Bruno Carvalho'),

  c(10, 1, '11/11/2027', '08:00', '12:00', null, 'Seleção de cerâmicas', null, 'Teórica', 'Ana Beatriz Costa'),
  c(10, 1, '11/11/2027', '14:00', '18:00', null, 'Preparos para cerâmica', null, 'Hands-on', 'Ana Beatriz Costa; João Silva'),
  c(10, 2, '12/11/2027', null, null, 'Integral', 'Clínica', null, 'Clínica', null),
  c(10, 3, '13/11/2027', '08:00', '12:00', null, 'Cimentação adesiva', null, 'Demonstração', 'Ana Beatriz Costa'),

  c(11, 1, null, null, null, null, 'Clareamento dental', null, 'Teórica', 'Luísa Martins'),
  c(11, 2, null, null, null, null, 'Clínica', null, 'Clínica', null),

  c(12, 1, null, null, null, null, 'SENTINELA_AULA_RASCUNHO', null, 'Teórica', 'SENTINELA Professor Rascunho'),
  c(4, 3, 46529, '14:00', '18:00', null, 'SENTINELA_AULA_RASCUNHO_2', null, 'Teórica', 'João Silva', null, 'Rascunho'),
]

// ── PROFESSORES ──────────────────────────────────────────────────────────────
const professorsHeader = [
  'Professor', 'Apelidos', 'Especialidade / tema', 'Bio curta', 'Módulo(s)', 'Data(s)', 'Cidade de origem', 'Contato',
  'Cachê', 'Passagem', 'Hotel', 'Chegada', 'Saída', 'Status', 'Responsável', 'Observações', 'E-mail', 'Telefone',
]
const p = (name: string, aliases: string | null, specialty: string, bio: string | null = null): Row => [
  name, aliases, specialty, bio, 'SENTINELA_MODULOS', 'SENTINELA_DATAS', 'SENTINELA_CIDADE', 'SENTINELA_CONTATO',
  'SENTINELA_CACHE R$ 9.999,00', 'SENTINELA_PASSAGEM', 'SENTINELA_HOTEL', 'SENTINELA_CHEGADA', 'SENTINELA_SAIDA',
  'SENTINELA_STATUS', 'SENTINELA_RESPONSAVEL', 'SENTINELA_OBS', 'sentinela@privado.test', '+55 11 90000-0000 SENTINELA',
]
const professors: Row[] = [
  p('João Silva', null, 'Dentística restauradora', 'Mestre em dentística, dedicado a restaurações adesivas e reabilitação estética.'),
  p('Maria Souza', null, 'Fotografia odontológica'),
  p('Ana Beatriz Costa', 'Ana Bia', 'Prótese e cerâmicas'),
  p('Carlos Mendes', null, 'Oclusão e DTM'),
  p('Fernanda Lima', null, 'Periodontia'),
  p('Rafael Duarte', 'Rafa', 'Odontologia digital'),
  p('Juliana Rocha', null, 'Gestão e marketing'),
  p('Pedro Almeida', null, 'Implantodontia'),
  p('Luísa Martins', null, 'Estética e clareamento'),
  p('Bruno Carvalho', null, 'Endodontia'),
  p('SENTINELA Professor Sem Aula', null, 'Convidado ainda sem aula'),
]

// ── MATERIAIS POR MÓDULO ─────────────────────────────────────────────────────
const materialsHeader = [
  'Módulo', 'Mês', 'Data', 'Tema / Aula', 'Professor', 'Material', 'Marca / Especificação', 'Qtd. necessária',
  'Qtd. em estoque', 'Qtd. faltante', 'Empresa / parceiro', 'Responsável solicitação', 'Prazo', 'Status', 'Observações',
]
const m = (module: number, classTitle: string | null, professor: string | null, material: string, brand: string | null, qty: CellValue): Row => [
  module, 'SENTINELA_MES', 'SENTINELA_DATA', classTitle, professor, material, brand, qty,
  'SENTINELA_QTD_ESTOQUE', 'SENTINELA_QTD_FALTANTE', 'SENTINELA_PARCEIRO', 'SENTINELA_RESP', 'SENTINELA_PRAZO', 'SENTINELA_STATUS', 'SENTINELA_OBS',
]
const materials: Row[] = [
  m(1, 'Fotografia odontológica', 'Maria Souza', 'Afastador labial', 'Tamanho adulto', 10),
  m(1, 'Fotografia odontológica', 'Maria Souza', 'Espelho intraoral', 'Oclusal adulto', 10),
  m(3, 'Manipulação de resina', 'João Silva', 'Resina composta A2', 'Marca X — nanoparticulada', 12),
  m(3, 'Manipulação de resina', 'João Silva', 'Espátula para resina', null, 20),
  m(4, 'Preparo de facetas', 'João Silva', 'Ponta diamantada 4138', null, 30),
  m(4, 'Isolamento absoluto', 'Fernanda Lima', 'Lençol de borracha', 'Médio', 40),
  m(5, 'Classes I e II', null, 'Resina composta A2', 'Marca X — nanoparticulada', '20'),
  m(5, 'Classes I e II', null, 'Matriz metálica', null, 25),
  m(7, 'Provisórios e mock-up', 'Luísa Martins', 'Silicone para mock-up', 'Adição — putty', 6),
  m(7, 'Provisórios e mock-up', 'Luísa Martins', 'Resina bisacrílica', 'A1', 8),
  m(7, 'Preparos para restaurações indiretas', 'João Silva', 'Ponta diamantada 4138', null, 30),
  m(7, 'Preparos para restaurações indiretas', 'João Silva', 'Fio retrator', '#000', 15),
  m(10, 'Cimentação adesiva', 'Ana Beatriz Costa', 'Cimento resinoso', 'Dual', 6),
  m(10, null, null, 'Ácido fluorídrico 10%', null, 'vinte'),
]

// ── ESTOQUE ──────────────────────────────────────────────────────────────────
const inventoryHeader = [
  'Material', 'Categoria', 'Marca / Especificação', 'Unidade', 'Estoque inicial', 'Entradas', 'Saídas / Consumo',
  'Estoque atual', 'Estoque mínimo', 'Módulo', 'Mês', 'Última atualização', 'Responsável', 'Observações',
]
const s = (material: string, category: string, brand: string | null, unit: string, current: CellValue, minimum: CellValue, updated: CellValue): Row => [
  material, category, brand, unit, 'SENTINELA_INICIAL', 'SENTINELA_ENTRADAS', 'SENTINELA_SAIDAS', current, minimum,
  'SENTINELA_MODULO', 'SENTINELA_MES', updated, 'SENTINELA_RESP', 'SENTINELA_OBS',
]
const inventory: Row[] = [
  s('Afastador labial', 'Fotografia', 'Tamanho adulto', 'un', 12, 10, '01/09/2026'),
  s('Espelho intraoral', 'Fotografia', 'Oclusal adulto', 'un', 6, 10, '01/09/2026'),
  s('Resina composta A2', 'Restauradores', 'Marca X — nanoparticulada', 'seringa', 8, 10, '15/09/2026'),
  s('Espátula para resina', 'Instrumentais', null, 'un', 25, 10, '15/09/2026'),
  s('Ponta diamantada 4138', 'Brocas e pontas', null, 'un', 40, 20, '15/09/2026'),
  s('Lençol de borracha', 'Isolamento', 'Médio', 'un', 0, 20, '15/09/2026'),
  s('Matriz metálica', 'Restauradores', null, 'un', 30, 10, null),
  s('Silicone para mock-up', 'Moldagem', 'Adição — putty', 'kit', 2, 3, '10/09/2026'),
  s('Resina bisacrílica', 'Provisórios', 'A1', 'cartucho', 10, 4, '10/09/2026'),
  s('Fio retrator', 'Periodontia', '#000', 'un', null, 5, null),
  s('Cimento resinoso', 'Cimentação', 'Dual', 'kit', 6, 2, '10/09/2026'),
  s('Luvas de procedimento', 'Biossegurança', 'M', 'caixa', 15, 20, '20/09/2026'),
]

// ── EQUIPAMENTOS ─────────────────────────────────────────────────────────────
const equipmentHeader = [
  'Equipamento', 'Categoria', 'Qtd. necessária', 'Qtd. disponível', 'Já temos?', 'Parceiro possível', 'Responsável',
  'Prazo', 'Status', 'Local', 'Módulo', 'Observações',
]
const e = (name: string, category: string, required: CellValue, available: CellValue, modules: CellValue): Row => [
  name, category, required, available, 'SENTINELA_JA_TEMOS', 'SENTINELA_PARCEIRO', 'SENTINELA_RESP', 'SENTINELA_PRAZO',
  'SENTINELA_STATUS', 'SENTINELA_LOCAL', modules, 'SENTINELA_OBS',
]
const equipment: Row[] = [
  e('Microscópio operatório', 'Microscopia', 2, 0, '9'),
  e('Mocho', 'Mobiliário', 12, 12, '1, 2, 3, 4, 5, 6, 7, 8, 9, 10'),
  e('Scanner intraoral', 'Odontologia digital', 2, 1, 'Módulos 2 e 5'),
  e('Impressora 3D', 'Odontologia digital', 1, 1, 6),
  e('Câmera DSLR com flash circular', 'Fotografia', 4, null, '1; 7'),
]

export const demoWorkbook: Record<string, CellValue[][]> = {
  'MÓDULOS': [modulesHeader, ...modules],
  AULAS: [classesHeader, ...classes],
  PROFESSORES: [professorsHeader, ...professors],
  'MATERIAIS POR MÓDULO': [materialsHeader, ...materials],
  ESTOQUE: [inventoryHeader, ...inventory],
  EQUIPAMENTOS: [equipmentHeader, ...equipment],
  // Aba que o portal não deve nem pedir:
  'PENDÊNCIAS': [['Demanda', 'Responsável'], ['SENTINELA_PENDENCIA', 'SENTINELA_RESP']],
}

/** Marcador presente em TODA célula privada das fixtures. */
export const PRIVATE_SENTINEL = /sentinela/i
