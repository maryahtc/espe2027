/**
 * Registro de professores e vínculo de nomes.
 *
 * A aba AULAS costuma usar nomes curtos ("Thiago", "CALAMITA"). O vínculo tenta, em ordem:
 *   1. nome completo igual (sem acento/maiúscula);
 *   2. apelido declarado na coluna "Apelidos" de PROFESSORES;
 *   3. nome de uma só palavra que coincide com UMA ÚNICA palavra de um único professor
 *      ("Calamita" → "Fulano Calamita"). Se houver mais de um candidato, não vincula.
 * Nomes não encontrados viram professores "implícitos" (só nome) e geram aviso.
 */
import { normalizeText, slugify } from '@/lib/text'
import type { PublicProfessor } from '@/schemas/public'
import type { ProfessorRow } from '@/schemas/rows'
import type { DataIssue } from '../types'
import type { Parsed } from './parse'

export class ProfessorRegistry {
  private readonly bySlug = new Map<string, PublicProfessor>()
  private readonly byKey = new Map<string, string>()
  private readonly ambiguous = new Set<string>()
  private readonly implicitTab: string
  readonly issues: DataIssue[] = []

  constructor(rows: Parsed<ProfessorRow>[], tab: string, implicitTab: string) {
    this.implicitTab = implicitTab
    for (const row of rows) {
      const slug = this.uniqueSlug(row.name, tab, row.row)
      this.bySlug.set(slug, { slug, name: row.name, specialty: row.specialty, bio: row.bio })
      this.bindKey(normalizeText(row.name), slug)
      for (const alias of row.aliases) {
        const key = normalizeText(alias)
        const current = this.byKey.get(key)
        if (current && current !== slug) {
          this.ambiguous.add(key)
          this.issues.push({ severity: 'warning', code: 'professor_alias_ambiguous', tab, row: row.row, field: 'Apelidos' })
        } else {
          this.bindKey(key, slug)
        }
      }
    }
  }

  private bindKey(key: string, slug: string) {
    if (key && !this.byKey.has(key)) this.byKey.set(key, slug)
  }

  private uniqueSlug(name: string, tab: string, row?: number): string {
    const base = slugify(name) || 'professor'
    let slug = base
    for (let i = 2; this.bySlug.has(slug); i++) slug = `${base}-${i}`
    if (slug !== base) this.issues.push({ severity: 'warning', code: 'slug_collision', tab, row, field: 'Professor' })
    return slug
  }

  /** Vincula um nome ao slug de um professor cadastrado, sem criar nada. */
  find(name: string): string | null {
    const key = normalizeText(name)
    if (!key || this.ambiguous.has(key)) return null
    const direct = this.byKey.get(key)
    if (direct) return direct
    if (!key.includes(' ')) {
      const candidates = [...this.bySlug.values()].filter((p) => normalizeText(p.name).split(' ').includes(key))
      if (candidates.length === 1) return candidates[0]!.slug
    }
    return null
  }

  /** Vincula ou cria um professor implícito (registrando aviso). */
  resolve(name: string, row: number): string {
    const found = this.find(name)
    if (found) return found
    const slug = this.uniqueSlug(name, this.implicitTab, row)
    this.bySlug.set(slug, { slug, name, specialty: null, bio: null })
    this.byKey.set(normalizeText(name), slug)
    this.issues.push({ severity: 'warning', code: 'professor_unregistered', tab: this.implicitTab, row, field: 'Professor(es)' })
    return slug
  }

  get(slug: string): PublicProfessor | undefined {
    return this.bySlug.get(slug)
  }

  all(): PublicProfessor[] {
    return [...this.bySlug.values()]
  }
}
