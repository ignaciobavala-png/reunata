const canales = [
  {
    label: 'WhatsApp',
    valor: 'Escribinos directo',
    href: 'https://wa.me/5491132720974',
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
    href: 'https://www.instagram.com/reunata.ar/',
    descripcion: 'Novedades, lanzamientos y cultura del mate.',
  },
]

export default function ContactoPage() {
  return (
    <main className="bg-[var(--color-acero-claro)] pb-24">
      <div className="px-6 md:px-16 max-w-4xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-20 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-sm tracking-widest uppercase mb-5 text-[var(--color-granito-oscuro)]">
            Contacto
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-granito-oscuro)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hablemos.
          </h1>
          <p className="text-lg max-w-lg leading-relaxed text-[var(--color-granito-oscuro)]">
            Si tenés preguntas sobre nuestros productos, condiciones comerciales o querés empezar a trabajar con Reunata, escribinos.
          </p>
        </section>

        {/* Canales + Formulario */}
        <section className="py-20 grid grid-cols-1 md:grid-cols-2 gap-16">

          {/* Canales de contacto */}
          <div className="flex flex-col divide-y divide-[var(--color-granito-claro)]">
            {canales.map((c) => (
              <div key={c.label} className="py-6 first:pt-0">
                <p className="text-sm tracking-widest uppercase mb-2 text-[var(--color-granito-oscuro)]">
                  {c.label}
                </p>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium text-[var(--color-granito-oscuro)] hover:text-[var(--color-acero-oscuro)] transition-colors duration-200"
                >
                  {c.valor}
                </a>
                <p className="text-base mt-1 text-[var(--color-granito-oscuro)]">{c.descripcion}</p>
              </div>
            ))}
          </div>

          {/* Formulario */}
          <form className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold block mb-2 text-[var(--color-granito-oscuro)]">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Tu nombre"
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-[var(--color-granito-claro)] bg-white text-[var(--color-granito-oscuro)] placeholder:text-[var(--color-acero-oscuro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200 shadow-inner"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2 text-[var(--color-granito-oscuro)]">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-[var(--color-granito-claro)] bg-white text-[var(--color-granito-oscuro)] placeholder:text-[var(--color-acero-oscuro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200 shadow-inner"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2 text-[var(--color-granito-oscuro)]">
                Mensaje
              </label>
              <textarea
                name="mensaje"
                rows={5}
                placeholder="Contanos en qué podemos ayudarte…"
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-[var(--color-granito-claro)] bg-white text-[var(--color-granito-oscuro)] placeholder:text-[var(--color-acero-oscuro)] outline-none focus:border-[var(--color-acero-oscuro)] transition-colors duration-200 resize-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 text-base bg-[var(--color-granito-oscuro)] text-white rounded-full hover:bg-[var(--color-granito)] transition-colors duration-200 font-medium self-start"
            >
              Enviar mensaje
            </button>
            <p className="text-base text-[var(--color-granito-oscuro)]">
              También podés escribirnos por WhatsApp para una respuesta más rápida.
            </p>
          </form>

        </section>
      </div>
    </main>
  )
}
