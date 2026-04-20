const canales = [
  {
    label: 'WhatsApp',
    valor: 'Escribinos directo',
    href: 'https://wa.me/549',
    descripcion: 'Respuesta rápida para consultas comerciales.',
  },
  {
    label: 'Email',
    valor: 'hola@reunata.com',
    href: 'mailto:hola@reunata.com',
    descripcion: 'Para consultas formales, cotizaciones y pedidos especiales.',
  },
  {
    label: 'Instagram',
    valor: '@reunata_ar',
    href: 'https://instagram.com/reunata_ar',
    descripcion: 'Novedades, lanzamientos y cultura del mate.',
  },
]

export default function ContactoPage() {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-4xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-20 border-b border-[var(--color-granito)]">
          <p className="text-xs tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Contacto
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hablemos.
          </h1>
          <p className="text-lg max-w-lg leading-relaxed text-[var(--color-acero)]">
            Si tenés preguntas sobre nuestros productos, condiciones comerciales o querés empezar a trabajar con Reunata, escribinos.
          </p>
        </section>

        {/* Canales + Formulario */}
        <section className="py-20 grid grid-cols-1 md:grid-cols-2 gap-16">

          {/* Canales de contacto */}
          <div className="flex flex-col divide-y divide-[var(--color-granito)]">
            {canales.map((c) => (
              <div key={c.label} className="py-6 first:pt-0">
                <p className="text-xs tracking-widest uppercase mb-2 text-[var(--color-acero-oscuro)]">
                  {c.label}
                </p>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium text-[var(--color-acero-brillo)] hover:text-[var(--color-acero)] transition-colors duration-200"
                >
                  {c.valor}
                </a>
                <p className="text-sm mt-1 text-[var(--color-acero-oscuro)]">{c.descripcion}</p>
              </div>
            ))}
          </div>

          {/* Formulario */}
          <form className="flex flex-col gap-5">
            <div>
              <label className="text-xs tracking-wide block mb-2 text-[var(--color-acero-oscuro)]">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Tu nombre"
                className="w-full px-4 py-3 text-base rounded-xl border border-[var(--color-granito)] bg-transparent text-[var(--color-acero-brillo)] placeholder:text-[var(--color-granito-claro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200"
              />
            </div>
            <div>
              <label className="text-xs tracking-wide block mb-2 text-[var(--color-acero-oscuro)]">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                className="w-full px-4 py-3 text-base rounded-xl border border-[var(--color-granito)] bg-transparent text-[var(--color-acero-brillo)] placeholder:text-[var(--color-granito-claro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200"
              />
            </div>
            <div>
              <label className="text-xs tracking-wide block mb-2 text-[var(--color-acero-oscuro)]">
                Mensaje
              </label>
              <textarea
                name="mensaje"
                rows={5}
                placeholder="Contanos en qué podemos ayudarte…"
                className="w-full px-4 py-3 text-base rounded-xl border border-[var(--color-granito)] bg-transparent text-[var(--color-acero-brillo)] placeholder:text-[var(--color-granito-claro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200 resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 text-sm bg-[var(--color-acero-brillo)] text-[var(--color-granito-oscuro)] rounded-full hover:bg-[var(--color-acero-claro)] transition-colors duration-200 font-medium self-start"
            >
              Enviar mensaje
            </button>
            <p className="text-sm text-[var(--color-acero-oscuro)]">
              También podés escribirnos por WhatsApp para una respuesta más rápida.
            </p>
          </form>

        </section>
      </div>
    </main>
  )
}
