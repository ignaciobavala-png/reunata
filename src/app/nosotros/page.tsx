import Image from 'next/image'
import Link from 'next/link'

export default function NosotrosPage() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-16 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="mb-20">
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--color-acero-oscuro)' }}>
          Quiénes somos
        </p>
        <h1
          className="text-4xl md:text-6xl leading-tight mb-8"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}
        >
          El mate como cultura,<br />el acero como filosofía.
        </h1>
        <p className="text-base max-w-2xl leading-relaxed" style={{ color: 'var(--color-granito-claro)' }}>
          Reunata nació de una convicción simple: el ritual del mate merece productos a la altura.
          Importamos y distribuimos equipamiento de mate de calidad real — sin folklore, sin excesos.
          Diseño que dura, materiales que importan.
        </p>
      </div>

      {/* Valores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        {[
          {
            titulo: 'Selección rigurosa',
            texto: 'Cada producto que lleva la marca Reunata pasó por nuestra revisión. No trabajamos con intermediarios que no conocemos.',
          },
          {
            titulo: 'Mayorista de verdad',
            texto: 'Pensamos en el revendedor, en el local, en el distribuidor. Nuestras condiciones están diseñadas para hacer crecer el negocio de nuestros clientes.',
          },
          {
            titulo: 'Relación directa',
            texto: 'No hay call center. Hay personas. Tu vendedor conoce tu negocio y trabaja contigo a largo plazo.',
          },
        ].map(v => (
          <div key={v.titulo}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>{v.titulo}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-acero-oscuro)' }}>{v.texto}</p>
          </div>
        ))}
      </div>

      {/* Categorías */}
      <div className="border-t pt-16 mb-16" style={{ borderColor: 'var(--color-acero-claro)' }}>
        <p className="text-xs tracking-widest uppercase mb-8" style={{ color: 'var(--color-acero-oscuro)' }}>
          Lo que distribuimos
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'Mates', 'Termos y térmicos', 'Bombillas',
            'Materas y mochilas', 'Yerbas', 'Accesorios',
            'Merchandising', 'Gift Cards',
          ].map(cat => (
            <div
              key={cat}
              className="rounded-xl px-4 py-5 text-sm"
              style={{ background: 'var(--color-acero-brillo)', color: 'var(--foreground)' }}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Link
          href="/trabaja-con-nosotros"
          className="px-6 py-3 rounded-full text-sm transition-colors duration-200"
          style={{ background: 'var(--foreground)', color: 'var(--color-acero-brillo)' }}
        >
          Trabajá con nosotros
        </Link>
        <Link
          href="/contacto"
          className="px-6 py-3 rounded-full text-sm border transition-colors duration-200"
          style={{ borderColor: 'var(--color-acero-claro)', color: 'var(--foreground)' }}
        >
          Contacto
        </Link>
      </div>
    </main>
  )
}
