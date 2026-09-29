/**
 * Quem pode entrar na área de edição.
 *  - Coordenação: e-mails na variável ADMIN_EMAILS (separados por vírgula).
 *  - Professores: e-mail na coluna "E-mail" da aba PROFESSORES.
 *
 * A coluna E-mail é PRIVADA: é lida aqui, só no servidor, apenas para conferir o login.
 * Nunca entra nos dados públicos, na área de edição ou em logs.
 */
import 'server-only'
import type { EditorRole } from '@/config/editing'
import { SHEET_TABS } from '@/config/sheets'
import { normalizeText } from '@/lib/text'
import type { SheetWriter } from '@/server/data/write/types'

const EMAIL_HEADERS = ['E-mail', 'Email', 'E-mail pessoal']

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter(Boolean),
  )
}

export async function professorEmails(writer: SheetWriter): Promise<Set<string>> {
  const rows = await writer.readTab(SHEET_TABS.professors.name)
  const header = (rows?.[0] ?? []).map((h) => normalizeText(String(h ?? '')))
  const col = EMAIL_HEADERS.map((h) => header.indexOf(normalizeText(h))).find((i) => i >= 0)
  if (!rows || col === undefined) return new Set()
  const emails = new Set<string>()
  for (const row of rows.slice(1)) {
    for (const email of String(row[col] ?? '').split(/[,;\s]+/)) {
      if (email.includes('@')) emails.add(normalizeEmail(email))
    }
  }
  return emails
}

/** Perfil de quem pode editar, ou null se o e-mail não está autorizado. */
export async function resolveRole(writer: SheetWriter, email: string): Promise<EditorRole | null> {
  const normalized = normalizeEmail(email)
  if (adminEmails().has(normalized)) return 'coordenacao'
  if ((await professorEmails(writer)).has(normalized)) return 'professor'
  return null
}
