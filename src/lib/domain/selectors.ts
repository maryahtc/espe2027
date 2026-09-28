/**
 * Consultas sobre o PublicDataset. Puras e testáveis — as páginas só compõem.
 * `today` é sempre passado explicitamente (calculado em America/Sao_Paulo).
 */
import {
  formatDate,
  formatDateRange,
  formatMonthYear,
  formatWeekdayDate,
  monthHasYear,
  type ISODate,
} from '@/lib/dates'
import { padModuleNumber } from '@/lib/text'
import type { PublicClass, PublicDataset, PublicModule, PublicProfessor } from '@/schemas/public'

/** Último dia "relevante" do módulo, para decidir se já passou. */
function moduleEnd(module: PublicModule): string | null {
  if (module.endDate) return module.endDate
  if (module.startDate) return module.startDate
  if (module.month && monthHasYear(module.month)) return `${module.month}-31`
  return null
}

function moduleStart(module: PublicModule): string | null {
  return module.startDate ?? (module.month && monthHasYear(module.month) ? `${module.month}-01` : null)
}

export function moduleTiming(module: PublicModule, today: ISODate): 'past' | 'current' | 'upcoming' {
  const end = moduleEnd(module)
  const start = moduleStart(module)
  if (end && end < today) return 'past'
  if (module.startDate && start && start <= today) return 'current'
  return 'upcoming'
}

/** Rótulo de quando acontece: "18–20 AGO 2027", "Fevereiro 2028", "Maio" (sem ano) ou "Data a confirmar". */
export function moduleWhen(module: PublicModule): string {
  if (module.startDate) return formatDateRange(module.startDate, module.endDate)
  if (module.month) return formatMonthYear(module.month)
  return 'Data a confirmar'
}

/** O módulo ainda não tem datas confirmadas na planilha. */
export function moduleDatesPending(module: PublicModule): boolean {
  return !module.startDate
}

export function moduleLabel(module: Pick<PublicModule, 'number'>): string {
  return `Módulo ${padModuleNumber(module.number)}`
}

export function moduleHref(module: Pick<PublicModule, 'slug'>): string {
  return `/modulos/${module.slug}`
}

/** Link por número (materiais/equipamentos). Com número repetido, leva ao primeiro. */
export function moduleHrefByNumber(number: number): string {
  return `/modulos/${padModuleNumber(number)}`
}

export function professorHref(slug: string): string {
  return `/professores/${slug}`
}

export function modulesInOrder(ds: PublicDataset): PublicModule[] {
  return [...ds.modules].sort((a, b) => a.number - b.number || a.slug.localeCompare(b.slug))
}

/** Próximo módulo: o que está acontecendo agora ou o primeiro que ainda não terminou. */
export function getNextModule(ds: PublicDataset, today: ISODate): PublicModule | null {
  return modulesInOrder(ds).find((m) => moduleTiming(m, today) !== 'past') ?? null
}

export function getUpcomingModules(ds: PublicDataset, today: ISODate, count: number): PublicModule[] {
  const next = getNextModule(ds, today)
  return modulesInOrder(ds)
    .filter((m) => moduleTiming(m, today) !== 'past' && m.slug !== next?.slug)
    .slice(0, count)
}

/** Aceita o slug exato ("09", "09-2") ou só o número ("9" → primeiro módulo 09). */
export function getModule(ds: PublicDataset, slug: string): PublicModule | null {
  const exact = ds.modules.find((m) => m.slug === slug)
  if (exact) return exact
  if (!/^\d{1,3}$/.test(slug)) return null
  return modulesInOrder(ds).find((m) => m.number === Number(slug)) ?? null
}

export function getModuleNeighbors(ds: PublicDataset, slug: string) {
  const ordered = modulesInOrder(ds)
  const index = ordered.findIndex((m) => m.slug === slug)
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null }
}

export function getModuleClasses(ds: PublicDataset, slug: string): PublicClass[] {
  return ds.classes.filter((c) => c.moduleSlug === slug)
}

export function professorIndex(ds: PublicDataset): Map<string, PublicProfessor> {
  return new Map(ds.professors.map((p) => [p.slug, p]))
}

export function professorNames(ds: PublicDataset, slugs: string[]): PublicProfessor[] {
  const index = professorIndex(ds)
  return slugs.map((slug) => index.get(slug)).filter((p): p is PublicProfessor => !!p)
}

export type DayGroup = { key: string; label: string; date: ISODate | null; classes: PublicClass[] }

/**
 * Agrupa aulas por dia: data real, "Dia 2 · data a confirmar" ou "Data a confirmar".
 * Data com inconsistência aparece completa (com ano), exatamente como está na planilha.
 */
export function groupClassesByDay(classes: PublicClass[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const item of classes) {
    const key = item.date ?? (item.day ? `dia-${item.day}` : 'sem-data')
    let group = groups.find((g) => g.key === key)
    if (!group) {
      const label = item.date
        ? item.notices.includes('data-inconsistente')
          ? `${formatDate(item.date)} · data a confirmar`
          : formatWeekdayDate(item.date)
        : item.day
          ? `Dia ${item.day} · data a confirmar`
          : 'Data a confirmar'
      group = { key, label, date: item.date, classes: [] }
      groups.push(group)
    }
    group.classes.push(item)
  }
  return groups
}

export type ProfessorParticipation = { module: PublicModule; classes: PublicClass[] }

export function getModuleProfessors(ds: PublicDataset, slug: string) {
  const classes = getModuleClasses(ds, slug)
  const mod = ds.modules.find((m) => m.slug === slug)
  return professorNames(ds, mod?.professorSlugs ?? []).map((professor) => ({
    professor,
    classes: classes.filter((c) => c.professorSlugs.includes(professor.slug)),
  }))
}

/** Participações de um professor, em ordem cronológica, separadas em futuras e passadas. */
export function getProfessorParticipations(ds: PublicDataset, slug: string, today: ISODate) {
  const participations: ProfessorParticipation[] = modulesInOrder(ds)
    .map((module) => ({
      module,
      classes: ds.classes.filter((c) => c.moduleSlug === module.slug && c.professorSlugs.includes(slug)),
    }))
    .filter((p) => p.classes.length > 0)
  return {
    upcoming: participations.filter((p) => moduleTiming(p.module, today) !== 'past'),
    past: participations.filter((p) => moduleTiming(p.module, today) === 'past').reverse(),
  }
}

/** Anos que aparecem no cronograma (para o filtro). */
export function scheduleYears(ds: PublicDataset): number[] {
  const years = new Set<number>()
  for (const m of ds.modules) {
    const year = moduleYear(m)
    if (year) years.add(year)
  }
  return [...years].sort()
}

/** Ano do módulo, só quando a planilha informa (data ou mês com ano). */
export function moduleYear(module: PublicModule): number | null {
  if (module.startDate) return Number(module.startDate.slice(0, 4))
  if (module.month && monthHasYear(module.month)) return Number(module.month.slice(0, 4))
  return null
}
