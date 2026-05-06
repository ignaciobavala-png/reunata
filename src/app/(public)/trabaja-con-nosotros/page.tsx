import { PostulacionAccordion } from '@/components/sections/PostulacionAccordion'

export default function TrabajaConNosotrosPage() {
  return (
    <main className="bg-[var(--color-acero-claro)] pb-24">
      <div className="px-6 md:px-16 max-w-3xl mx-auto">

        {/* Hero */}
        <section className="pt-36 pb-16 border-b-2 border-[var(--color-granito-claro)]">
          <p className="text-sm tracking-widest uppercase mb-5 text-[var(--color-granito-oscuro)]">
            Trabajá con Reunata
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight mb-8 text-[var(--color-granito-oscuro)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Unite a nuestro equipo.
          </h1>
          <p className="text-lg max-w-2xl leading-relaxed text-[var(--color-granito-oscuro)]">
            Elegí la modalidad que mejor se adapte a vos y envianos tu postulación. 
            Revisaremos tu perfil y te contactaremos a la brevedad.
          </p>
        </section>

        {/* Formularios */}
        <section className="py-20">
          <PostulacionAccordion />
        </section>

      </div>
    </main>
  )
}
