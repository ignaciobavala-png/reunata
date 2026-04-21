import Link from 'next/link'

export default function ColeccionesPage() {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-5xl mx-auto">
        <section className="pt-36 pb-20">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Colecciones
          </p>
          <h1
            className="text-4xl md:text-6xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Próximamente.
          </h1>
          <p className="text-lg max-w-xl leading-relaxed text-[var(--color-acero)] mb-12">
            Estamos armando esta sección. Mientras tanto, podés explorar todo el catálogo en la tienda.
          </p>
          <div className="flex gap-3">
            <Link
              href="/tienda"
              className="px-6 py-3 text-sm bg-[var(--color-acero-brillo)] text-[var(--color-granito-oscuro)] rounded-full hover:bg-[var(--color-acero-claro)] transition-colors duration-200 font-medium"
            >
              Ver tienda
            </Link>
            <Link
              href="/"
              className="px-6 py-3 text-sm border border-[var(--color-granito-claro)] text-[var(--color-acero)] rounded-full hover:border-[var(--color-acero-oscuro)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
