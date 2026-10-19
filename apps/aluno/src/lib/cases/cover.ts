import 'server-only'
import sharp from 'sharp'

/**
 * Foto de capa do caso (E.5.1): o servidor nunca grava o arquivo como veio.
 * - Aceita JPEG, PNG, WebP, HEIC/HEIF ou AVIF de até 4 MB (o navegador já reduz antes de enviar).
 * - Corrige a orientação e REENCODA em WebP: nenhum metadado (EXIF, GPS, câmera, data) passa para o arquivo salvo.
 * - Até 1600 px no maior lado + miniatura de 480 px para as listas.
 */
export const COVER_MAX_INPUT_BYTES = 4 * 1024 * 1024
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'heif', 'avif'])

export async function processCover(input: Buffer): Promise<{ full: Buffer; mini: Buffer }> {
  if (input.byteLength > COVER_MAX_INPUT_BYTES) throw new Error('A foto ficou grande demais. Tente outra (até 4 MB).')
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata()
  } catch {
    throw new Error('Arquivo não reconhecido como foto. Use JPG, PNG ou HEIC.')
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new Error('Formato não aceito. Use JPG, PNG ou HEIC.')
  // .rotate() sem argumento aplica a orientação do EXIF antes de descartá-lo; sem .keepMetadata(), nada é copiado.
  const base = () => sharp(input, { limitInputPixels: 50_000_000 }).rotate()
  const [full, mini] = await Promise.all([
    base().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    base().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toBuffer(),
  ])
  return { full, mini }
}

/** Confere (para os testes e por garantia) que o WebP gerado não carrega EXIF/XMP. */
export function webpHasMetadata(buf: Buffer): boolean {
  const s = buf.toString('latin1')
  return s.includes('EXIF') || s.includes('XMP ')
}

export const miniPath = (path: string) => path.replace(/\.webp$/, '-mini.webp')
