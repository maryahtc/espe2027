import type { MetadataRoute } from 'next'
import { baseUrl, isIndexingEnabled } from '@/config/seo'

export default function robots(): MetadataRoute.Robots {
  if (!isIndexingEnabled()) return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: `${baseUrl()}/sitemap.xml` }
}
