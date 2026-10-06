import type { MetadataRoute } from 'next'
import { baseUrl, isIndexingEnabled } from '@/config/seo'
import { moduleHref, professorHref } from '@/lib/domain/selectors'
import { getDataset } from '@/server/data/repository'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingEnabled()) return []
  const ds = await getDataset()
  const base = baseUrl()
  const paths = [
    '/',
    '/cronograma',
    '/professores',
    '/materiais',
    '/estoque',
    '/equipamentos',
    '/playbook',
    ...ds.modules.map(moduleHref),
    ...ds.professors.map((p) => professorHref(p.slug)),
  ]
  return paths.map((path) => ({ url: `${base}${path}` }))
}
