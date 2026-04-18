export default function ContactoPage() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-16 max-w-4xl mx-auto">

      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
        Contacto
      </p>
      <h1
        className="text-4xl md:text-5xl leading-tight mb-6"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
      >
        Hablemos.
      </h1>
      <p className="text-base max-w-lg leading-relaxed mb-16" style={{ color: 'var(--color-granito-claro)' }}>
        Si tenés preguntas sobre nuestros productos, condiciones comerciales o querés empezar a trabajar con Reunata, escribinos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* Canales de contacto */}
        <div className="flex flex-col gap-6">
          {[
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
              valor: '@reunata',
              href: 'https://instagram.com/reunata',
              descripcion: 'Novedades, lanzamientos y cultura del mate.',
            },
          ].map(c => (
            <div key={c.label}>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--color-acero-oscuro)' }}>
                {c.label}
              </p>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium hover:underline"
                style={{ color: 'var(--foreground)' }}
              >
                {c.valor}
              </a>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-acero-oscuro)' }}>{c.descripcion}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <form className="flex flex-col gap-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>Nombre</label>
            <input
              type="text"
              name="nombre"
              placeholder="Tu nombre"
              className="w-full px-4 py-3 text-sm rounded-xl border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-3 text-sm rounded-xl border outline-none"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-acero-oscuro)' }}>Mensaje</label>
            <textarea
              name="mensaje"
              rows={4}
              placeholder="Contanos en qué podemos ayudarte…"
              className="w-full px-4 py-3 text-sm rounded-xl border outline-none resize-none"
              style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)', background: 'white' }}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-full text-sm transition-colors duration-200"
            style={{ background: 'var(--foreground)', color: 'var(--color-acero-brillo)' }}
          >
            Enviar mensaje
          </button>
          <p className="text-xs" style={{ color: 'var(--color-acero)' }}>
            También podés escribirnos directamente por WhatsApp para una respuesta más rápida.
          </p>
        </form>
      </div>
    </main>
  )
}
