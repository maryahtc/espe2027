/**
 * Dados de PRÉVIA: a grade atual da planilha, convertida para o formato novo
 * SEM deduções (docs/migracao/*.csv), mais o estado atual das abas existentes
 * (fixtures/preview/*.csv). Serve para validar o visual antes da integração real.
 */
import 'server-only'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseCsv } from '@/lib/csv'
import type { RawWorkbook } from '../types'

const FILES: Record<string, string> = {
  'MÓDULOS': 'docs/migracao/MODULOS.csv',
  AULAS: 'docs/migracao/AULAS.csv',
  PROFESSORES: 'docs/migracao/PROFESSORES_novas_colunas.csv',
  'MATERIAIS POR MÓDULO': 'fixtures/preview/MATERIAIS_POR_MODULO.csv',
  ESTOQUE: 'fixtures/preview/ESTOQUE.csv',
  EQUIPAMENTOS: 'fixtures/preview/EQUIPAMENTOS.csv',
}

export function readPreviewWorkbook(root = process.cwd()): RawWorkbook {
  return Object.fromEntries(
    Object.entries(FILES).map(([tab, file]) => [tab, parseCsv(readFileSync(path.join(root, file), 'utf8'))]),
  )
}
