import { PostulacionForm } from '@/components/sections/PostulacionForm'

export default function TrabajaConNosotrosPage() {
  return (
    <main className="bg-[var(--color-granito-oscuro)] pb-24">
      <div className="px-6 md:px-16 max-w-6xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-16 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-sm tracking-widest uppercase mb-5 text-[var(--color-acero-oscuro)]">
            Trabajá con Reunata
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-acero-brillo)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Unite a nuestro equipo.
          </h1>
          <p className="text-lg max-w-2xl leading-relaxed text-[var(--color-acero)]">
            Elegí la modalidad que mejor se adapte a vos y envianos tu postulación. 
            Revisaremos tu perfil y te contactaremos a la brevedad.
          </p>
        </section>

        {/* Formularios */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PostulacionForm
              tipo="fulltime"
              titulo="Full Time"
              descripcion="Trabajá en nuestra empresa con un equipo dinámico. Horarios fijos en relación de dependencia."
            />
            <PostulacionForm
              tipo="comisionista"
              titulo="Comisionista"
              descripcion="Vendé visitando clientes por tu cuenta. Gestioná tu propio recorrido y ganá por comisión."
            />
          </div>
        </section>

      </div>
    </main>
  )
}
