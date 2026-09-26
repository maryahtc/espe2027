/**
 * Consultas sobre o PublicDataset. Puras e testáveis — as páginas só compõem.
 * `today` é sempre passado explicitamente (calculado em America/Sao_Paulo).
 */
import {
  formatDateRange,
  formatMonthYear,
  formatWeekdayDate,
  type ISODate,
} from '@/lib/dates'
import { padModuleNumber } from '@/lib/text'
import type { PublicClass, PublicDataset, PublicModule, PublicProfessor } from '@/schemas/public'

/** Último dia "relevante" do módulo, para decidir se já passou. */
function moduleEnd(module: PublicModule): string | null {
  if (module.endDate) return module.endDate
  if (module.startDate) return module.startDate
  if (module.month) return `${module.month}-31`
  return null
}

function moduleStart(module: PublicModule): string | null {
  return module.startDate ?? (module.month ? `${module.month}-01` : null)
}

export function moduleTiming(module: PublicModule, today: ISODate): 'past' | 'current' | 'upcoming' {
  const end = moduleEnd(module)
  const start = moduleStart(module)
  if (end && end < today) return 'past'
  if (module.startDate && start && start <= today) return 'current'
  return 'upcoming'
}

/** Rótulo de quando acontece: "18–20 AGO 2027", "Fevereiro 2028" ou "Data a definir". */
export function moduleWhen(module: PublicModule): string {
  if (module.startDate) return formatDateRange(module.startDate, module.endDate)
  if (module.month) return formatMonthYear(module.month)
  return 'Data a definir'
}

export function moduleLabel(module: Pick<PublicModule, 'number'>): string {
  return `Módulo ${padModuleNumber(module.number)}`
}

export function moduleHref(module: Pick<PublicModule, 'number'>): string {
  return `/modulos/${padModuleNumber(module.number)}`
}

export function professorHref(slug: string): string {
  return `/professores/${slug}`
}

export function modulesInOrder(ds: PublicDataset): PublicModule[] {
  return [...ds.modules].sort((a, b) => a.number - b.number)
}

/** Próximo módulo: o que está acontecendo agora ou o primeiro que ainda não terminou. */
export function getNextModule(ds: PublicDataset, today: ISODate): PublicModule | null {
  return modulesInOrder(ds).find((m) => moduleTiming(m, today) !== 'past') ?? null
}

export function getUpcomingModules(ds: PublicDataset, today: ISODate, count: number): PublicModule[] {
  const next = getNextModule(ds, today)
  return modulesInOrder(ds)
    .filter((m) => moduleTiming(m, today) !== 'past' && m.number !== next?.number)
    .slice(0, count)
}

export function getModule(ds: PublicDataset, slug: string): PublicModule | null {
  if (!/^\d{1,3}$/.test(slug)) return null
  return ds.modules.find((m) => m.number === Number(slug)) ?? null
}

export function getModuleNeighbors(ds: PublicDataset, number: number) {
  const ordered = modulesInOrder(ds)
  const index = ordered.findIndex((m) => m.number === number)
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null }
}

export function getModuleClasses(ds: PublicDataset, number: number): PublicClass[] {
  return ds.classes.filter((c) => c.moduleNumber === number)
}

export function professorIndex(ds: PublicDataset): Map<string, PublicProfessor> {
  return new Map(ds.professors.map((p) => [p.slug, p]))
}

export function professorNames(ds: PublicDataset, slugs: string[]): PublicProfessor[] {
  const index = professorIndex(ds)
  return slugs.map((slug) => index.get(slug)).filter((p): p is PublicProfessor => !!p)
}

export type DayGroup = { key: string; label: string; date: ISODate | null; classes: PublicClass[] }

/** Agrupa aulas por dia: data real, "Dia 2 · data a definir" ou "Data a definir". */
export function groupClassesByDay(classes: PublicClass[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const item of classes) {
    const key = item.date ?? (item.day ? `dia-${item.day}` : 'sem-data')
    let group = groups.find((g) => g.key === key)
    if (!group) {
      const label = item.date
        ? formatWeekdayDate(item.date)
        : item.day
          ? `Dia ${item.day} · data a definir`
          : 'Data a definir'
      group = { key, label, date: item.date, classes: [] }
      groups.push(group)
    }
    group.classes.push(item)
  }
  return groups
}

export type ProfessorParticipation = { module: PublicModule; classes: PublicClass[] }

export function getModuleProfessors(ds: PublicDataset, number: number) {
  const classes = getModuleClasses(ds, number)
  const module = ds.modules.find((m) => m.number === number)
  return professorNames(ds, module?.professorSlugs ?? []).map((professor) => ({
    professor,
    classes: classes.filter((c) => c.professorSlugs.includes(professor.slug)),
  }))
}

/** Participações de um professor, em ordem cronológica, separadas em futuras e passadas. */
export function getProfessorParticipations(ds: PublicDataset, slug: string, today: ISODate) {
  const participations: ProfessorParticipation[] = modulesInOrder(ds)
    .map((module) => ({
      module,
      classes: ds.classes.filter((c) => c.moduleNumber === module.number && c.professorSlugs.includes(slug)),
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
    const date = m.startDate ?? m.month
    if (date) years.add(Number(date.slice(0, 4)))
  }
  return [...years].sort()
}

export function moduleYear(module: PublicModule): number | null {
  const date = module.startDate ?? module.month
  return date ? Number(date.slice(0, 4)) : null
}
