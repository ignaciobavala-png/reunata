export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export default async function TiendaPage() {
  const supabase = createServiceClient()

  const { data: categoriasHome } = await supabase
    .from('categorias_home')
    .select('*')
    .eq('activo', true)
    .order('orden')

  if (!categoriasHome?.length) {
    return (
      <main className="bg-[var(--color-granito-oscuro)] pb-24">
        <div className="px-6 md:px-16 max-w-5xl mx-auto">
          <section className="pt-36 pb-20">
            <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
              Catálogo
            </p>
            <h1
              className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Nuestros productos
            </h1>
            <p className="text-lg max-w-xl leading-relaxed text-[var(--color-acero)]">
              Explorá nuestro catálogo. Registrate para ver precios, stock y hacer pedidos.
            </p>
          </section>
          <section className="py-20 border-t border-[var(--color-granito)]">
            <p className="text-lg text-center py-12" style={{ color: 'var(--color-acero)' }}>
              No hay categorías disponibles en este momento.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const gesuCategorias = (categoriasHome.map(c => c.gesu_categoria).filter(Boolean)) as string[]

  const { data: productos } = gesuCategorias.length > 0
    ? await supabase
        .from('productos')
        .select('categoria')
        .eq('activo', true)
        .in('categoria', gesuCategorias)
    : { data: [] }

  const categoriasConProductos = new Set((productos ?? []).map(p => p.categoria).filter(Boolean))

  const categorias = categoriasHome
    .filter(cat => cat.gesu_categoria && categoriasConProductos.has(cat.gesu_categoria as string))
    .map((cat, i) => ({
      label: cat.nombre,
      href: cat.href ?? '/tienda',
      numero: String(i + 1).padStart(2, '0'),
    }))

  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-5xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Catálogo
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nuestros productos
          </h1>
          <p className="text-lg max-w-xl leading-relaxed text-[var(--color-acero)]">
            Explorá nuestro catálogo. Registrate para ver precios, stock y hacer pedidos.
          </p>
        </section>

        {/* Categorías */}
        <section className="py-20 border-b border-[var(--color-granito)]">
          {categorias.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {categorias.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="group flex flex-col justify-between px-5 py-6 border border-[var(--color-granito)] rounded-xl hover:border-[var(--color-granito-claro)] hover:bg-[var(--color-granito)] transition-all duration-200"
                >
                  <span className="text-xs font-mono text-[var(--color-acero-oscuro)] mb-8">{cat.numero}</span>
                  <div className="flex items-end justify-between">
                    <span className="text-base text-[var(--color-acero)] group-hover:text-[var(--color-acero-brillo)] transition-colors duration-200 leading-snug">
                      {cat.label}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[var(--color-acero-oscuro)] text-sm ml-2">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-lg text-center py-12" style={{ color: 'var(--color-acero)' }}>
              No hay categorías disponibles en este momento.
            </p>
          )}
        </section>

        {/* CTA */}
        <section className="py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-xl font-medium text-[var(--color-acero-brillo)] mb-2">
              ¿Sos revendedor o distribuidor?
            </p>
            <p className="text-base text-[var(--color-acero)] leading-relaxed">
              Registrate para ver precios mayoristas, stock en tiempo real y hacer pedidos desde la plataforma.
            </p>
          </div>
          <Link
            href="/trabaja-con-nosotros"
            className="flex-shrink-0 px-6 py-3 text-sm bg-[var(--color-acero-brillo)] text-[var(--color-granito-oscuro)] rounded-full hover:bg-[var(--color-acero-claro)] transition-colors duration-200 font-medium"
          >
            Quiero ser cliente
          </Link>
        </section>

      </div>
    </main>
  )
}
