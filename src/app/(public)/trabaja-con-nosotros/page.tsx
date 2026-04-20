import Link from 'next/link'

const canales = [
  {
    numero: '01',
    titulo: 'Local comercial',
    descripcion: 'Kioscos, regalerías, casas de artículos del hogar. Acceso a precios por unidad y condiciones de pago flexibles.',
  },
  {
    numero: '02',
    titulo: 'Distribuidor / Pool de compra',
    descripcion: 'Comprás por bulto, revendés a tu red. Acceso a la lista más competitiva y posibilidad de pre-compra de temporada.',
  },
  {
    numero: '03',
    titulo: 'Merchandising',
    descripcion: 'Empresas que necesitan productos con identidad de marca para eventos, regalos corporativos o uniformes.',
  },
  {
    numero: '04',
    titulo: 'Comisionista',
    descripcion: 'Vendedores independientes que gestionan sus propios clientes. Trabajo con comisión y herramientas propias en la plataforma.',
  },
]

const pasos = [
  { paso: '01', texto: 'Registrás tu cuenta en la plataforma.' },
  { paso: '02', texto: 'Un asesor de Reunata revisa tu perfil y te asigna el canal correcto.' },
  { paso: '03', texto: 'Accedés al catálogo con tus precios de lista y condiciones.' },
  { paso: '04', texto: 'Armás pedidos desde la plataforma y coordinás el pago con tu vendedor.' },
]

export default function TrabajaConNosotrosPage() {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-4xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Trabajá con Reunata
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Construyamos algo juntos.
          </h1>
          <p className="text-lg max-w-xl leading-relaxed text-[var(--color-acero)]">
            Trabajamos con distintos perfiles de negocio. Elegí el que mejor describe tu actividad
            y te explicamos cómo es operar con Reunata.
          </p>
        </section>

        {/* Canales */}
        <section className="py-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-10 text-[var(--color-acero-oscuro)]">
            ¿Cómo describís tu negocio?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canales.map((c) => (
              <div
                key={c.numero}
                className="flex flex-col gap-5 p-7 border border-[var(--color-granito)] rounded-xl hover:border-[var(--color-granito-claro)] transition-colors duration-200"
              >
                <span className="text-xs font-mono text-[var(--color-acero-oscuro)]">{c.numero}</span>
                <h3 className="text-base font-medium text-[var(--color-acero-brillo)]">{c.titulo}</h3>
                <p className="text-base leading-relaxed text-[var(--color-acero)]">{c.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Proceso */}
        <section className="py-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-10 text-[var(--color-acero-oscuro)]">
            Cómo es el proceso
          </p>
          <div className="flex flex-col divide-y divide-[var(--color-granito)]">
            {pasos.map(({ paso, texto }) => (
              <div key={paso} className="flex gap-8 items-center py-6">
                <span
                  className="text-3xl font-light flex-shrink-0 w-12 text-[var(--color-granito-claro)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {paso}
                </span>
                <p className="text-base leading-relaxed text-[var(--color-acero)]">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-xl font-medium text-[var(--color-acero-brillo)] mb-2">¿Listo para empezar?</p>
            <p className="text-base text-[var(--color-acero)] leading-relaxed">
              Creá tu cuenta y en menos de 48 hs tenés acceso al catálogo con tus condiciones.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/registro"
              className="px-6 py-3 text-sm bg-[var(--color-acero-brillo)] text-[var(--color-granito-oscuro)] rounded-full hover:bg-[var(--color-acero-claro)] transition-colors duration-200 font-medium"
            >
              Crear cuenta
            </Link>
            <Link
              href="/contacto"
              className="px-6 py-3 text-sm border border-[var(--color-granito-claro)] text-[var(--color-acero)] rounded-full hover:border-[var(--color-acero-oscuro)] hover:text-[var(--color-acero-brillo)] transition-colors duration-200"
            >
              Tengo preguntas
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}
