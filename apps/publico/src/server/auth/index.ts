import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isProductionDeployment } from '@/server/data/source'
import { createSheetWriter } from '@/server/data/source'
import type { Editor } from '@/server/editing/service'
import { resolveRole } from './directory'
import { readSessionToken, SESSION_COOKIE } from './session'

/** Login de teste (sem Google), só fora de produção e só com AUTH_DEV_EMAIL definido. */
export function devLoginEmail(): string | null {
  if (isProductionDeployment() || process.env.DATA_SOURCE === 'sheets') return null
  return process.env.AUTH_DEV_EMAIL?.trim() || null
}

export async function currentEditor(): Promise<Editor | null> {
  const session = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
  return session ? { email: session.email, role: session.role } : null
}

/** Para páginas: exige sessão válida. */
export async function requireEditor(): Promise<Editor> {
  const editor = await currentEditor()
  if (!editor) redirect('/coordenacao/entrar')
  return editor
}

/**
 * Para gravações: exige sessão E confere de novo na planilha se o e-mail continua autorizado
 * (quem for removido da aba PROFESSORES perde o acesso imediatamente).
 */
export async function requireEditorForWrite(): Promise<Editor | null> {
  const editor = await currentEditor()
  if (!editor) return null
  const role = await resolveRole(createSheetWriter(), editor.email)
  if (!role && devLoginEmail() !== editor.email) return null
  return { email: editor.email, role: role ?? editor.role }
}
