import { createSupabaseServerClient } from '@portal/db/server'

export const dynamic = 'force-dynamic'

/**
 * Arquivo de um módulo: confere o acesso (RLS do recurso e do armazenamento) e redireciona para um link
 * temporário de 10 minutos. Nada de URL pública ou permanente.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return new Response('Não encontrado', { status: 404 })
  const { data: resource } = await supabase.from('module_resources').select('kind, file_path').eq('id', id).maybeSingle()
  if (!resource || resource.kind !== 'arquivo' || !resource.file_path) return new Response('Não encontrado', { status: 404 })
  const { data } = await supabase.storage.from('module-files').createSignedUrl(resource.file_path, 600)
  if (!data?.signedUrl) return new Response('Não encontrado', { status: 404 })
  return Response.redirect(data.signedUrl, 303)
}
