import { ImageIcon } from 'lucide-react'

export function PromotionalBanner() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed min-h-[200px] md:min-h-[260px]"
          style={{
            borderColor: 'var(--color-granito-claro)',
            background: 'var(--color-acero-brillo)',
            color: 'var(--color-acero-oscuro)',
          }}
        >
          <ImageIcon size={40} strokeWidth={1} />
          <p className="text-sm font-semibold">Banner promocional</p>
          <p className="text-xs opacity-70">Próximamente</p>
        </div>
      </div>
    </section>
  )
}
