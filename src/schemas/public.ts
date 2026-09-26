/**
 * DTOs PÚBLICOS — tudo o que pode chegar ao navegador.
 *
 * `PublicDatasetSchema.parse()` é o "portão de saída" da camada de dados:
 * z.object remove qualquer chave que não esteja declarada aqui, então mesmo um
 * erro de programação no mapeador não consegue vazar um campo interno.
 */
import { z } from 'zod'
import { AVAILABILITY_STATUS, CLASS_TYPES, INVENTORY_STATUS, PERIODS } from '@/config/vocab'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const month = z.string().regex(/^\d{4}-\d{2}$/)
const clock = z.string().regex(/^\d{2}:\d{2}$/)
const availability = z.enum(Object.keys(AVAILABILITY_STATUS) as [keyof typeof AVAILABILITY_STATUS])
const visibleStatus = z.enum(['confirmado', 'a-confirmar'])

export const PublicModuleSchema = z.object({
  number: z.number().int().positive(),
  slug: z.string(),
  month: month.nullable(),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  status: visibleStatus,
  professorSlugs: z.array(z.string()),
})

export const PublicClassSchema = z.object({
  id: z.string(),
  moduleNumber: z.number().int().positive(),
  day: z.number().int().nullable(),
  date: isoDate.nullable(),
  start: clock.nullable(),
  end: clock.nullable(),
  period: z.enum(Object.keys(PERIODS) as [keyof typeof PERIODS]).nullable(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(Object.keys(CLASS_TYPES) as [keyof typeof CLASS_TYPES]).nullable(),
  professorSlugs: z.array(z.string()),
  publicNotes: z.string().nullable(),
  status: visibleStatus,
})

export const PublicProfessorSchema = z.object({
  slug: z.string(),
  name: z.string(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
})

export const PublicMaterialSchema = z.object({
  id: z.string(),
  moduleNumber: z.number().int().positive(),
  classTitle: z.string().nullable(),
  professorSlug: z.string().nullable(),
  name: z.string(),
  brandSpec: z.string().nullable(),
  category: z.string().nullable(),
  inventoryKey: z.string().nullable(),
  required: z.number().nullable(),
  available: z.number().nullable(),
  missing: z.number().nullable(),
  status: availability,
})

export const PublicInventoryItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  brandSpec: z.string().nullable(),
  unit: z.string().nullable(),
  current: z.number().nullable(),
  minimum: z.number().nullable(),
  updatedAt: isoDate.nullable(),
  status: z.enum(Object.keys(INVENTORY_STATUS) as [keyof typeof INVENTORY_STATUS]),
  moduleNumbers: z.array(z.number().int()),
})

export const PublicEquipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  moduleNumbers: z.array(z.number().int()),
  required: z.number().nullable(),
  available: z.number().nullable(),
  missing: z.number().nullable(),
  status: availability,
})

/** Conteúdo acadêmico relacionado (artigos, vídeos, PDFs…). Vazio na V1. */
export const PublicContentItemSchema = z.object({
  id: z.string(),
  moduleNumber: z.number().int().nullable(),
  classId: z.string().nullable(),
  kind: z.enum(['artigo', 'capitulo', 'livro', 'video', 'aula-gravada', 'pdf', 'link']),
  title: z.string(),
  url: z.url(),
  author: z.string().nullable(),
})

export const PublicDatasetSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  source: z.enum(['mock', 'google-sheets']),
  modules: z.array(PublicModuleSchema),
  classes: z.array(PublicClassSchema),
  professors: z.array(PublicProfessorSchema),
  materials: z.array(PublicMaterialSchema),
  inventory: z.array(PublicInventoryItemSchema),
  equipment: z.array(PublicEquipmentSchema),
  content: z.array(PublicContentItemSchema),
})

export type PublicModule = z.infer<typeof PublicModuleSchema>
export type PublicClass = z.infer<typeof PublicClassSchema>
export type PublicProfessor = z.infer<typeof PublicProfessorSchema>
export type PublicMaterial = z.infer<typeof PublicMaterialSchema>
export type PublicInventoryItem = z.infer<typeof PublicInventoryItemSchema>
export type PublicEquipment = z.infer<typeof PublicEquipmentSchema>
export type PublicContentItem = z.infer<typeof PublicContentItemSchema>
export type PublicDataset = z.infer<typeof PublicDatasetSchema>
