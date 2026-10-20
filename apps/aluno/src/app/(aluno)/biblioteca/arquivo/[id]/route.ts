import { createSupabaseServerClient } from '@portal/db/server'
import { markStarted, simulationAllowsContent } from '@/lib/library/progress'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f-]{36}$/

/**
 * PDF ou arquivo da biblioteca (principal ou complementar). Confere o acesso (RLS do conteúdo e do
 * armazenamento), registra "em andamento" e redireciona para um link temporário de 10 minutos.
 * `?anexo=<id>` abre um material complementar; `?baixar=1` baixa em vez de abrir no navegador.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const attachmentId = url.searchParams.get('anexo')
  const download = url.searchParams.get('baixar') === '1'
  const supabase = await createSupabaseServerClient()
  if (!supabase || !UUID.test(id) || (attachmentId && !UUID.test(attachmentId))) return new Response('Não encontrado', { status: 404 })
  if (!(await simulationAllowsContent(supabase, id))) return new Response('Não encontrado', { status: 404 })

  let path: string | null = null
  let name: string | null = null
  if (attachmentId) {
    const { data } = await supabase.from('content_attachments').select('file_path, file_name').eq('id', attachmentId).eq('content_id', id).maybeSingle()
    path = data?.file_path ?? null
    name = data?.file_name ?? null
  } else {
    const { data } = await supabase.from('contents').select('file_path, file_name').eq('id', id).maybeSingle()
    path = data?.file_path ?? null
    name = data?.file_name ?? null
  }
  if (!path) return new Response('Não encontrado', { status: 404 })
  const { data } = await supabase.storage.from('library-files').createSignedUrl(path, 600, download ? { download: name ?? true } : undefined)
  if (!data?.signedUrl) return new Response('Não encontrado', { status: 404 })
  await markStarted(supabase, id)
  return Response.redirect(data.signedUrl, 303)
}
