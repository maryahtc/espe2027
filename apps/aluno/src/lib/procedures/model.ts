/**
 * Catálogo de procedimentos (Etapa 6) — regras puras.
 * Procedimento (tratamento) × etapa clínica: o aluno registra a etapa ("Laminado cerâmico · Cimentação").
 * Experiência clínica = todas as etapas; produção concluída = só a etapa que conclui (no máximo uma por procedimento).
 */
export type CountUnit = 'dente' | 'peca' | 'arcada' | 'caso'
export type ProcedureKind = 'tratamento' | 'geral'

export const UNITS: CountUnit[] = ['dente', 'peca', 'arcada', 'caso']
export const UNIT_LABEL: Record<CountUnit, { one: string; many: string }> = {
  dente: { one: 'dente', many: 'dentes' },
  peca: { one: 'peça', many: 'peças' },
  arcada: { one: 'arcada', many: 'arcadas' },
  caso: { one: 'caso', many: 'casos' },
}
/**
 * Localização da etapa: o que o aluno identifica no registro — posições FDI ('dentes'), a arcada ('arcada') ou nada.
 * É diferente da unidade (como se conta). Dente → dentes, arcada → arcada, caso → nenhuma; peça → por etapa.
 * O FDI é só posição (inclui a de um elemento protético/pôntico): nenhuma condição ou diagnóstico.
 */
export type StepLocation = 'dentes' | 'arcada' | 'nenhuma'
export const LOCATIONS: StepLocation[] = ['dentes', 'arcada', 'nenhuma']
export const LOCATION_LABEL: Record<StepLocation, string> = {
  dentes: 'Posições FDI (odontograma)',
  arcada: 'Arcada (superior, inferior ou ambas)',
  nenhuma: 'Nada a identificar',
}
/** A localização fixa pela unidade (null = escolhida na etapa: só peça). Mesma regra do banco. */
export function locationForUnit(unit: CountUnit): StepLocation | null {
  return unit === 'dente' ? 'dentes' : unit === 'arcada' ? 'arcada' : unit === 'caso' ? 'nenhuma' : null
}
/** Antes da migração do odontograma: peça seguia o comportamento antigo (dentes opcionais). */
export const legacyLocation = (unit: CountUnit): StepLocation => locationForUnit(unit) ?? 'dentes'

export type DentalArch = 'superior' | 'inferior' | 'ambas'
export const ARCHES: DentalArch[] = ['superior', 'inferior', 'ambas']
export const ARCH_LABEL: Record<DentalArch, string> = { superior: 'Superior', inferior: 'Inferior', ambas: 'Ambas' }
export const archQuantity = (a: DentalArch) => (a === 'ambas' ? 2 : 1)

export const KIND_LABEL: Record<ProcedureKind, string> = {
  tratamento: 'Tratamento',
  geral: 'Geral (diagnóstico e planejamento)',
}

export type StepVM = {
  id: string
  procedureId: string
  name: string
  slug: string
  unit: CountUnit
  location: StepLocation
  completes: boolean
  requiresDescription: boolean
  synonyms: string[]
  active: boolean
  position: number
  /** Registros que usam a etapa (inclusive removidos pelo aluno). Etapa usada não é apagada: é desativada. */
  uses: number
}

export type ProcedureVM = {
  id: string
  categoryId: string
  name: string
  slug: string
  kind: ProcedureKind
  synonyms: string[]
  active: boolean
  position: number
  steps: StepVM[]
  topicIds: string[]
}

export function unitText(unit: CountUnit, n: number): string {
  return `${n} ${n === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many}`
}

/** Sem etapa que conclui: conta só como experiência clínica (gerais, clareamentos, "Outro"). */
export function experienceOnly(p: Pick<ProcedureVM, 'steps'>): boolean {
  return !p.steps.some((s) => s.completes)
}

/** Etapa única com o mesmo nome do procedimento: na tela aparece só o procedimento. */
export function isSingleStep(p: Pick<ProcedureVM, 'name' | 'steps'>): boolean {
  return p.steps.length === 1 && p.steps[0]!.name === p.name
}

/** Como a etapa aparece no registro: "Laminado cerâmico · Cimentação" ou só "Exodontia". */
export function stepLabel(p: Pick<ProcedureVM, 'name'>, s: Pick<StepVM, 'name'>): string {
  return s.name === p.name ? p.name : `${p.name} · ${s.name}`
}

/** Problemas de consistência para avisar o admin antes de salvar (o banco confere de novo). */
export function catalogIssues(p: Pick<ProcedureVM, 'kind' | 'steps'>): string[] {
  const issues: string[] = []
  const completing = p.steps.filter((s) => s.completes)
  if (completing.length > 1) issues.push('Mais de uma etapa marcada como "conclui".')
  if (p.kind === 'geral' && completing.length) issues.push('Procedimento geral não tem etapa que conclui.')
  if (!p.steps.some((s) => s.active)) issues.push('Nenhuma etapa ativa: o procedimento não aparece no registro.')
  return issues
}

/**
 * "Descrições frequentes" do "Outro procedimento": agrupa pela descrição normalizada (sem acento/maiúsculas),
 * com nº de registros e de alunos, para o admin decidir se vira item oficial do catálogo.
 */
export function frequentDescriptions(
  rows: Array<{ description: string; normalized: string; ownerId: string }>,
): Array<{ description: string; records: number; students: number }> {
  const groups = new Map<string, { description: string; records: number; owners: Set<string> }>()
  for (const r of rows) {
    const g = groups.get(r.normalized) ?? { description: r.description, records: 0, owners: new Set<string>() }
    g.records++
    g.owners.add(r.ownerId)
    groups.set(r.normalized, g)
  }
  return [...groups.values()]
    .map((g) => ({ description: g.description, records: g.records, students: g.owners.size }))
    .sort((a, b) => b.students - a.students || b.records - a.records || a.description.localeCompare(b.description))
}
