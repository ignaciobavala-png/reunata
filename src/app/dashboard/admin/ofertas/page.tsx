import { createServiceClient } from '@/lib/supabase/server'
import { OfertasClient } from './OfertasClient'

export default async function OfertasPage() {
  const supabase = createServiceClient()

  const { data: productos } = await supabase
    .from('productos')
    .select('id, codigo_interno, titulo, precio_lista1, categoria')
    .eq('activo', true)
    .order('categoria')
    .order('titulo')

  const { data: fotos } = await supabase
    .from('producto_fotos')
    .select('producto_id, url')
    .eq('destacada', true)

  const fotoMap = new Map((fotos ?? []).map(f => [f.producto_id, f.url]))

  const { data: ofertas } = await supabase
    .from('ofertas')
    .select('*')
    .order('orden')

  const ofertasConProducto = (ofertas ?? []).map(o => ({
    ...o,
    producto: (productos ?? []).find(p => p.id === o.producto_id) ?? null,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
        Ofertas y Promociones
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
        Gestioná los productos en oferta y hot sale que se muestran en los botones flotantes.
      </p>

      <OfertasClient
        productos={productos ?? []}
        fotoMap={Object.fromEntries(fotoMap)}
        ofertas={ofertasConProducto}
      />
    </div>
  )
}
