/**
 * Schemas das LINHAS da planilha (depois da leitura por whitelist).
 * Cada campo = normalizador (src/lib/normalize.ts) + validação Zod.
 *
 * Campos "obrigatórios" invalidam a linha inteira. Os demais são "suaves":
 * se ilegíveis, viram null e geram um aviso — a linha continua valendo.
 */
import { z } from 'zod'
import * as n from '@/lib/normalize'
import { CLASS_TYPES, PERIODS, PUBLICATION_STATUS } from '@/config/vocab'
import type { ColumnKey, TabKey } from '@/config/sheets'

function field<S extends z.ZodType>(normalize: (v: n.CellValue) => unknown, schema: S) {
  return z.preprocess((value) => normalize(value as n.CellValue), schema)
}

const requiredText = field(n.text, z.string({ error: 'obrigatório' }).min(1))
const optionalText = field(n.text, z.string().nullable())
const optionalMultiline = field(n.multilineText, z.string().nullable())
const optionalDate = field(n.date, z.string().nullable())
const optionalTime = field(n.time, z.string().nullable())
const optionalMonth = field(n.month, z.string().nullable())
const optionalQuantity = field(n.number, z.number().min(0).nullable())
const requiredModule = field(n.moduleNumber, z.number({ error: 'obrigatório' }).int().positive())
const moduleList = field(n.moduleNumbers, z.array(z.number().int().positive()))
const names = field(n.nameList, z.array(z.string()))

const publicationStatus = field(
  (v) => n.vocab(v, PUBLICATION_STATUS),
  z.enum(Object.keys(PUBLICATION_STATUS) as [keyof typeof PUBLICATION_STATUS]).nullable(),
)
const classType = field(
  (v) => n.vocab(v, CLASS_TYPES),
  z.enum(Object.keys(CLASS_TYPES) as [keyof typeof CLASS_TYPES]).nullable(),
)
const period = field(
  (v) => n.vocab(v, PERIODS),
  z.enum(Object.keys(PERIODS) as [keyof typeof PERIODS]).nullable(),
)
const dayIndex = field(n.number, z.number().int().min(1).max(10).nullable())

type Shape<K extends TabKey> = { [C in ColumnKey<K>]: z.ZodType }

export const moduleRowSchema = z.object({
  number: requiredModule,
  plannedMonth: optionalMonth,
  startDate: optionalDate,
  endDate: optionalDate,
  title: optionalText,
  description: optionalMultiline,
  status: publicationStatus,
} satisfies Shape<'modules'>)

export const classRowSchema = z.object({
  module: requiredModule,
  day: dayIndex,
  date: optionalDate,
  start: optionalTime,
  end: optionalTime,
  period,
  title: requiredText,
  description: optionalMultiline,
  type: classType,
  professors: names,
  publicNotes: optionalMultiline,
  status: publicationStatus,
} satisfies Shape<'classes'>)

export const professorRowSchema = z.object({
  name: requiredText,
  aliases: names,
  specialty: optionalText,
  bio: optionalMultiline,
} satisfies Shape<'professors'>)

export const materialRowSchema = z.object({
  module: requiredModule,
  classTitle: optionalText,
  professor: optionalText,
  material: requiredText,
  brandSpec: optionalText,
  required: optionalQuantity,
} satisfies Shape<'materials'>)

export const inventoryRowSchema = z.object({
  material: requiredText,
  category: optionalText,
  brandSpec: optionalText,
  unit: optionalText,
  current: optionalQuantity,
  minimum: optionalQuantity,
  updatedAt: optionalDate,
} satisfies Shape<'inventory'>)

export const equipmentRowSchema = z.object({
  name: requiredText,
  category: optionalText,
  modules: moduleList,
  required: optionalQuantity,
  available: optionalQuantity,
} satisfies Shape<'equipment'>)

/** Campos cuja falha invalida a linha inteira. */
export const REQUIRED_FIELDS: { [K in TabKey]: ColumnKey<K>[] } = {
  modules: ['number'],
  classes: ['module', 'title'],
  professors: ['name'],
  materials: ['module', 'material'],
  inventory: ['material'],
  equipment: ['name'],
}

export const ROW_SCHEMAS = {
  modules: moduleRowSchema,
  classes: classRowSchema,
  professors: professorRowSchema,
  materials: materialRowSchema,
  inventory: inventoryRowSchema,
  equipment: equipmentRowSchema,
} as const

export type ModuleRow = z.infer<typeof moduleRowSchema>
export type ClassRow = z.infer<typeof classRowSchema>
export type ProfessorRow = z.infer<typeof professorRowSchema>
export type MaterialRow = z.infer<typeof materialRowSchema>
export type InventoryRow = z.infer<typeof inventoryRowSchema>
export type EquipmentRow = z.infer<typeof equipmentRowSchema>
