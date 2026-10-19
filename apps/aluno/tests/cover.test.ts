import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { miniPath, processCover, webpHasMetadata } from '@/lib/cases/cover'

/** Foto de teste 3000×2000 com EXIF (câmera, data e GPS) e orientação "girada 90°". */
async function photoWithExif(): Promise<Buffer> {
  const withGps = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 180, g: 120, b: 110 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'CameraTeste', Model: 'Modelo X' },
      IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '23/1 33/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '46/1 38/1 0/1' },
    })
    .toBuffer()
  // Mantém o EXIF acima e acrescenta a orientação "girada 90°", como sai de um celular.
  return sharp(withGps).withMetadata({ orientation: 6 }).jpeg().toBuffer()
}

describe('foto de capa: tratamento no servidor', () => {
  it('a foto de entrada de fato tem EXIF com GPS (controle do teste)', async () => {
    const meta = await sharp(await photoWithExif()).metadata()
    expect(meta.exif).toBeDefined()
    expect(meta.exif!.toString('latin1')).toContain('CameraTeste')
    expect(meta.orientation).toBe(6)
  })

  it('reencoda em WebP sem nenhum metadado (EXIF/GPS/câmera), com no máximo 1600 px e miniatura de 480 px', async () => {
    const { full, mini } = await processCover(await photoWithExif())
    for (const buf of [full, mini]) {
      const meta = await sharp(buf).metadata()
      expect(meta.format).toBe('webp')
      expect(meta.exif).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
      expect(webpHasMetadata(buf)).toBe(false)
      expect(buf.toString('latin1')).not.toContain('CameraTeste')
    }
    const f = await sharp(full).metadata()
    const m = await sharp(mini).metadata()
    // Orientação 6 aplicada antes de descartar o EXIF: a imagem fica "em pé" (2000×3000 → 1067×1600).
    expect(Math.max(f.width!, f.height!)).toBe(1600)
    expect(f.height! > f.width!).toBe(true)
    expect(Math.max(m.width!, m.height!)).toBe(480)
  })

  it('recusa arquivo que não é foto e arquivo grande demais', async () => {
    await expect(processCover(Buffer.from('não sou uma imagem'))).rejects.toThrow(/não reconhecido/)
    await expect(processCover(Buffer.alloc(5 * 1024 * 1024))).rejects.toThrow(/grande demais/)
  })

  it('miniatura fica ao lado da capa', () => {
    expect(miniPath('a/b/1760900000000.webp')).toBe('a/b/1760900000000-mini.webp')
  })
})
