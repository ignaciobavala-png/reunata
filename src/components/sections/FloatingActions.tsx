'use client'

import { Clock, Flame, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Oferta {
  id: number
  titulo: string
  descuento: number
  producto_id: number
  href: string
}

export function FloatingActions() {
  const pathname = usePathname()
  const [ofertas, setOfertas] = useState<Oferta[]>([])

  useEffect(() => {
    setOfertas(MOCK_OFERTAS)
  }, [])

  if (pathname.startsWith('/dashboard')) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {/* WhatsApp */}
      <a
        href="https://wa.me/5491132720974"
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
        style={{ background: '#25D366' }}
        title="Escribinos por WhatsApp"
      >
        <MessageCircle size={24} className="text-white" />
      </a>

      {/* Reloj - Ofertas (mockdata) */}
      {ofertas.length > 0 && (
        <Link
          href="/ofertas"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#F59E0B' }}
          title={`${ofertas.length} ofertas`}
        >
          <Clock size={22} className="text-white" />
        </Link>
      )}

      {/* Fuego - Hot Sale (mockdata) */}
      <Link
        href="/hot-sale"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
        style={{ background: '#EF4444' }}
        title="Hot Sale"
      >
        <Flame size={22} className="text-white" />
      </Link>
    </div>
  )
}

const MOCK_OFERTAS: Oferta[] = [
  { id: 1, titulo: ' Mate Imperial -20%', descuento: 20, producto_id: 101, href: '/tienda/mates' },
  { id: 2, titulo: ' Matera Classic -15%', descuento: 15, producto_id: 102, href: '/tienda/materas' },
  { id: 3, titulo: ' Combo Yerba -10%', descuento: 10, producto_id: 103, href: '/tienda/combos' },
]