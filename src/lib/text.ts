/**
 * Normalização de texto usada em TODA comparação do portal (busca, filtros,
 * cabeçalhos da planilha, vínculo de nomes). "João", "joao" e "JOÃO" → "joao".
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Termos de busca: texto normalizado dividido por espaço. */
export function tokenize(value: string): string[] {
  const normalized = normalizeText(value)
  return normalized ? normalized.split(' ') : []
}

/** "João da Silva" → "joao-da-silva" */
export function slugify(value: string): string {
  return normalizeText(value).replace(/ /g, '-')
}

/** Remove espaços extras mantendo quebras de linha simples. */
export function cleanMultiline(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
    .join('\n')
    .trim()
}

/** Colapsa todo espaço em branco (incluindo quebras de linha) em um espaço. */
export function cleanInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function padModuleNumber(n: number): string {
  return String(n).padStart(2, '0')
}
