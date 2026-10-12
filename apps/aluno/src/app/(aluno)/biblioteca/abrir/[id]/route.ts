import { createSupabaseServerClient } from '@portal/db/server'
import { markStarted } from '@/lib/library/progress'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f-]{36}$/

/** Link externo de um conteúdo (ou de um material complementar): registra "em andamento" e abre o link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const attachmentId = new URL(request.url).searchParams.get('anexo')
  const supabase = await createSupabaseServerClient()
  if (!supabase || !UUID.test(id) || (attachmentId && !UUID.test(attachmentId))) return new Response('Não encontrado', { status: 404 })
  const { data } = attachmentId
    ? await supabase.from('content_attachments').select('url').eq('id', attachmentId).eq('content_id', id).maybeSingle()
    : await supabase.from('contents').select('url').eq('id', id).maybeSingle()
  if (!data?.url || !/^https?:\/\//i.test(data.url)) return new Response('Não encontrado', { status: 404 })
  await markStarted(supabase, id)
  return Response.redirect(data.url, 303)
}
