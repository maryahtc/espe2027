/**
 * Parte acadêmica vinda do banco (Admin do Portal do Aluno = fonte única de cronograma, módulos e professores).
 *
 * Função pura: recebe as linhas das três visões públicas e devolve os DTOs públicos já usados pelas telas.
 * As visões só têm colunas públicas; aqui apenas convertemos vocabulário, montamos slugs e vínculos.
 */
import type { CLASS_TYPES, PERIODS } from '@/config/vocab'
import { normalizeText, padModuleNumber, slugify } from '@/lib/text'
import type { PublicClass, PublicModule, PublicProfessor } from '@/schemas/public'

/** Linha de `public_modules`. */
export type DbModuleRow = {
  id: string
  number: number
  position: number
  title: string
  theme: string | null
  description: string | null
  starts_on: string | null
  ends_on: string | null
  staff_ids: string[]
}

/** Linha de `public_schedule`. */
export type DbSessionRow = {
  id: string
  module_id: string
  date: string
  day_number: number
  period: 'manha' | 'tarde' | 'noite' | 'dia_todo'
  starts_at: string | null
  ends_at: string | null
  title: string
  description: string | null
  activity_type: 'teorica' | 'pratica' | 'hands_on' | 'clinica' | 'demonstracao' | 'discussao_caso' | 'online' | 'outro'
  position: number
  faculty_ids: string[]
  tentative: boolean
}

/** Linha de `public_teachers`. */
export type DbTeacherRow = {
  id: string
  display_name: string
  honorific: string | null
  specialty: string | null
  short_bio: string | null
}

export type AcademicRows = { modules: DbModuleRow[]; schedule: DbSessionRow[]; teachers: DbTeacherRow[] }

export type AcademicData = {
  modules: PublicModule[]
  classes: PublicClass[]
  professors: PublicProfessor[]
  /** Encontra o slug de um professor pelo nome escrito na planilha de materiais. */
  findProfessor: (name: string) => string | null
}

const PERIOD: Record<DbSessionRow['period'], keyof typeof PERIODS> = {
  manha: 'manha',
  tarde: 'tarde',
  noite: 'noite',
  dia_todo: 'integral',
}

const TYPE: Record<DbSessionRow['activity_type'], keyof typeof CLASS_TYPES> = {
  teorica: 'teorica',
  pratica: 'hands-on',
  hands_on: 'hands-on',
  clinica: 'clinica',
  demonstracao: 'demonstracao',
  discussao_caso: 'discussao-de-caso',
  online: 'outro',
  outro: 'outro',
}

const PERIOD_ORDER: Record<DbSessionRow['period'], number> = { dia_todo: 0, manha: 1, tarde: 2, noite: 3 }

/** "Módulo 3" é só o rótulo provisório: no portal público o título vem do tema (ou de um título definitivo). */
function publicTitle(m: DbModuleRow): string | null {
  const theme = m.theme?.trim()
  if (theme) return theme
  const title = m.title.trim()
  return /^m[oó]dulo\s*\d+$/i.test(title) ? null : title || null
}

const clock = (t: string | null) => (t ? t.slice(0, 5) : null)

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base || 'professor'
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`
  used.add(slug)
  return slug
}

export function mapAcademic(rows: AcademicRows): AcademicData {
  // ── Professores ──
  const usedSlugs = new Set<string>()
  const teacherSlug = new Map<string, string>()
  const professors: PublicProfessor[] = rows.teachers.map((t) => {
    const slug = uniqueSlug(slugify(t.display_name), usedSlugs)
    teacherSlug.set(t.id, slug)
    const honorific = t.honorific?.trim()
    return {
      slug,
      name: honorific ? `${honorific} ${t.display_name}` : t.display_name,
      specialty: t.specialty?.trim() || null,
      bio: t.short_bio?.trim() || null,
    }
  })
  professors.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const slugsOf = (ids: string[]) => [...new Set(ids.map((id) => teacherSlug.get(id)).filter((s): s is string => !!s))]

  // ── Módulos ──
  const ordered = [...rows.modules].sort((a, b) => a.number - b.number || a.position - b.position)
  const moduleSlug = new Map<string, string>()
  const seen = new Map<number, number>()
  for (const m of ordered) {
    const n = (seen.get(m.number) ?? 0) + 1
    seen.set(m.number, n)
    moduleSlug.set(m.id, n === 1 ? padModuleNumber(m.number) : `${padModuleNumber(m.number)}-${n}`)
  }
  const duplicated = new Set([...seen].filter(([, n]) => n > 1).map(([number]) => number))
  const moduleById = new Map(ordered.map((m) => [m.id, m]))

  // ── Aulas ──
  const sessions = rows.schedule
    .filter((s) => moduleById.has(s.module_id))
    .sort((a, b) => {
      const ma = moduleById.get(a.module_id)!
      const mb = moduleById.get(b.module_id)!
      return (
        ma.number - mb.number ||
        ma.position - mb.position ||
        a.date.localeCompare(b.date) ||
        PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] ||
        (clock(a.starts_at) ?? '99:99').localeCompare(clock(b.starts_at) ?? '99:99') ||
        a.position - b.position ||
        a.id.localeCompare(b.id)
      )
    })
  const counters = new Map<string, number>()
  const classes: PublicClass[] = sessions.map((s) => {
    const m = moduleById.get(s.module_id)!
    const slug = moduleSlug.get(m.id)!
    const seq = (counters.get(slug) ?? 0) + 1
    counters.set(slug, seq)
    return {
      id: `m${slug}-a${String(seq).padStart(2, '0')}`,
      moduleNumber: m.number,
      moduleSlug: slug,
      day: s.day_number,
      date: s.date,
      start: clock(s.starts_at),
      end: clock(s.ends_at),
      period: PERIOD[s.period],
      title: s.title,
      description: s.description?.trim() || null,
      type: TYPE[s.activity_type],
      professorSlugs: slugsOf(s.faculty_ids),
      publicNotes: null,
      status: s.tentative ? 'a-confirmar' : 'confirmado',
      notices: [],
    }
  })

  const modules: PublicModule[] = ordered.map((m) => {
    const slug = moduleSlug.get(m.id)!
    const own = classes.filter((c) => c.moduleSlug === slug)
    return {
      number: m.number,
      slug,
      month: m.starts_on ? m.starts_on.slice(0, 7) : null,
      startDate: m.starts_on,
      endDate: m.ends_on ?? m.starts_on,
      title: publicTitle(m),
      description: m.description?.trim() || null,
      // Sem dias definidos = data ainda em definição.
      status: m.starts_on ? 'confirmado' : 'a-confirmar',
      notices: duplicated.has(m.number) ? ['numero-repetido'] : [],
      professorSlugs: [...new Set([...own.flatMap((c) => c.professorSlugs), ...slugsOf(m.staff_ids)])],
    }
  })

  // Nome escrito na planilha de materiais → professor (pelo nome de exibição, com ou sem tratamento).
  const byName = new Map<string, string | null>()
  for (const t of rows.teachers) {
    const slug = teacherSlug.get(t.id)!
    for (const name of [t.display_name, `${t.honorific ?? ''} ${t.display_name}`]) {
      const key = normalizeText(name)
      if (!key) continue
      byName.set(key, byName.has(key) && byName.get(key) !== slug ? null : slug)
    }
  }
  const findProfessor = (name: string) => byName.get(normalizeText(name)) ?? null

  return { modules, classes, professors, findProfessor }
}
