import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reunata.vercel.app'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, priority: 1.0, changeFrequency: 'weekly' },
  { url: `${BASE_URL}/tienda`, priority: 0.9, changeFrequency: 'daily' },
  { url: `${BASE_URL}/corporativos`, priority: 0.7, changeFrequency: 'monthly' },
  { url: `${BASE_URL}/nosotros`, priority: 0.6, changeFrequency: 'monthly' },
  { url: `${BASE_URL}/contacto`, priority: 0.6, changeFrequency: 'monthly' },
  { url: `${BASE_URL}/colecciones`, priority: 0.6, changeFrequency: 'weekly' },
  { url: `${BASE_URL}/trabaja-con-nosotros`, priority: 0.4, changeFrequency: 'monthly' },
  { url: `${BASE_URL}/faq`, priority: 0.4, changeFrequency: 'monthly' },
  { url: `${BASE_URL}/terminos`, priority: 0.3, changeFrequency: 'yearly' },
  { url: `${BASE_URL}/politicas`, priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient()

  const { data: categorias } = await supabase
    .from('categorias_home')
    .select('href')
    .eq('activo', true)
    .not('href', 'is', null)

  const categoryRoutes: MetadataRoute.Sitemap = (categorias ?? [])
    .filter(c => c.href)
    .map(c => ({
      url: `${BASE_URL}${c.href}`,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }))

  return [...STATIC_ROUTES, ...categoryRoutes]
}
