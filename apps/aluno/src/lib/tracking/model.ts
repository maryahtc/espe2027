/**
 * Acompanhamento da biblioteca por turma e por aluno — cálculos puros (sem banco), usados pelo Admin,
 * pela coordenação, pela planilha (CSV) e pelos testes.
 *
 * Regras:
 * - Conta só conteúdo publicado, disponível para a turma (todas as turmas ou esta) e já liberado.
 * - Só alunos com matrícula ativa na turma e conta ativa.
 * - "Obrigatórios do módulo" = conteúdos ligados ao módulo como obrigatórios (qualquer fase).
 */
import type { ModuleState } from '@/lib/academic/model'
import type { ContentKind, ProgressStatus } from '@/lib/library/model'

export type TStudent = { id: string; name: string }
export type TContent = {
  id: string
  slug: string
  title: string
  kind: ContentKind
  category: string
  /** Vínculos com módulos DESTA turma. */
  modules: Array<{ moduleId: string; requirement: 'obrigatorio' | 'recomendado' | 'complementar'; phase: 'antes' | 'durante' | 'depois' }>
}
export type TModule = { id: string; number: number | null; title: string; theme: string | null; state: ModuleState; start: string | null }
export type TProgress = { userId: string; contentId: string; status: ProgressStatus; percent: number; updatedAt: string; completedAt: string | null }

export type CellState = 'concluido' | 'andamento' | 'nao-iniciado'

export type StudentRow = {
  student: TStudent
  done: number
  ongoing: number
  total: number
  /** % de conclusão sobre o total disponível. */
  pct: number
  /** Obrigatórios do módulo em foco (em andamento ou próximo): concluídos / total. */
  focusRequiredDone: number
  focusRequiredTotal: number
  lastActivity: string | null
}

export type ContentRow = { content: TContent; done: number; ongoing: number; notStarted: number; students: number; pct: number }

export type ModuleRow = {
  module: TModule
  required: TContent[]
  /** Alunos que concluíram TODOS os obrigatórios do módulo. */
  allDone: number
  students: number
  pct: number
}

export type Tracking = {
  students: StudentRow[]
  contents: ContentRow[]
  modules: ModuleRow[]
  focus: TModule | null
  totals: { students: number; contents: number; avgPct: number; required: number }
}

const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

export function cellState(p: TProgress | undefined): CellState {
  if (!p) return 'nao-iniciado'
  return p.status === 'concluido' ? 'concluido' : 'andamento'
}

export function progressIndex(progress: TProgress[]): Map<string, TProgress> {
  return new Map(progress.map((p) => [`${p.userId}:${p.contentId}`, p]))
}

export function buildTracking(input: { students: TStudent[]; contents: TContent[]; modules: TModule[]; progress: TProgress[] }): Tracking {
  const { students, contents, modules } = input
  const idx = progressIndex(input.progress)
  const get = (u: string, c: string) => idx.get(`${u}:${c}`)
  const focus = modules.find((m) => m.state === 'ongoing') ?? modules.find((m) => m.state === 'next') ?? null
  const requiredOf = (moduleId: string) => contents.filter((c) => c.modules.some((m) => m.moduleId === moduleId && m.requirement === 'obrigatorio'))
  const focusRequired = focus ? requiredOf(focus.id) : []

  const studentRows: StudentRow[] = students
    .map((s) => {
      let done = 0
      let ongoing = 0
      let last: string | null = null
      for (const c of contents) {
        const p = get(s.id, c.id)
        if (!p) continue
        if (p.status === 'concluido') done++
        else ongoing++
        if (!last || p.updatedAt > last) last = p.updatedAt
      }
      return {
        student: s,
        done,
        ongoing,
        total: contents.length,
        pct: pctOf(done, contents.length),
        focusRequiredDone: focusRequired.filter((c) => get(s.id, c.id)?.status === 'concluido').length,
        focusRequiredTotal: focusRequired.length,
        lastActivity: last,
      }
    })
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'))

  const contentRows: ContentRow[] = contents.map((c) => {
    let done = 0
    let ongoing = 0
    for (const s of students) {
      const st = cellState(get(s.id, c.id))
      if (st === 'concluido') done++
      else if (st === 'andamento') ongoing++
    }
    return { content: c, done, ongoing, notStarted: students.length - done - ongoing, students: students.length, pct: pctOf(done, students.length) }
  })

  const moduleRows: ModuleRow[] = modules
    .map((m) => {
      const required = requiredOf(m.id)
      const allDone = required.length ? students.filter((s) => required.every((c) => get(s.id, c.id)?.status === 'concluido')).length : 0
      return { module: m, required, allDone, students: students.length, pct: pctOf(allDone, students.length) }
    })
    .filter((r) => r.required.length > 0)

  return {
    students: studentRows,
    contents: contentRows,
    modules: moduleRows,
    focus,
    totals: {
      students: students.length,
      contents: contents.length,
      avgPct: studentRows.length ? Math.round(studentRows.reduce((a, r) => a + r.pct, 0) / studentRows.length) : 0,
      required: contents.filter((c) => c.modules.some((m) => m.requirement === 'obrigatorio')).length,
    },
  }
}

/** Planilha (CSV, separador ";" para abrir direto no Excel em português): uma linha por aluno, uma coluna por conteúdo. */
export function trackingCsv(input: { students: TStudent[]; contents: TContent[]; progress: TProgress[] }): string {
  const idx = progressIndex(input.progress)
  const esc = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  // Evita que nomes ou títulos sejam interpretados como fórmula no Excel.
  const safe = (v: string) => esc(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)
  const label: Record<CellState, string> = { concluido: 'Concluído', andamento: 'Em andamento', 'nao-iniciado': 'Não iniciado' }
  const header = ['Aluno', 'Concluídos', 'Em andamento', 'Total', ...input.contents.map((c) => c.title)].map(safe).join(';')
  const rows = [...input.students]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((s) => {
      const states = input.contents.map((c) => cellState(idx.get(`${s.id}:${c.id}`)))
      return [s.name, String(states.filter((x) => x === 'concluido').length), String(states.filter((x) => x === 'andamento').length), String(input.contents.length), ...states.map((x) => label[x])]
        .map(safe)
        .join(';')
    })
  return `﻿${[header, ...rows].join('\r\n')}\r\n`
}
