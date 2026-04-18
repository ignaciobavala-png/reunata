import Link from 'next/link'

const canales = [
  {
    titulo: 'Local comercial',
    descripcion: 'Kioscos, regalerías, casas de artículos del hogar. Acceso a precios por unidad y condiciones de pago flexibles.',
  },
  {
    titulo: 'Distribuidor / Pool de compra',
    descripcion: 'Comprás por bulto, revendés a tu red. Acceso a la lista más competitiva y posibilidad de pre-compra de temporada.',
  },
  {
    titulo: 'Merchandising',
    descripcion: 'Empresas que necesitan productos con identidad de marca para eventos, regalos corporativos o uniformes.',
  },
  {
    titulo: 'Comisionista',
    descripcion: 'Vendedores independientes que gestionan sus propios clientes. Trabajo con comisión y herramientas propias en la plataforma.',
  },
]

export default function TrabajaConNosotrosPage() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-16 max-w-4xl mx-auto">

      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Trabajá con Reunata
      </p>
      <h1
        className="text-4xl md:text-5xl leading-tight mb-6"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Construyamos algo juntos.
      </h1>
      <p className="text-base max-w-xl leading-relaxed mb-16" style={{ color: 'var(--color-granito-claro)' }}>
        Trabajamos con distintos perfiles de negocio. Elegí el que mejor describe tu actividad
        y te explicamos cómo es operar con Reunata.
      </p>

      {/* Canales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {canales.map(c => (
          <div
            key={c.titulo}
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--color-acero-claro)', background: 'white' }}
          >
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>{c.titulo}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-acero-oscuro)' }}>{c.descripcion}</p>
          </div>
        ))}
      </div>

      {/* Proceso */}
      <div className="border-t pt-12 mb-12" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <p className="text-xs tracking-widest uppercase mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
          Cómo es el proceso
        </p>
        <div className="flex flex-col gap-6">
          {[
            { paso: '01', texto: 'Registrás tu cuenta en la plataforma.' },
            { paso: '02', texto: 'Un asesor de Reunata revisa tu perfil y te asigna el canal correcto.' },
            { paso: '03', texto: 'Accedés al catálogo con tus precios de lista y condiciones.' },
            { paso: '04', texto: 'Armás pedidos desde la plataforma y coordinás el pago con tu vendedor.' },
          ].map(({ paso, texto }) => (
            <div key={paso} className="flex gap-6 items-start">
              <span className="text-2xl font-light flex-shrink-0 w-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-acero)' }}>
                {paso}
              </span>
              <p className="text-sm leading-relaxed pt-1" style={{ color: 'var(--foreground)' }}>{texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-full text-sm text-center transition-colors duration-200"
          style={{ background: 'var(--foreground)', color: 'var(--color-acero-brillo)' }}
        >
          Crear cuenta
        </Link>
        <Link
          href="/contacto"
          className="px-6 py-3 rounded-full text-sm text-center border transition-colors duration-200"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          Tengo preguntas
        </Link>
      </div>
    </main>
  )
}
