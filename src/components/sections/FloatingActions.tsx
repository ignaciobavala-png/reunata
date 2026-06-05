'use client'

import { Clock, Flame, MessageCircle, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getOfertasPublic, type OfertaPublicItem } from '@/app/actions/ofertas'

type DrawerType = 'ofertas' | 'hotsale' | null

function OfferDrawer({
  type,
  open,
  items,
  onClose,
}: {
  type: Exclude<DrawerType, null>
  open: boolean
  items: OfertaPublicItem[]
  onClose: () => void
}) {
  const filtered = items.filter(i => i.canal === type)
  const title = type === 'ofertas' ? 'Ofertas' : 'Hot Sale'
  const badgeColor = type === 'ofertas' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: 'min(100vw, 36rem)',
          background: 'white',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6" data-lenis-prevent>
          {filtered.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: 'var(--color-acero-oscuro)' }}>
              No hay productos en {title.toLowerCase()} por el momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    {item.img ? (
                      <Image
                        src={item.img}
                        alt={item.titulo}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--color-acero)' }}>
                        ?
                      </div>
                    )}
                    <span
                      className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}
                    >
                      -{item.descuento}%
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium mb-1">{item.titulo}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">${item.precio}</span>
                      <span className="text-xs text-gray-400 line-through">${item.antes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function FloatingActions() {
  const pathname = usePathname()
  const [drawer, setDrawer] = useState<DrawerType>(null)
  const [items, setItems] = useState<OfertaPublicItem[]>([])

  useEffect(() => {
    getOfertasPublic().then(setItems).catch(console.error)
  }, [])

  if (pathname.startsWith('/dashboard')) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        <a
          href="https://wa.me/5491132720974"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#5D8F72' }}
        >
          <MessageCircle size={24} className="text-white" aria-hidden="true" />
        </a>

        <button
          onClick={() => setDrawer('ofertas')}
          aria-label="Ver ofertas"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#B38C44' }}
        >
          <Clock size={22} className="text-white" aria-hidden="true" />
        </button>

        <button
          onClick={() => setDrawer('hotsale')}
          aria-label="Ver Hot Sale"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
          style={{ background: '#AD5F5F' }}
        >
          <Flame size={22} className="text-white" aria-hidden="true" />
        </button>
      </div>

      {drawer && (
        <OfferDrawer
          type={drawer}
          open={!!drawer}
          items={items}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  )
}
