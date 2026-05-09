import { ImageIcon } from 'lucide-react'

export function PromotionalBanner() {
  return (
    <section
      className="flex flex-col items-center justify-center gap-4 py-16 md:py-20 border-y-2"
      style={{
        borderColor: 'var(--color-granito-claro)',
        background: 'var(--color-acero-brillo)',
        color: 'var(--color-acero-oscuro)',
      }}
    >
      <ImageIcon size={40} strokeWidth={1} />
      <p className="text-sm font-semibold">Banner promocional</p>
      <p className="text-xs opacity-70">Próximamente</p>
    </section>
  )
}
